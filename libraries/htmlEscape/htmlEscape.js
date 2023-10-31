/**
 * Encode a string for inclusion in HTML.
 * See https://pragmaticwebsecurity.com/articles/spasecurity/json-stringify-xss.html and
 * https://codeql.github.com/codeql-query-help/javascript/js-bad-code-sanitization/
 * @return {string}
 */
export const escapeUnsafeChars = (() => {
  const escapes = {
    '<': '\\u003C',
    '>': '\\u003E',
    '/': '\\u002F',
    '\\': '\\\\',
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\0': '\\0',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
  };

  return function (str) {
    return str.replace(/[<>\b\f\n\r\t\0\u2028\u2029\\]/g, x => escapes[x]);
  };
})();
