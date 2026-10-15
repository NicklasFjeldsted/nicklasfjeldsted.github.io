/**
 * Base URL of the backend API. Local development talks to the API on localhost
 * (matches backend/src/Mvo.Api/Properties/launchSettings.json); everything else
 * (the deployed site) uses the production API.
 */
const isLocal = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
export const API_BASE_URL = isLocal ? 'http://localhost:5033' : 'https://api.murerfirmaet-mvo.dk';

/** Media URLs from the API are relative (`/media/<file>`), so they need the API origin in front. */
export const mediaUrl = (url: string): string => (/^https?:\/\//.test(url) ? url : API_BASE_URL + url);
