# Sådan ruller du ændringer ud (frontend og backend)

Brug denne guide, hver gang du har lavet ændringer og vil have dem på den rigtige side.
Første opsætning af serveren står i [hetzner.md](hetzner.md). Her er det kun den daglige arbejdsgang.

> Kodeblokke mærket `powershell` køres i **PowerShell på din pc**.
> Kodeblokke mærket `bash` køres **på Hetzner-serveren** (efter `ssh hetzner`).
> Der står ingen prompt-tegn foran kommandoerne, så du kan kopiere en hel blok og indsætte den direkte.

---

## 1. Overblik: hvad skal du køre?

| Hvad har du ændret? | Hvad skal rulles ud | Afsnit |
| --- | --- | --- |
| Kun Angular (sider, design, tekster i frontend) | Frontend | [3](#3-frontend-github-pages) |
| Kun C#/API/database (`backend/`) | Backend | [4](#4-backend-hetzner-server) |
| Både og (fx en ny funktion i admin) | Backend **først**, derefter frontend | [5](#5-begge-dele) |
| Kun adgangskoder, nøgler, CORS (`.env.production`) | Backend (konfiguration) | [6](#6-ændre-konfiguration-på-serveren) |
| Kun dokumentation | Intet | |

**Tommelfingerregel:** Brugernes browser henter frontenden fra GitHub Pages og taler derefter med API'et på serveren.
Rul derfor altid backend ud først, så API'et er klar, før frontenden begynder at bruge det.

---

## 2. Før du ruller noget ud

Du ruller kun ud fra grenen `development`, efter at ændringen er merget via en pull request.

1. Åbn en pull request på GitHub, og merge den til `development`.
2. Hent den nyeste version på din pc:

```powershell
git checkout development
git pull
```

Tjek, at der ikke står "uncommitted changes":

```powershell
git status
```

---

## 3. Frontend (GitHub Pages)

Frontenden ligger på GitHub Pages på **murerfirmaet-mvo.dk**. Den bygges på din pc og lægges på grenen `gh-pages`.

```powershell
cd murerfirmaet-M.V.O
npm ci
npm run build
npm run deploy
```

Hvad kommandoerne gør:

| Kommando | Hvorfor |
| --- | --- |
| `npm ci` | Installerer præcis de pakker, der står i `package-lock.json`. Nødvendig, hvis pakker er ændret, ellers hurtig. |
| `npm run build` | Tester, at projektet kan bygges, før du publicerer. Stop, hvis der er fejl. |
| `npm run deploy` | Bygger igen og lægger resultatet på `gh-pages` med domænet `murerfirmaet-mvo.dk` (`--cname`). |

Efter 1–2 minutter er siden opdateret. Tving browseren til at hente det nye med **Ctrl+F5**.

**Tjek:**
- `https://murerfirmaet-mvo.dk` viser ændringen.
- `https://murerfirmaet-mvo.dk/admin` kan logge ind.

**Hvis noget går galt:**

| Problem | Løsning |
| --- | --- |
| `Cannot find native binding` / `not a valid Win32 application` | `Remove-Item -Recurse -Force node_modules`, derefter `npm ci`. Brug Node 22 eller 24 (LTS): `node -v`. |
| Domænet forsvinder fra GitHub Pages | Brug altid `npm run deploy` (den sætter `--cname`). GitHub: Settings → Pages → Custom domain = `murerfirmaet-mvo.dk`. |
| Siden viser gammelt indhold | Ctrl+F5. Vent et par minutter. Tjek, at GitHub Actions/Pages viser en grøn status under repoets *Actions*. |
| Login på `git push` mislykkes | Log ind i GitHub med din konto (Git Credential Manager), og kør `npm run deploy` igen. |

---

## 4. Backend (Hetzner-server)

Backenden kører som Docker-containere (MySQL, API og Caddy) på serveren. Koden bygges **på serveren**.

### 4.1 Log ind og hent koden

```powershell
ssh hetzner
```

```bash
cd ~/mvo
git pull
cd backend
```

Hvis `git pull` spørger om brugernavn og adgangskode, så brug dit GitHub-brugernavn og dit **fine-grained access token** (læseadgang til repoet).

### 4.2 Tag backup af databasen (anbefalet før større ændringer)

```bash
mkdir -p ~/backups
docker compose -f docker-compose.prod.yml exec -T mysql \
  sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction mvo' \
  > ~/backups/mvo-$(date +%F-%H%M).sql
```

Tjek, at filen ikke er tom: `ls -lh ~/backups`.

### 4.3 Byg og start API'et igen

```bash
docker compose -f docker-compose.prod.yml up -d --build api
```

- `--build` bygger det nye API-image ud fra den hentede kode (første gang tager det nogle minutter på ARM).
- Kun `api` genstartes. Databasen og Caddy bliver stående, så data og HTTPS-certifikat er upåvirket.
- Database-migreringer kører **automatisk**, når API'et starter.

> Hvis kommandoen klager over manglende variabler (`required variable ... is missing`), er `.env`-symlinket væk. Opret det igen med `ln -s .env.production .env` eller tilføj `--env-file .env.production` til kommandoen.

### 4.4 Tjek, at det virker

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 50 api
```

I loggen skal der stå `Application started`. Test derefter udefra (på din pc):

```powershell
curl https://api.murerfirmaet-mvo.dk/api/pages/specialiseret-murerarbejde
```

Du skal få JSON tilbage.

### 4.5 Ryd op i gamle images (af og til)

```bash
docker image prune -f
```

Brug **ikke** `docker volume prune` eller `docker compose down -v`. De sletter databasen og de uploadede billeder.

### 4.6 Hvis den nye version er gal

1. Se fejlen: `docker compose -f docker-compose.prod.yml logs --tail 100 api`.
2. Gå tilbage til en tidligere version af koden:

```bash
cd ~/mvo
git log --oneline -10          # find den gode version
git checkout <commit-id>
cd backend
docker compose -f docker-compose.prod.yml up -d --build api
```

3. Når du vil frem igen: `git checkout development && git pull`.

**Vigtigt:** Database-migreringer rulles ikke tilbage automatisk. Hvis en migrering er gået galt, så gendan backuppen fra 4.2 (se [hetzner.md](hetzner.md), afsnit "Backup").

---

## 5. Begge dele

Hvis en ændring rører både `backend/` og `murerfirmaet-M.V.O/`:

1. Merge pull requesten til `development`.
2. **Backend først** (afsnit 4), og tjek at API'et svarer.
3. **Derefter frontend** (afsnit 3).

Rækkefølgen sikrer, at frontenden aldrig kalder en API-funktion, der endnu ikke findes.

---

## 6. Ændre konfiguration på serveren

Adgangskoder, JWT-nøgle, administratorlogin, domæne og CORS ligger i `~/mvo/backend/.env.production`.

```bash
cd ~/mvo/backend
nano .env.production
docker compose -f docker-compose.prod.yml up -d
```

`up -d` opretter de containere igen, hvis konfigurationen er ændret. Bemærk:

| Ændring | Konsekvens |
| --- | --- |
| `CORS_ORIGIN_1/2` | Bruges, når siden kører på et andet domæne. Husk `https://` og ingen `/` til sidst. |
| `JWT_KEY` | Alle bliver logget ud af admin. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bruges **kun første gang**, når brugeren oprettes. Eksisterende adminbruger ændres ikke. |
| `MYSQL_ROOT_PASSWORD` / `MVO_DB_PASSWORD` | Ændres **ikke** i en eksisterende database. Volumet husker det gamle. Ret kun, hvis du ved, hvad du gør. |

Ændringer i `Caddyfile` (HTTPS/domæne):

```bash
docker compose -f docker-compose.prod.yml up -d caddy
```

---

## 7. Vedligeholdelse af serveren

Af og til (fx en gang om måneden):

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

Efter genstart starter containerne selv igen (`restart: unless-stopped`). Log ind igen om et minut, og tjek:

```bash
docker compose -f ~/mvo/backend/docker-compose.prod.yml ps
```

Tjek diskplads og hukommelse:

```bash
df -h
free -h
```

Husk at holde Hetzner-backups tændt (konsollen → din server → Backups).

---

## 8. Huskeliste

**Frontend:**
```powershell
git checkout development
git pull
cd murerfirmaet-M.V.O
npm ci
npm run deploy
```

**Backend:**
```powershell
ssh hetzner
```
```bash
cd ~/mvo && git pull && cd backend
docker compose -f docker-compose.prod.yml up -d --build api
docker compose -f docker-compose.prod.yml logs --tail 50 api
```

**Tjek bagefter:**
- `https://murerfirmaet-mvo.dk` og `/admin` virker.
- `https://api.murerfirmaet-mvo.dk/api/pages/specialiseret-murerarbejde` giver JSON.

---

## 9. Dokumentation

- Første opsætning af serveren: [hetzner.md](hetzner.md)
- Hetzner Cloud: <https://docs.hetzner.com/cloud/>
- Docker Compose: <https://docs.docker.com/compose/>
- Caddy: <https://caddyserver.com/docs/>
- GitHub Pages: <https://docs.github.com/en/pages>
- Angular deploy (`angular-cli-ghpages`): <https://github.com/angular-schule/angular-cli-ghpages>
