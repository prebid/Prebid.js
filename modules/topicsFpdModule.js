import {isEmpty, logError, logWarn, mergeDeep, safeJSONParse} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {submodule} from '../src/hook.js';
import {PbPromise} from '../src/utils/promise.js';
import {config} from '../src/config.js';
import {getCoreStorageManager} from '../src/storageManager.js';

import {isActivityAllowed} from '../src/activities/rules.js';
import {ACTIVITY_ENRICH_UFPD} from '../src/activities/activities.js';
import {activityParams} from '../src/activities/activityParams.js';
import {MODULE_TYPE_BIDDER} from '../src/activities/modules.js';

const MODULE_NAME = 'topicsFpd';
const DEFAULT_EXPIRATION_DAYS = 21;
const DEFAULT_FETCH_RATE_IN_DAYS = 1;
let LOAD_TOPICS_INITIALISE = false;
let iframeLoadedURL = [];

export function reset() {
  LOAD_TOPICS_INITIALISE = false;
  iframeLoadedURL = [];
}

export const coreStorage = getCoreStorageManager(MODULE_NAME);
export const topicStorageName = 'prebid:topics';
export const lastUpdated = 'lastUpdated';

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

function isTopicsSupported(doc = document) {
  return 'browsingTopics' in doc && doc.featurePolicy.allowsFeature('browsing-topics')
}

export function getTopics(doc = document) {
  let topics = null;

  try {
    if (isTopicsSupported(doc)) {
      topics = PbPromise.resolve(doc.browsingTopics());
    }
  } catch (e) {
    logError('Could not call topics API', e);
  }
  if (topics == null) {
    topics = PbPromise.resolve([]);
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
  const cachedTopicData = [];
  const topics = config.getConfig('userSync.topics');
  const bidderList = topics?.bidders || [];
  const storedSegments = new Map(safeJSONParse(coreStorage.getDataFromLocalStorage(topicStorageName)));
  storedSegments && storedSegments.forEach((value, cachedBidder) => {
    // Check bidder exist in config for cached bidder data and then only retrieve the cached data
    const bidderConfigObj = bidderList.find(({bidder}) => cachedBidder === bidder)
    if (bidderConfigObj && isActivityAllowed(ACTIVITY_ENRICH_UFPD, activityParams(MODULE_TYPE_BIDDER, cachedBidder))) {
      if (!isCachedDataExpired(value[lastUpdated], bidderConfigObj?.expiry || DEFAULT_EXPIRATION_DAYS)) {
        Object.keys(value).forEach((segData) => {
          segData !== lastUpdated && cachedTopicData.push(value[segData]);
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
 * Receive messages from iframe loaded for bidders to fetch topic
 * @param {MessageEvent} evt
 */
export function receiveMessage(evt) {
  if (evt && evt.data) {
    try {
      const data = safeJSONParse(evt.data);
      if (getLoadedIframeURL().includes(evt.origin) && data && data.segment && !isEmpty(data.segment.topics)) {
        const {domain, topics, bidder} = data.segment;
        const iframeTopicsData = getTopicsData(domain, topics);
        iframeTopicsData && storeInLocalStorage(bidder, iframeTopicsData);
      }
    } catch (err) { }
  }
}

/**
Function to store Topics data received from iframe in storage(name: "prebid:topics")
 * @param {string} bidder
 * @param {object} topics
 */
export function storeInLocalStorage(bidder, topics) {
  const storedSegments = new Map(safeJSONParse(coreStorage.getDataFromLocalStorage(topicStorageName)));
  const topicsObj = {
    [lastUpdated]: new Date().getTime()
  };

  topics.forEach((topic) => {
    topicsObj[topic.ext.segclass] = topic;
  });

  storedSegments.set(bidder, topicsObj);
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
 */
function getRandomAllowedConfigs(arr, count) {
  const configs = [];
  for (const config of [...arr].sort(() => 0.5 - Math.random())) {
    if (config.bidder && isActivityAllowed(ACTIVITY_ENRICH_UFPD, activityParams(MODULE_TYPE_BIDDER, config.bidder))) {
      configs.push(config);
    }
    if (configs.length >= count) {
      break;
    }
  }
  return configs;
}

/**
 * function to add listener for message receiving from IFRAME
 */
function listenMessagesFromTopicIframe() {
  window.addEventListener('message', receiveMessage, false);
}

/**
 * function to load the iframes of the bidder to load the topics data
 */
export function loadTopicsForBidders(doc = document) {
  if (!isTopicsSupported(doc)) return;
  const topics = config.getConfig('userSync.topics');

  if (topics) {
    listenMessagesFromTopicIframe();
    const randomBidders = getRandomAllowedConfigs(topics.bidders || [], topics.maxTopicCaller || 1)
    randomBidders && randomBidders.forEach(({ bidder, iframeURL, fetchUrl, fetchRate }) => {
      if (bidder && iframeURL) {
        const ifrm = doc.createElement('iframe');
        ifrm.name = 'ifrm_'.concat(bidder);
        ifrm.src = ''.concat(iframeURL, '?bidder=').concat(bidder);
        ifrm.style.display = 'none';
        setLoadedIframeURL(new URL(iframeURL).origin);
        iframeURL && doc.documentElement.appendChild(ifrm);
      }

      if (bidder && fetchUrl) {
        const storedSegments = new Map(safeJSONParse(coreStorage.getDataFromLocalStorage(topicStorageName)));
        const bidderLsEntry = storedSegments.get(bidder);

        if (!bidderLsEntry || (bidderLsEntry && isCachedDataExpired(bidderLsEntry[lastUpdated], fetchRate || DEFAULT_FETCH_RATE_IN_DAYS))) {
          window.fetch(`${fetchUrl}?bidder=${bidder}`, {browsingTopics: true})
            .then(response => {
              return response.json();
            })
            .then(data => {
              if (data && data.segment && !isEmpty(data.segment.topics)) {
                const {domain, topics, bidder} = data.segment;
                const fetchTopicsData = getTopicsData(domain, topics);
                fetchTopicsData && storeInLocalStorage(bidder, fetchTopicsData);
              }
            });
        }
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
