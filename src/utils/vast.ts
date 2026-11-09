import { attributeValue, cdata } from './xml.js';

export interface VastTrackers {
  impression?: string[];
  error?: string[];
  trackingEvents?: Array<{ event: string; url: string }>;
}

/** Renders bidder trackers without registering hooks or changing the bid. */
export function getVastTrackerNodes(trackers?: VastTrackers) {
  const impressions = (trackers?.impression || [])
    .map(url => `<Impression>${cdata(url)}</Impression>`).join('');
  const errors = (trackers?.error || [])
    .map(url => `<Error>${cdata(url)}</Error>`).join('');
  // VAST requires an event on every Tracking node.
  const trackingEvents = (trackers?.trackingEvents || []).filter(({ event }) => event);
  const creatives = trackingEvents.length ? getLinearTrackingCreativesNode(trackingEvents) : '';
  return { impressions, errors, creatives };
}

export function getLinearTrackingCreativesNode(trackingEvents: NonNullable<VastTrackers['trackingEvents']>) {
  const tracking = Array.from(trackingEvents, ({ event, url }) => getTrackingNode(event, url)).join('');
  return `<Creatives><Creative><Linear><TrackingEvents>${tracking}</TrackingEvents></Linear></Creative></Creatives>`;
}

export function getTrackingNode(event: string, url: string) {
  return `<Tracking event="${attributeValue(event)}">${cdata(url)}</Tracking>`;
}
