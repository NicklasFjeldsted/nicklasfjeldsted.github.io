# Opsætning af backend på Hetzner (CAX11, Ubuntu)

Vejledning til at få databasen og C#-backenden (`backend/`) online på en Hetzner Cloud-server, så den kan bruges af hjemmesiden på `murerfirmaet-mvo.dk` og administrationssiden.

Skrevet til begyndere: hvert trin forklarer **hvad** du gør og **hvorfor**.

> **Bemærk:** Kommandoerne er skrevet ud fra Docker, Caddy og Ubuntu 24.04, men er ikke testet på din server. Kør dem ét trin ad gangen, og læs outputtet. Hvis noget afviger, så se afsnittet Fejlfinding til sidst.

---

## 0. Overblik

```
Besøgende ──► murerfirmaet-mvo.dk          (frontend, GitHub Pages)
                  │
                  │ henter indhold
                  ▼
Browser ──► api.murerfirmaet-mvo.dk ──► Hetzner-server (CAX11)
                                          ├─ Caddy      (HTTPS, port 80/443)
                                          ├─ API (.NET) (kun synlig for Caddy)
                                          └─ MySQL      (kun synlig for API'et)
```

| Begreb | Forklaring |
| --- | --- |
| **Server** | En computer hos Hetzner, der altid er tændt. Du styrer den med tekstkommandoer over SSH. |
| **SSH** | En sikker måde at logge ind på serveren fra din egen computer. |
| **Docker** | Pakker hvert program (database, API, Caddy) i en "container", så det kører ens overalt. |
| **Docker Compose** | Starter alle containere sammen ud fra én fil (`docker-compose.prod.yml`). |
| **Caddy** | En webserver foran API'et. Den skaffer og fornyer automatisk et gratis HTTPS-certifikat. |
| **DNS** | Internettets telefonbog: den fortæller, at `api.murerfirmaet-mvo.dk` skal pege på din servers IP-adresse. |
| **Firewall** | En port-vagt. Kun de porte, du åbner (22, 80, 443), kan nås udefra. |

**Din server:** CAX11 er en ARM-server (Ampere, 2 vCPU, 4 GB RAM). Alle de images, vi bruger (`mysql`, `caddy`, `dotnet`), findes til ARM, så der er ingen forskel for dig. Det betyder bare, at du skal bygge API'et på selve serveren (det gør trin 7).

---

## 1. Før du starter

Du skal have:
- [ ] Domænet `murerfirmaet-mvo.dk` oprettet hos en registrar med adgang til **DNS-indstillinger**.
- [ ] Serverens **IPv4-adresse** (står i Hetzner-konsollen under din server).
- [ ] En SSH-nøgle på din computer (se trin 3).

### DNS: peg `api` på serveren

I din registrars DNS-indstillinger tilføjer du en post:

| Type | Navn | Værdi |
| --- | --- | --- |
| `A` | `api` | serverens IPv4-adresse |

Det kan tage fra få minutter til nogle timer, før den virker. Tjek fra din computer:

```powershell
nslookup api.murerfirmaet-mvo.dk
```

Svaret skal vise din servers IP. Gør dette **før** trin 7, ellers kan Caddy ikke få sit HTTPS-certifikat.

---

## 2. Firewall i Hetzner-konsollen

Hetzner-konsollen (console.hetzner.com) → dit projekt → **Firewalls** → opret en firewall.

**Indgående regler (Inbound):**

| Protokol | Port | Hvorfor |
| --- | --- | --- |
| TCP | 22 | SSH (så du kan logge ind) |
| TCP | 80 | HTTP (Caddy bruger den til at få certifikat) |
| TCP | 443 | HTTPS (selve API'et) |

Tilføj ikke port 3306 (MySQL). Databasen må aldrig være åben mod internettet. Tilknyt firewallen til din server (**Apply to**).

> **Hvorfor Hetzners firewall og ikke `ufw`?** Docker kan åbne porte uden om `ufw`. Hetzners firewall står uden for serveren og kan ikke omgås af Docker.

---

## 3. Log ind på serveren med SSH

På din Windows-computer (PowerShell), hvis du ikke har en nøgle endnu:

```powershell
ssh-keygen -t ed25519
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Den lange tekst fra `.pub`-filen er din **offentlige** nøgle. Den må du dele og lægge ind i Hetzner under **Security → SSH keys**. Filen uden `.pub` er din **private** nøgle og må aldrig deles.

Log ind (erstat `SERVER_IP`):

```powershell
ssh root@SERVER_IP
```

Første gang spørger den, om du stoler på serveren: skriv `yes`.

---

## 4. Grundopsætning og sikkerhed

Du er nu logget ind som `root` (alle rettigheder). Vi opretter en almindelig bruger og lukker root-login.

### 4.1 Opdatér serveren

```bash
apt update && apt upgrade -y
```

### 4.2 Opret en bruger `deploy`

```bash
adduser deploy                 # vælg en adgangskode, resten kan du trykke Enter på
usermod -aG sudo deploy        # giver ret til at bruge sudo
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

**Test i et nyt PowerShell-vindue**, før du går videre:

```powershell
ssh deploy@SERVER_IP
```

Kan du logge ind og køre `sudo whoami` (svar: `root`), er alt i orden.

### 4.3 Luk adgangskode- og root-login (anbefalet)

Kun når testen ovenfor virkede:

```bash
sudo nano /etc/ssh/sshd_config.d/99-hardening.conf
```

Indsæt:

```
PermitRootLogin no
PasswordAuthentication no
```

Gem (Ctrl+O, Enter, Ctrl+X) og genstart SSH:

```bash
sudo systemctl restart ssh
```

Hold dit eksisterende vindue åbent, og test igen i et nyt, så du ikke låser dig ude.

### 4.4 Automatiske sikkerhedsopdateringer

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades    # vælg "Yes"
```

---

## 5. Installér Docker

Følg Dockers officielle vejledning til Ubuntu (se Links nederst). Kort version:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Log ud og ind igen, så gruppen virker, og test:

```bash
exit
ssh deploy@SERVER_IP
docker run --rm hello-world
docker compose version
```

---

## 6. Hent koden

```bash
sudo apt install -y git
git clone https://github.com/NicklasFjeldsted/mvo.git
cd mvo
git checkout feature/deployment     # fjern dette trin, når grenen er merget
cd backend
```

Hvis repoet er privat, skal Git have adgang. Opret en **deploy key** (kun læseadgang) i repoets Settings → Deploy keys, eller brug et Personal Access Token.

---

## 7. Konfigurér hemmeligheder

Filen `.env.production` indeholder adgangskoder og må **aldrig** committes (den er i `.gitignore`).

```bash
cp .env.production.example .env.production
```

Generér tilfældige værdier:

```bash
openssl rand -hex 24      # kør to gange: root-adgangskode og app-adgangskode til databasen
openssl rand -base64 48   # JWT-nøgle (bruges til at signere logins)
```

Redigér filen:

```bash
nano .env.production
```

| Variabel | Indhold |
| --- | --- |
| `API_DOMAIN` | `api.murerfirmaet-mvo.dk` |
| `MYSQL_ROOT_PASSWORD` | første tilfældige værdi |
| `MVO_DB_PASSWORD` | anden tilfældige værdi |
| `JWT_KEY` | base64-værdien (mindst 32 tegn) |
| `ADMIN_EMAIL` | den e-mail, I logger ind med |
| `ADMIN_PASSWORD` | en stærk adgangskode (undgå tegnet `$`) |
| `CORS_ORIGIN_1/2` | `https://murerfirmaet-mvo.dk` og `https://www.murerfirmaet-mvo.dk` |

Gem filen og begræns adgangen:

```bash
chmod 600 .env.production
```

> **Hvorfor `CORS`?** Browseren tillader kun, at `murerfirmaet-mvo.dk` henter data fra API'et, hvis API'et udtrykkeligt tillader den adresse.

---

## 8. Start alt

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Første gang bygger Docker API'et på serveren. Det tager nogle minutter på ARM. Tjek status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api     # Ctrl+C for at stoppe visningen
```

API'et opretter selv databasetabellerne og administratorbrugeren ved første opstart. Ændrer du senere `ADMIN_EMAIL` eller `ADMIN_PASSWORD`, opdateres administratorbrugeren, næste gang API'et starter (se afsnit 12). Caddy henter certifikatet, så snart DNS peger på serveren.

**Test fra din computer:**

```powershell
curl https://api.murerfirmaet-mvo.dk/api/pages/specialiseret-murerarbejde
```

Du skal få JSON tilbage. Hvis du får en certifikat- eller forbindelsesfejl, se Fejlfinding.

---

## 9. Frontenden: peg på API'et og brug domænet

**Disse ændringer sker i repoet og kræver, at domænet er klart.**

1. I `murerfirmaet-M.V.O/src/app/core/config/api.config.ts` ændres `API_BASE_URL` til `https://api.murerfirmaet-mvo.dk`.
2. Deploy frontenden (`npm run deploy`).
3. I GitHub: repoets **Settings → Pages → Custom domain**: skriv `murerfirmaet-mvo.dk` og slå **Enforce HTTPS** til.
4. Hos din registrar tilføjes DNS-poster for frontenden. GitHub oplyser disse IP-adresser til apex-domæner:

| Type | Navn | Værdi |
| --- | --- | --- |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `CNAME` | `www` | `<dit-github-brugernavn>.github.io` |

Tjek altid mod GitHubs egen dokumentation (se Links), da IP-adresserne kan ændre sig.

Åbn derefter `https://murerfirmaet-mvo.dk/admin` og log ind med `ADMIN_EMAIL` og `ADMIN_PASSWORD`.

---

## 10. Backup

Databasen og de uploadede billeder ligger kun på serveren. Hvis serveren går tabt, går de også tabt.

1. **Hetzner-backups:** I konsollen → din server → **Backups** → slå til (koster ca. 20 % ekstra). Hetzner tager automatisk et billede af hele serveren.
2. **Databasedump (ekstra sikkerhed):**

```bash
cd ~/mvo/backend
mkdir -p ~/backups
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T mysql \
  sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction mvo' \
  > ~/backups/mvo-$(date +%F).sql
```

3. **Billeder:** Ligger i Docker-volumet `mvo-media`. Tag et snapshot i Hetzner, før du gør større ændringer.

**Gendan** en dump (ændrer databasen, så gør det kun, når det er nødvendigt):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T mysql \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" mvo' < ~/backups/mvo-DATO.sql
```

---

## 11. Opdatér backenden senere

```bash
cd ~/mvo
git pull
cd backend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Data i databasen og billeder bevares, fordi de ligger i Docker-volumer.

---

## 12. Fejlfinding

| Problem | Mulig årsag og løsning |
| --- | --- |
| Caddy får ikke certifikat | DNS peger ikke endnu på serveren, eller port 80/443 er ikke åben i Hetzner-firewallen. Se `docker compose ... logs caddy`. |
| `Access denied for user` | Databasens adgangskode er ændret efter første start. Volumet husker den gamle. Vil du nulstille, så kør `docker compose ... down -v` (sletter data!) og start igen. |
| Browseren viser CORS-fejl | `CORS_ORIGIN_1/2` matcher ikke den adresse, siden kører på (husk `https://`, og ingen `/` til sidst). |
| API'et stopper ved opstart | Se `logs api`. Typisk: `JWT_KEY` er for kort (kræver mindst 32 tegn) eller en variabel mangler. |
| Kan ikke logge ind efter ændring af `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Husk `--env-file .env.production`, ellers læser Docker Compose ikke filen. Kør `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate api`, så API'et starter med de nye værdier og opdaterer administratorbrugeren. |
| `permission denied` ved Docker | Du er ikke logget ind igen, efter `usermod -aG docker`. Log ud og ind. |
| Kan ikke SSH'e ind | Tjek, at port 22 er åben i firewallen, og at du bruger den rigtige nøgle (`ssh -i`). |

Nyttige kommandoer:

```bash
docker compose -f docker-compose.prod.yml ps                 # status
docker compose -f docker-compose.prod.yml logs --tail 100 api
docker compose -f docker-compose.prod.yml restart api
df -h        # diskplads
free -h      # hukommelse
```

---

## 13. Dokumentation og læsestof

Hold dig til forsiderne herunder og søg derfra. Dybe links ændrer sig ofte.

- Hetzner Cloud: <https://docs.hetzner.com/cloud/> (søg på *servers*, *firewalls*, *backups*)
- Docker (installation på Ubuntu): <https://docs.docker.com/engine/install/ubuntu/>
- Docker Compose: <https://docs.docker.com/compose/>
- Caddy (reverse proxy og automatisk HTTPS): <https://caddyserver.com/docs/>
- GitHub Pages, eget domæne: <https://docs.github.com/en/pages> (søg på *custom domain*)
- MySQL `mysqldump`: <https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html>
- ASP.NET Core i Docker: <https://learn.microsoft.com/aspnet/core/host-and-deploy/docker/>
- Ubuntu Server: <https://ubuntu.com/server/docs>
