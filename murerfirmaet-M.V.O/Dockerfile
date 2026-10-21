# Bygger Angular-siden og lægger den i et Caddy-image, som serverer den sammen med API'et.
# Virker på ARM (Hetzner CAX) og x86.
FROM node:22-alpine AS build
WORKDIR /src

# Kopiér kun pakkefilerne først, så npm ci kan caches mellem builds.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2
COPY --from=build /src/dist/murerfirmaet-M.V.O/browser /srv
