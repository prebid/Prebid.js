import {EVENT_TYPE_IMPRESSION, EVENT_TYPE_WIN, TRACKER_METHOD_IMG} from '../../../src/eventTrackers.js';

export function addEventTrackers(bidResponse, bid) {
  bidResponse.eventtrackers = bidResponse.eventtrackers || [];
  [
    [bid.burl, EVENT_TYPE_IMPRESSION], // core used to fire burl directly, but only for bids coming from PBS
    [bid?.ext?.prebid?.events?.win, EVENT_TYPE_WIN]
  ].filter(([winUrl, type]) => winUrl && bidResponse.eventtrackers.find(
    ({method, event, url}) => event === type && method === TRACKER_METHOD_IMG && url === winUrl
  ) == null)
    .forEach(([url, event]) => {
      bidResponse.eventtrackers.push({
        method: TRACKER_METHOD_IMG,
        event,
        url
      })
    })
}
