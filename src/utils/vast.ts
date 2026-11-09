import { logError, logWarn } from './logging.js';
import { isArray, isPlainObject, isStr } from './objects.js';

export interface VastTrackers {
  impression?: string[];
  error?: string[];
  trackingEvents?: Array<{ event: string; url: string }>;
}

/**
 * Rejects anything but http(s) URLs. ']]>' is rejected because DOM CDATA sections cannot hold it.
 */
function isSafeTrackingUrl(url): url is string {
  return isStr(url) && !url.includes(']]>') && /^https?:\/\//i.test(url);
}

/**
 * Merges tracker sets, dropping anything malformed or unsafe.
 */
export function mergeVastTrackers(...sources: unknown[]): Required<VastTrackers> {
  const merged: Required<VastTrackers> = { impression: [], error: [], trackingEvents: [] };
  sources.filter(isPlainObject).forEach((source: VastTrackers) => {
    (['impression', 'error'] as const).forEach(type => {
      if (isArray(source[type])) {
        merged[type].push(...source[type].filter(isSafeTrackingUrl));
      }
    });
    if (isArray(source.trackingEvents)) {
      merged.trackingEvents.push(...source.trackingEvents.filter(tracker =>
        isPlainObject(tracker) && isStr(tracker.event) && tracker.event !== '' && isSafeTrackingUrl(tracker.url)
      ));
    }
  });
  return merged;
}

/**
 * Trackers a bid response asks for: `vastTrackers`, plus the deprecated `vastImpUrl`.
 */
export function getBidVastTrackers(bid: { vastTrackers?: VastTrackers; vastImpUrl?: string | string[] }) {
  let vastImpUrl;
  if (bid.vastImpUrl) {
    logWarn('vastImpUrl is deprecated; use vastTrackers.impression instead');
    vastImpUrl = { impression: isArray(bid.vastImpUrl) ? bid.vastImpUrl : [bid.vastImpUrl] };
  }
  return mergeVastTrackers(bid.vastTrackers, vastImpUrl);
}

function hasUrl(node: Element, url: string) {
  return node.textContent.trim() === url.trim();
}

/**
 * Inserts `node` after the last sibling with the same tag or, failing that, before `Creatives` or `Extensions`,
 * which follow tracking URLs in VAST's element order.
 */
function insertTrackingNode(parent: Element, node: Element) {
  const children = Array.from(parent.children);
  const lastSameTag = children.filter(child => child.tagName === node.tagName).pop();
  const next = lastSameTag
    ? lastSameTag.nextSibling
    : children.find(child => child.tagName === 'Creatives' || child.tagName === 'Extensions') ?? null;
  parent.insertBefore(node, next);
}

function appendTrackingEvents(doc: Document, trackingEvents: Element, trackers: VastTrackers['trackingEvents']) {
  trackers.forEach(({ event, url }) => {
    if (Array.from(trackingEvents.children).some(child =>
      child.tagName === 'Tracking' && child.getAttribute('event') === event && hasUrl(child, url))) {
      return;
    }
    const tracking = doc.createElement('Tracking');
    tracking.setAttribute('event', event);
    tracking.appendChild(doc.createCDATASection(url));
    trackingEvents.appendChild(tracking);
  });
}

function insertLinearTrackingEvents(doc: Document, ad: Element, trackers: VastTrackers['trackingEvents']) {
  const linears = ad.querySelectorAll('Creatives Creative Linear');
  if (linears.length) {
    linears.forEach(linear => {
      let trackingEvents = linear.querySelector('TrackingEvents');
      if (!trackingEvents) {
        trackingEvents = linear.appendChild(doc.createElement('TrackingEvents'));
      }
      appendTrackingEvents(doc, trackingEvents, trackers);
    });
  } else {
    const creatives = ad.querySelector('Creatives') ?? ad.appendChild(doc.createElement('Creatives'));
    const trackingEvents = creatives
      .appendChild(doc.createElement('Creative'))
      .appendChild(doc.createElement('Linear'))
      .appendChild(doc.createElement('TrackingEvents'));
    appendTrackingEvents(doc, trackingEvents, trackers);
  }
}

/**
 * Adds trackers to every Wrapper and InLine in `vastXml`, skipping invalid ones and ones it already has.
 * Returns `vastXml` unchanged if there is nothing to add or it cannot be parsed.
 */
export function insertVastTrackers(trackers: VastTrackers, vastXml: string): string {
  const { impression, error, trackingEvents } = mergeVastTrackers(trackers);
  if (!impression.length && !error.length && !trackingEvents.length) {
    return vastXml;
  }
  try {
    const doc = new DOMParser().parseFromString(vastXml, 'text/xml');
    const ads = doc.querySelectorAll('VAST Ad Wrapper, VAST Ad InLine');
    if (!ads.length) {
      return vastXml;
    }
    ads.forEach(ad => {
      ([['Impression', impression], ['Error', error]] as const).forEach(([tagName, urls]) => {
        urls.forEach(url => {
          if (Array.from(ad.children).some(child => child.tagName === tagName && hasUrl(child, url))) {
            return;
          }
          const node = doc.createElement(tagName);
          node.appendChild(doc.createCDATASection(url));
          insertTrackingNode(ad, node);
        });
      });
      if (trackingEvents.length) {
        insertLinearTrackingEvents(doc, ad, trackingEvents);
      }
    });
    return new XMLSerializer().serializeToString(doc);
  } catch (e) {
    logError('Could not insert trackers in vastXml', e);
    return vastXml;
  }
}
