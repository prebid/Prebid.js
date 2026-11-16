/**
 * @param {string} name environment variable
 * @param {boolean} [dflt] value when the variable is unset or empty
 * @returns {boolean} false for '0' or 'false', true for any other non-empty value
 */
export function envFlag(name, dflt = false) {
  const value = process.env[name];
  if (!value) return dflt;
  return !['0', 'false'].includes(value.toLowerCase());
}
