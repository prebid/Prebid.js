import {memoize} from '../utils.js';
import {canSetCookie, getCoreStorageManager} from '../storageManager.js';

export const coreStorage = getCoreStorageManager('fpdEnrichment');

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
  do {
    rootDomain = domainParts.slice(startIndex).join('.');
    if (canSetCookie(rootDomain, coreStorage)) {
      continueSearching = false;
    } else {
      startIndex += -1;
      continueSearching = Math.abs(startIndex) <= domainParts.length;
    }
  } while (continueSearching);
  return rootDomain;
});
