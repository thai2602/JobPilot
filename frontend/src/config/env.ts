export const API_URL = (
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8080'
).trim();

export const GOOGLE_CLIENT_ID = (
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID) ||
  ''
).trim();
