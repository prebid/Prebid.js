import {memoize, timestamp} from '../utils.js';
import {getCoreStorageManager} from '../storageManager.js';

export const coreStorage = getCoreStorageManager();

/**
 * Find the root domain by testing for the topmost domain that will allow setting cookies.
 */

export const findRootDomain = memoize(function findRootDomain(fullDomain = window.location.host) {
  if (!coreStorage.cookiesAreEnabled()) {
    return fullDomain;
  }

  const domainParts = fullDomain.split('.');
  if (domainParts.length === 2) {
    return fullDomain;
  }
  let rootDomain;
  let continueSearching;
  let startIndex = -2;
  const TEST_COOKIE_NAME = `_rdc${Date.now()}`;
  const TEST_COOKIE_VALUE = 'writeable';
  do {
    rootDomain = domainParts.slice(startIndex).join('.');
    let expirationDate = new Date(timestamp() + 10 * 1000).toUTCString();

    // Write a test cookie
    coreStorage.setCookie(
      TEST_COOKIE_NAME,
      TEST_COOKIE_VALUE,
      expirationDate,
      'Lax',
      rootDomain,
      undefined
    );

    // See if the write was successful
    const value = coreStorage.getCookie(TEST_COOKIE_NAME, undefined);
    if (value === TEST_COOKIE_VALUE) {
      continueSearching = false;
      // Delete our test cookie
      coreStorage.setCookie(
        TEST_COOKIE_NAME,
        '',
        'Thu, 01 Jan 1970 00:00:01 GMT',
        undefined,
        rootDomain,
        undefined
      );
    } else {
      startIndex += -1;
      continueSearching = Math.abs(startIndex) <= domainParts.length;
    }
  } while (continueSearching);
  return rootDomain;
});
