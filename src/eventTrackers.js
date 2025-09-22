export const TRACKER_METHOD_IMG = 1;
export const TRACKER_METHOD_JS = 2;
export const EVENT_TYPE_IMPRESSION = 1;
export const EVENT_TYPE_WIN = 500;

/**
 * Returns a map from event type (EVENT_TYPE_*)
 * to a map from tracker method (TRACKER_METHOD_*)
 * to an array of tracking URLs
 *
 * @param {{}[]} eventTrackers an array of "Event Tracker Response Object" as defined
 *  in the ORTB native 1.2 spec (https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf, section 5.8)
 * @returns {{[type: string]: {[method: string]: string[]}}}
 */
export function parseEventTrackers(eventTrackers) {
  return (eventTrackers ?? []).reduce((tally, {event, method, url}) => {
    const trackersForType = tally[event] = tally[event] ?? {};
    const trackersForMethod = trackersForType[method] = trackersForType[method] ?? [];
    trackersForMethod.push(url);
    return tally;
  }, {})
}
