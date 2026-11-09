import { logError, logWarn } from './logging.js';
import { isArray, isPlainObject, isStr } from './objects.js';

export interface VastTrackers {
  impression?: string[];
  error?: string[];
  trackingEvents?: Array<{ event: string; url: string }>;
}

/**
 * Accepts only http(s) and protocol-relative URLs. ']]>' is rejected because DOM CDATA sections cannot hold it.
 */
function isSafeTrackingUrl(url): url is string {
  return isStr(url) && !url.includes(']]>') && /^(https?:)?\/\//i.test(url);
}

function isValidTrackingEvent(tracker): tracker is { event: string; url: string } {
  return isPlainObject(tracker) && isStr(tracker.event) && tracker.event !== '' && isSafeTrackingUrl(tracker.url);
}

function keepValid<T>(items: unknown[], isValid: (item) => item is T): T[] {
  return items.filter((item): item is T => {
    if (isValid(item)) {
      return true;
    }
    logWarn('Dropping invalid VAST tracker', item);
    return false;
  });
}

/**
 * Merges tracker sets, dropping anything malformed or unsafe.
 */
export function mergeVastTrackers(...sources: unknown[]): Required<VastTrackers> {
  const merged: Required<VastTrackers> = { impression: [], error: [], trackingEvents: [] };
  sources.filter(isPlainObject).forEach((source: VastTrackers) => {
    (['impression', 'error'] as const).forEach(type => {
      if (isArray(source[type])) {
        merged[type].push(...keepValid(source[type], isSafeTrackingUrl));
      }
    });
    if (isArray(source.trackingEvents)) {
      merged.trackingEvents.push(...keepValid(source.trackingEvents, isValidTrackingEvent));
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
 * Creates an element in `parent`'s namespace; without it, nodes added to a namespaced VAST
 * fall outside the VAST namespace.
 */
function createChild(parent: Element, localName: string) {
  return parent.ownerDocument.createElementNS(parent.namespaceURI, localName);
}

/**
 * Inserts `node` after the last sibling with the same name or, failing that, before `Creatives` or `Extensions`,
 * which follow tracking URLs in VAST's element order.
 */
function insertTrackingNode(parent: Element, node: Element) {
  const children = Array.from(parent.children);
  const lastSameName = children.filter(child => child.localName === node.localName).pop();
  const next = lastSameName
    ? lastSameName.nextSibling
    : children.find(child => child.localName === 'Creatives' || child.localName === 'Extensions') ?? null;
  parent.insertBefore(node, next);
}

function appendTrackingEvents(trackingEvents: Element, trackers: VastTrackers['trackingEvents']) {
  trackers.forEach(({ event, url }) => {
    if (Array.from(trackingEvents.children).some(child =>
      child.localName === 'Tracking' && child.getAttribute('event') === event && hasUrl(child, url))) {
      return;
    }
    const tracking = createChild(trackingEvents, 'Tracking');
    tracking.setAttribute('event', event);
    tracking.appendChild(trackingEvents.ownerDocument.createCDATASection(url));
    trackingEvents.appendChild(tracking);
  });
}

function insertLinearTrackingEvents(ad: Element, trackers: VastTrackers['trackingEvents']) {
  const linears = ad.querySelectorAll('Creatives Creative Linear');
  if (linears.length) {
    linears.forEach(linear => {
      const trackingEvents = linear.querySelector('TrackingEvents') ?? linear.appendChild(createChild(linear, 'TrackingEvents'));
      appendTrackingEvents(trackingEvents, trackers);
    });
  } else {
    const creatives = ad.querySelector('Creatives') ?? ad.appendChild(createChild(ad, 'Creatives'));
    const creative = creatives.appendChild(createChild(creatives, 'Creative'));
    const linear = creative.appendChild(createChild(creative, 'Linear'));
    appendTrackingEvents(linear.appendChild(createChild(linear, 'TrackingEvents')), trackers);
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
    // DOMParser does not throw on malformed XML; some browsers return what parsed before the error plus a parsererror element.
    if (doc.getElementsByTagName('parsererror').length) {
      return vastXml;
    }
    const ads = doc.querySelectorAll('VAST Ad Wrapper, VAST Ad InLine');
    if (!ads.length) {
      return vastXml;
    }
    ads.forEach(ad => {
      ([['Impression', impression], ['Error', error]] as const).forEach(([tagName, urls]) => {
        urls.forEach(url => {
          if (Array.from(ad.children).some(child => child.localName === tagName && hasUrl(child, url))) {
            return;
          }
          const node = createChild(ad, tagName);
          node.appendChild(doc.createCDATASection(url));
          insertTrackingNode(ad, node);
        });
      });
      if (trackingEvents.length) {
        insertLinearTrackingEvents(ad, trackingEvents);
      }
    });
    return new XMLSerializer().serializeToString(doc);
  } catch (e) {
    logError('Could not insert trackers in vastXml', e);
    return vastXml;
  }
}
