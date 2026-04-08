export function tryAppendQueryString(existingUrl: string, key: string, value: string): string {
  if (value) {
    return `${existingUrl}${key}=${encodeURIComponent(value)}&`;
  }

  return existingUrl;
}
