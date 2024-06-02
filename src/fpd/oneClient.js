import {logWarn} from '../utils.js';

// mutually exclusive ORTB sections in order of priority - 'dooh' beats 'app' & 'site' and 'app' beats 'site';
// if one is set, the others will be removed
export const CLIENT_SECTIONS = ['dooh', 'app', 'site']

export function clientSectionChecker(logPrefix) {
  return function onlyOneClientSection(ortb2) {
    CLIENT_SECTIONS.reduce((found, section) => {
      if (hasSection(ortb2, section)) {
        if (found != null) {
          logWarn(`${logPrefix} specifies both '${found}' and '${section}'; dropping the latter.`)
          delete ortb2[section];
        } else {
          found = section;
        }
      }
      return found;
    }, null);
    return ortb2;
  }
}

export function hasSection(ortb2, section) {
  return ortb2[section] != null && Object.keys(ortb2[section]).length > 0
}
