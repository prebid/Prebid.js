/**
 * Encode a string as UTF-8 bytes.
 *
 * @param {string} str
 * @returns {Uint8Array}
 */
export function utf8ToBytes(str) {
  if (typeof str !== "string") {
    throw new TypeError("string expected");
  }
  // percent-encoding yields the UTF-8 bytes: `%XX` is one byte, anything else is ASCII
  const encoded = encodeURIComponent(str);
  const bytes = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === "%") {
      bytes.push(parseInt(encoded.substr(i + 1, 2), 16));
      i += 2;
    } else {
      bytes.push(encoded.charCodeAt(i));
    }
  }
  return new Uint8Array(bytes);
}
