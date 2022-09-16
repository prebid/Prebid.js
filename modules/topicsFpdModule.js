import {logError, logWarn, mergeDeep, isEmpty, safeJSONParse} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {submodule} from '../src/hook.js';
import {GreedyPromise} from '../src/utils/promise.js';
import {config} from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

export const storage = getStorageManager();
export const topicStorageName = 'prebid:topics';

const iframeLoadedURL = [];
const TAXONOMIES = {
  // map from topic taxonomyVersion to IAB segment taxonomy
  '1': 600
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
  loadTopicsForBidders();
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
function getCachedTopics() {
  let cachedTopicData = [];
  const topics = config.getConfig('userSync.topics');
  const bidderList = Object.keys(topics.bidders || []);
  new Map(safeJSONParse(storage.getDataFromLocalStorage(topicStorageName))).forEach((value, key) => {
    let bidder = `${key}`.split(':')[0];
    // Check bidder exist in config for cached bidder data and then only retrieve the cached data
    if (bidderList.includes(bidder)) {
      cachedTopicData.push(value);
    }
  });
  return cachedTopicData;
}

/**
 * Recieve messages from iframe loaded for bidders to fetch topic
 * @param {MessageEvent} evt
 */
function receiveMessage(evt) {
  if (evt && evt.data) {
    try {
      let data = safeJSONParse(evt.data);
      if (getLoadedIframeURL().includes(evt.origin) && data && data.segment && !isEmpty(data.segment.topics)) {
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
  const storedSegments = new Map(safeJSONParse(storage.getDataFromLocalStorage(topicStorageName)));
  storedSegments.set(`${bidder}:${topics.ext.segclass}`, topics);
  storage.setDataInLocalStorage(topicStorageName, JSON.stringify([...storedSegments]));
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
function loadTopicsForBidders() {
  const topics = config.getConfig('userSync.topics');
  if (topics) {
    listenMessagesFromTopicIframe();
    const bidders = Object.keys(topics.bidders || []);
    bidders && bidders.forEach((bidder) => {
      const iframeURL = `${topics['bidders'][bidder]['iframeURL']}`;
      let ifrm = document.createElement('iframe');
      ifrm.name = `ifrm_${bidder}`;
      ifrm.src = `${iframeURL}?bidder=${bidder}`;
      ifrm.style.display = 'none';
      setLoadedIframeURL(new URL(iframeURL).origin);
      window.document.documentElement.appendChild(ifrm);
    });
  } else {
    logWarn(`Topics config not defined under userSync Object`);
  }
}

submodule('firstPartyData', {
  name: 'topics',
  queue: 1,
  processFpd
});
