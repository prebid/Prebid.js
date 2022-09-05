import {logError, logWarn, mergeDeep} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {submodule} from '../src/hook.js';
import {GreedyPromise} from '../src/utils/promise.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {config} from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

export const storage = getStorageManager();
export const initialTopicName = 'tps_';

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

// function to fetch the cached topic data from storage for bidders and return it
export function getTpsForBidderFromStorage() {
  let cachedTopicData = [];
  const topics = config.getConfig('userSync.topics');
  let biddersList = Object.keys(topics.bidders || []);
  Object.keys(window.localStorage).forEach((storeItem) => {
    // Get Storage Item starting only with tps_.
    if (storeItem.startsWith(initialTopicName)) {
    // Check bidder exist in config for cached bidder data and if not delete it since it is stale cached data
      if (biddersList.includes(storeItem.slice(initialTopicName.length))) {
        let segmentData = JSON.parse(storage.getDataFromLocalStorage(storeItem));
        segmentData.forEach(segment => cachedTopicData.push(segment));
      } else {
        storage.removeDataFromLocalStorage(storeItem)
      }
    }
  })
  return cachedTopicData;
}

const topicsData = getTopics().then((topics) => getTopicsData(getRefererInfo().domain, topics));

export function processFpd(config, {global}, {data = topicsData} = {}) {
  return data.then((data) => {
    data = [].concat(data, getTpsForBidderFromStorage()); // Add cached data in FPD data.
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

// Added function addListenerToFetchTopics to listen for topic data retured from iframe loaded for SSPs(bidder)
function addListenerToFetchTopics() {
  window.addEventListener('message', (e) => {
    if (e && e.data) {
      try {
        let data = JSON.parse(e.data);
        if (data?.segment?.topics) {
          let {domain, topics, bidder} = data.segment;
          let segmentData = getTopicsData(domain, topics);
          let updateStore = [];
          let bidderFoundInStore = false;
          let storedSegments = JSON.parse(storage.getDataFromLocalStorage(`${initialTopicName}${bidder}`));
          storedSegments?.forEach((segment) => {
            if (segment.name === segmentData[0].name && segment.ext.segclass == segmentData[0].ext.segclass) {
              updateStore.push(segmentData[0]);
              bidderFoundInStore = true;
            } else {
              updateStore.push(segment);
            };
          });
          !bidderFoundInStore && updateStore.push(segmentData[0]);
          storage.setDataInLocalStorage(`${initialTopicName}${bidder}`, JSON.stringify(updateStore));
        }
      } catch (err) { }
    }
  });
}

function loadTopicsForBidders() {
  addListenerToFetchTopics();
  const topics = config.getConfig('userSync.topics');
  if (topics) {
    const bidders = Object.keys(topics.bidders || []);
    bidders?.forEach((bidder) => {
      let ifrm = document.createElement('iframe');
      ifrm.name = `ifrm_${bidder}`;
      ifrm.src = `${topics['bidders'][bidder]['iframeURL']}?bidder=${bidder}`;
      ifrm.style.display = 'none';
      window.document.documentElement.appendChild(ifrm);
    });
  } else {
    logWarn(`Topics config not defined under userSync Object`);
  }
}

// Exposing loadTopicsForBidders function in global-name-space so that API calling from domain can get the data and send it in oRTB format.
(getGlobal()).loadTopicsForBidders = loadTopicsForBidders;

submodule('firstPartyData', {
  name: 'topics',
  queue: 1,
  processFpd
});
