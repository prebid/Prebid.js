import { MAX_REQUEST_LENGTH } from "../intentIqConstants/intentIqConstants.js";

/**
 * Appends additional parameters to a URL if they are valid and applicable for the given request destination.
 *
 * @param {string} browser - The name of the current browser; used to look up the maximum URL length.
 * @param {string} url - The base URL to which additional parameters may be appended.
 * @param {(string|number)} requestTo - The destination identifier; used as an index to check if a parameter applies.
 * @param {Array<Object>} additionalParams - An array of parameter objects to append.
 *   Each parameter object should have the following properties:
 *   - `parameterName` {string}: The name of the parameter.
 *   - `parameterValue` {*}: The value of the parameter.
 *   - `destination` {Object|Array}: An object or array indicating the applicable destinations. Sync = 0, VR = 1, reporting = 2
 *
 * @return {string} The resulting URL with additional parameters appended if valid; otherwise, the original URL.
 */
export function handleAdditionalParams(browser, url, requestTo, additionalParams) {
  let queryString = '';

  if (!Array.isArray(additionalParams)) return url;

  for (let i = 0; i < additionalParams.length; i++) {
    const param = additionalParams[i];

    if (
      typeof param !== 'object' ||
      !param.parameterName ||
      !param.parameterValue ||
      !param.destination ||
      !Array.isArray(param.destination)
    ) {
      continue;
    }

    if (param.destination[requestTo]) {
      queryString += `&agp_${encodeURIComponent(param.parameterName)}=${param.parameterValue}`;
    }
  }

  const maxLength = MAX_REQUEST_LENGTH[browser] ?? 2048;
  if ((url.length + queryString.length) > maxLength) return url;

  return url + queryString;
}
