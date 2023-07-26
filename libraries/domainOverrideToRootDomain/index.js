/**
 * Create a domainOverride callback for an ID module, closing over
 * an instance of StorageManager.
 *
 * The domainOverride function, given document.domain, will return
 * the topmost domain we are able to set a cookie on. For example,
 * given subdomain.example.com, it would return example.com.
 *
 * @param {StorageManager} storage e.g. from getStorageManager()
 * @param {string} moduleName the name of the module using this function
 * @returns {function(): string}
 */
export function domainOverrideToRootDomain(storage, moduleName) {
  return function() {
    const domainElements = document.domain.split('.');
    const cookieName = `_gd${Date.now()}_${moduleName}`;

    for (let i = 0, topDomain, testCookie; i < domainElements.length; i++) {
      const nextDomain = domainElements.slice(i).join('.');

      // write test cookie
      storage.setCookie(cookieName, '1', undefined, undefined, nextDomain);

      // read test cookie to verify domain was valid
      testCookie = storage.getCookie(cookieName);

      // delete test cookie
      storage.setCookie(cookieName, '', 'Thu, 01 Jan 1970 00:00:01 GMT', undefined, nextDomain);

      if (testCookie === '1') {
        // cookie was written successfully using test domain so the topDomain is updated
        topDomain = nextDomain;
      } else {
        // cookie failed to write using test domain so exit by returning the topDomain
        return topDomain;
      }
    }
  }
}
