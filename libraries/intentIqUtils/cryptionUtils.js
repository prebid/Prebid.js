/**
 * Encrypts plaintext using a simple XOR cipher with a numeric key.
 *
 * @param {string} plainText The plaintext to encrypt.
 * @param {number} [key=42] The XOR key (0–255) to use for encryption.
 * @returns {string} The encrypted text as a dot-separated string.
 */
export function encryptData(plainText, key = 42) {
  let out = '';
  for (let i = 0; i < plainText.length; i++) {
    out += (plainText.charCodeAt(i) ^ key) + '.';
  }
  return out.slice(0, -1);
}

/**
 * Decrypts a dot-separated decimal string produced by encryptData().
 * Uses the same XOR key that was used during encryption.
 *
 * @param {string} encryptedText The encrypted text as a dot-separated string.
 * @param {number} [key=42] The XOR key (0–255) used for encryption.
 * @returns {string} The decrypted plaintext.
 */
export function decryptData(encryptedText, key = 42) {
  const parts = encryptedText.split('.');
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    out += String.fromCharCode(parts[i] ^ key);
  }
  return out;
}
