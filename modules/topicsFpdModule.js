import {logError, mergeDeep} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {submodule} from '../src/hook.js';

export const TOPICS_TAXONOMY = 600;

export function getTopicsData(name, topics) {
  return Object.entries(
    topics.reduce((byTaxVersion, topic) => {
      const taxv = topic.taxonomyVersion;
      if (!byTaxVersion.hasOwnProperty(taxv)) byTaxVersion[taxv] = [];
      byTaxVersion[taxv].push(topic.topic);
      return byTaxVersion;
    }, {})
  ).map(([taxv, topics]) => {
    const datum = {
      ext: {
        segtax: TOPICS_TAXONOMY,
        segclass: taxv
      },
      segment: topics.map((topic) => ({id: topic.toString()}))
    };
    if (name != null) {
      datum.name = name;
    }
    return datum;
  });
}

export function getTopics(doc = document) {
  let topics = null;
  try {
    if ('browsingTopics' in doc && doc.featurePolicy.allowsFeature('browsing-topics')) {
      topics = doc.browsingTopics();
    }
  } catch (e) {
    logError('Could not call topics API', e);
  }
  if (topics == null) {
    // TODO: convert this to GreedyPromise once #8626 gets merged
    topics = Promise.resolve([]);
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
