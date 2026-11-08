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
  let creatives = '';
  if (trackers?.trackingEvents?.length) {
    creatives = getLinearTrackingCreativesNode(trackers.trackingEvents);
  }
  return { impressions, errors, creatives };
}

export function getLinearTrackingCreativesNode(trackingEvents: NonNullable<VastTrackers['trackingEvents']>) {
  const tracking = Array.from(trackingEvents, ({ event, url }) => getTrackingNode(event, url)).join('');
  return `<Creatives><Creative><Linear><TrackingEvents>${tracking}</TrackingEvents></Linear></Creative></Creatives>`;
}

export function getTrackingNode(event: string, url: string) {
  const attribute = event ? ` event="${attributeValue(event)}"` : '';
  return `<Tracking${attribute}>${cdata(url)}</Tracking>`;
}
