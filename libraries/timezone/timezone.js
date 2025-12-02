export function getTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
