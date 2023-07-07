import {logError, logWarn, mergeDeep, isEmpty, safeJSONParse, logInfo, hasDeviceAccess} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {submodule} from '../src/hook.js';
import {GreedyPromise} from '../src/utils/promise.js';
import {config} from '../src/config.js';
import {getCoreStorageManager} from '../src/storageManager.js';
import {includes} from '../src/polyfill.js';
import {gdprDataHandler} from '../src/adapterManager.js';

const MODULE_NAME = 'topicsFpd';
const DEFAULT_EXPIRATION_DAYS = 21;
const TCF_REQUIRED_PURPOSES = ['1', '2', '3', '4'];
let HAS_GDPR_CONSENT = true;
let LOAD_TOPICS_INITIALISE = false;
const HAS_DEVICE_ACCESS = hasDeviceAccess();

const bidderIframeList = {
  maxTopicCaller: 2,
  bidders: [{
    bidder: 'pubmatic',
    iframeURL: 'https://ads.pubmatic.com/AdServer/js/topics/topics_frame.html'
  }, {
    bidder: 'rtbhouse',
    iframeURL: 'https://topics.authorizedvault.com/topicsapi.html'
  }]
}
export const coreStorage = getCoreStorageManager(MODULE_NAME);
export const topicStorageName = 'prebid:topics';
export const lastUpdated = 'lastUpdated';

const iframeLoadedURL = [];
const TAXONOMIES = {
  // map from topic taxonomyVersion to IAB segment taxonomy
  '1': 600,
  '2': 601,
  '3': 602,
  '4': 603
}

function partitionBy(field, items) {
  return items.reduce((partitions, item) => {
    const key = item[field];
    if (!partitions.hasOwnProperty(key)) partitions[key] = [];
    partitions[key].push(item);
    return partitions;
  }, {});
}

/**
 * function to get list of loaded Iframes calling Topics API
 */
function getLoadedIframeURL() {
  return iframeLoadedURL;
}

/**
 * function to set/push iframe in the list which is loaded to called topics API.
 */
function setLoadedIframeURL(url) {
  return iframeLoadedURL.push(url);
}

export function getTopicsData(name, topics, taxonomies = TAXONOMIES) {
  return Object.entries(partitionBy('taxonomyVersion', topics))
    .filter(([taxonomyVersion]) => {
      if (!taxonomies.hasOwnProperty(taxonomyVersion)) {
        logWarn(`Unrecognized taxonomyVersion from Topics API: "${taxonomyVersion}"; topic will be ignored`);
        return false;
      }
      return true;
    }).flatMap(([taxonomyVersion, topics]) =>
      Object.entries(partitionBy('modelVersion', topics))
        .map(([modelVersion, topics]) => {
          const datum = {
            ext: {
              segtax: taxonomies[taxonomyVersion],
              segclass: modelVersion
            },
            segment: topics.map((topic) => ({id: topic.topic.toString()}))
          };
          if (name != null) {
            datum.name = name;
          }
          return datum;
        })
    );
}

export function getTopics(doc = document) {
  let topics = null;
  try {
    if ('browsingTopics' in doc && doc.featurePolicy.allowsFeature('browsing-topics')) {
      topics = GreedyPromise.resolve(doc.browsingTopics());
    }
  } catch (e) {
    logError('Could not call topics API', e);
  }
  if (topics == null) {
    topics = GreedyPromise.resolve([]);
  }
  return topics;
}

const topicsData = getTopics().then((topics) => getTopicsData(getRefererInfo().domain, topics));

export function processFpd(config, {global}, {data = topicsData} = {}) {
  if (!LOAD_TOPICS_INITIALISE) {
    loadTopicsForBidders();
    LOAD_TOPICS_INITIALISE = true;
  }
  return data.then((data) => {
    data = [].concat(data, getCachedTopics()); // Add cached data in FPD data.
    if (data.length) {
      mergeDeep(global, {
        user: {
          data
        }
      });
    }
    return {global};
  });
}

/**
 * function to fetch the cached topic data from storage for bidders and return it
 */
export function getCachedTopics() {
  let cachedTopicData = [];
  if (!HAS_GDPR_CONSENT || !HAS_DEVICE_ACCESS) {
    return cachedTopicData;
  }
  const topics = config.getConfig('userSync.topics') || bidderIframeList;
  const bidderList = topics.bidders || [];
  let storedSegments = new Map(safeJSONParse(coreStorage.getDataFromLocalStorage(topicStorageName)));
  storedSegments && storedSegments.forEach((value, cachedBidder) => {
    // Check bidder exist in config for cached bidder data and then only retrieve the cached data
    let bidderConfigObj = bidderList.find(({bidder}) => cachedBidder == bidder)
    if (bidderConfigObj) {
      if (!isCachedDataExpired(value[lastUpdated], bidderConfigObj?.expiry || DEFAULT_EXPIRATION_DAYS)) {
        Object.keys(value).forEach((segData) => {
          segData != lastUpdated && cachedTopicData.push(value[segData]);
        })
      } else {
        // delete the specific bidder map from the store and store the updated maps
        storedSegments.delete(cachedBidder);
        coreStorage.setDataInLocalStorage(topicStorageName, JSON.stringify([...storedSegments]));
      }
    }
  });
  return cachedTopicData;
}

/**
 * Recieve messages from iframe loaded for bidders to fetch topic
 * @param {MessageEvent} evt
 */
export function receiveMessage(evt) {
  if (evt && evt.data) {
    try {
      let data = safeJSONParse(evt.data);
      if (includes(getLoadedIframeURL(), evt.origin) && data && data.segment && !isEmpty(data.segment.topics)) {
        const {domain, topics, bidder} = data.segment;
        const iframeTopicsData = getTopicsData(domain, topics)[0];
        iframeTopicsData && storeInLocalStorage(bidder, iframeTopicsData);
      }
    } catch (err) { }
  }
}

/**
Function to store Topics data recieved from iframe in storage(name: "prebid:topics")
* @param {Topics} topics
*/
export function storeInLocalStorage(bidder, topics) {
  const storedSegments = new Map(safeJSONParse(coreStorage.getDataFromLocalStorage(topicStorageName)));
  if (storedSegments.has(bidder)) {
    storedSegments.get(bidder)[topics['ext']['segclass']] = topics;
    storedSegments.get(bidder)[lastUpdated] = new Date().getTime();
    storedSegments.set(bidder, storedSegments.get(bidder));
  } else {
    storedSegments.set(bidder, {[topics.ext.segclass]: topics, [lastUpdated]: new Date().getTime()})
  }
  coreStorage.setDataInLocalStorage(topicStorageName, JSON.stringify([...storedSegments]));
}

function isCachedDataExpired(storedTime, cacheTime) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const currentTime = new Date().getTime();
  const daysDifference = Math.ceil((currentTime - storedTime) / _MS_PER_DAY);
  return daysDifference > cacheTime;
}

/**
* Function to get random bidders based on count passed with array of bidders
**/
function getRandomBidders(arr, count) {
  return ([...arr].sort(() => 0.5 - Math.random())).slice(0, count)
}

/**
 * function to add listener for message receiving from IFRAME
 */
function listenMessagesFromTopicIframe() {
  window.addEventListener('message', receiveMessage, false);
}

function checkTCFv2(vendorData, requiredPurposes = TCF_REQUIRED_PURPOSES) {
  const {gdprApplies, purpose} = vendorData;
  if (!gdprApplies || !purpose) {
    return true;
  }
  return requiredPurposes.map((purposeNo) => {
    const purposeConsent = purpose.consents ? purpose.consents[purposeNo] : false;
    if (purposeConsent) {
      return true;
    }
    return false;
  }).reduce((a, b) => a && b, true);
}

export function hasGDPRConsent() {
  // Check for GDPR consent for purpose 1,2,3,4 and return false if consent has not been given
  const gdprConsent = gdprDataHandler.getConsentData();
  const hasGdpr = (gdprConsent && typeof gdprConsent.gdprApplies === 'boolean' && gdprConsent.gdprApplies) ? 1 : 0;
  const gdprConsentString = hasGdpr ? gdprConsent.consentString : '';
  if (hasGdpr) {
    if ((!gdprConsentString || gdprConsentString === '') || !gdprConsent.vendorData) {
      return false;
    }
    return checkTCFv2(gdprConsent.vendorData);
  }
  return true;
}

/**
 * function to load the iframes of the bidder to load the topics data
 */
function loadTopicsForBidders() {
  HAS_GDPR_CONSENT = hasGDPRConsent();
  if (!HAS_GDPR_CONSENT || !HAS_DEVICE_ACCESS) {
    logInfo('Topics Module : Consent string is required to fetch the topics from third party domains.');
    return;
  }
  const topics = config.getConfig('userSync.topics') || bidderIframeList;
  if (topics) {
    listenMessagesFromTopicIframe();
    const randomBidders = getRandomBidders(topics.bidders || [], topics.maxTopicCaller || 1)
    randomBidders && randomBidders.forEach(({ bidder, iframeURL }) => {
      if (bidder && iframeURL) {
        let ifrm = document.createElement('iframe');
        ifrm.name = 'ifrm_'.concat(bidder);
        ifrm.src = ''.concat(iframeURL, '?bidder=').concat(bidder);
        ifrm.style.display = 'none';
        setLoadedIframeURL(new URL(iframeURL).origin);
        iframeURL && window.document.documentElement.appendChild(ifrm);
      }
    })
  } else {
    logWarn(`Topics config not defined under userSync Object`);
  }
}

submodule('firstPartyData', {
  name: 'topics',
  queue: 1,
  processFpd
});
