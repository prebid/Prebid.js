import {logError, logWarn, mergeDeep} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {submodule} from '../src/hook.js';
import {GreedyPromise} from '../src/utils/promise.js';

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

const topicsData = getTopics().then((topics) => getTopicsData(getRefererInfo().domain, topics));

export function processFpd(config, {global}, {data = topicsData} = {}) {
  return data.then((data) => {
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

submodule('firstPartyData', {
  name: 'topics',
  queue: 1,
  processFpd
});
