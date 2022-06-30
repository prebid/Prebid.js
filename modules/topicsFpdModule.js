import {logError, mergeDeep} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {submodule} from '../src/hook.js';

export function getTopicsData(name, topics) {
  const data = Object.entries(
    topics.reduce((byTaxVersion, topic) => {
      const taxv = topic.taxonomyVersion;
      if (!byTaxVersion.hasOwnProperty(taxv)) byTaxVersion[taxv] = [];
      byTaxVersion[taxv].push(topic.topic);
      return byTaxVersion;
    }, {})
  ).map(([taxv, topics]) => ({
    ext: {
      segtax: 600,
      segclass: taxv
    },
    segment: topics.map((topic) => ({id: topic.toString()}))
  }));
  if (name != null) {
    data.forEach((datum) => {
      datum.name = name;
    });
  }
  return data;
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
