export function getServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  if (import.meta.env.PROD) return window.location.origin;
  return 'http://localhost:5000';
}
