# M.V.O. backend

.NET 9 API (CQRS with MediatR, EF Core + MySQL, JWT admin login). Serves the public content API and the admin API used by the `/admin` page of the Angular site.

## Run locally

1. Start MySQL:

   ```bash
   cd backend
   cp .env.example .env        # then set MVO_DB_PASSWORD
   docker compose up -d
   ```

2. Configure secrets (user-secrets keeps them out of git):

   ```bash
   cd backend/src/Mvo.Api
   dotnet user-secrets set "ConnectionStrings:Mvo" "Server=localhost;Port=3306;Database=mvo;User=root;Password=<MVO_DB_PASSWORD>"
   dotnet user-secrets set "Jwt:Key" "<random string, at least 32 characters>"
   dotnet user-secrets set "Admin:Email" "<admin e-mail>"
   dotnet user-secrets set "Admin:Password" "<admin password>"
   ```

3. Run the API (migrations and the seed admin run on startup):

   ```bash
   dotnet run --project backend/src/Mvo.Api --urls http://localhost:5033
   ```

4. Run the site (`cd murerfirmaet-M.V.O && npm start`) and open <http://localhost:4200/admin>.

Uploaded images are stored under `Media:RootPath` (default `media/`, ignored by git) and served from `/media/...`.

The frontend reads the API address from `src/app/core/config/api.config.ts` (`API_BASE_URL`). Change it before deploying the API somewhere else, and add the site's origin to the CORS list in `appsettings.json`.

## Tests

```bash
dotnet test backend/tests/Mvo.Tests
```

Integration tests start a MySQL container with Testcontainers, so Docker must be running.
