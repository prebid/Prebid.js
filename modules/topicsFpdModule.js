import { logWarn } from '../src/utils.js';
import { submodule } from '../src/hook.js';

const WARNING = 'The Topics API has been removed from Chrome; topicsFpdModule is now a no-op.';
export const topicStorageName = 'prebid:topics';
export const lastUpdated = 'lastUpdated';

let warned = false;

function warn() {
  if (!warned) {
    logWarn(WARNING);
    warned = true;
  }
}

export function reset() {
  warned = false;
}

export function getTopicsData() {
  warn();
  return [];
}

export function getTopics() {
  warn();
  return Promise.resolve([]);
}

export function processFpd(config, { global }) {
  warn();
  return Promise.resolve({ global });
}

export function getCachedTopics() {
  warn();
  return [];
}

export function receiveMessage() {
  warn();
}

export function storeInLocalStorage() {
  warn();
}

export function loadTopicsForBidders() {
  warn();
}

submodule('firstPartyData', {
  name: 'topics',
  queue: 1,
  processFpd
});
