/**
 * Base URL of the backend API. The production host is not decided yet - change it here
 * (the dev value matches backend/src/Mvo.Api/Properties/launchSettings.json).
 */
export const API_BASE_URL = 'http://localhost:5033';

/** Media URLs from the API are relative (`/media/<file>`), so they need the API origin in front. */
export const mediaUrl = (url: string): string => (/^https?:\/\//.test(url) ? url : API_BASE_URL + url);
