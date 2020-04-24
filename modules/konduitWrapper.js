import { registerVideoSupport } from '../src/adServerManager.js';
import { targeting } from '../src/targeting.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';

const MODULE_NAME = 'Konduit';

function addLogLabel(args) {
  args = [].slice.call(args);
  args.unshift(`${MODULE_NAME}: `);
  return args;
}

export function logInfo() {
  utils.logInfo(...addLogLabel(arguments));
}

export function logError() {
  utils.logError(...addLogLabel(arguments));
}

export function buildVastUrl(options) {
  if (!options.params || !options.params.konduit_id) {
    logError(`'konduit_id' parameter is required for $$PREBID_GLOBAL$$.adServers.konduit.buildVastUrl function`);

    return null;
  }

  const bid = options.bid || targeting.getWinningBids()[0];

  if (!bid) {
    logError('Bid is not provided or not found');

    return null;
  }

  logInfo('The following bid will be wrapped: ', bid);

  const queryParams = {};

  const vastUrl = obtainVastUrl(bid);

  if (vastUrl) {
    queryParams.konduit_id = options.params.konduit_id;
    queryParams.konduit_header_bidding = 1;
    queryParams.konduit_url = vastUrl;
  } else {
    logError('No VAST url found in the bid');
  }

  let resultingUrl = null;

  if (queryParams.konduit_url) {
    resultingUrl = utils.buildUrl({
      protocol: 'https',
      host: 'p.konduit.me',
      pathname: '/api/vastProxy',
      search: queryParams
    });

    logInfo(`Konduit wrapped VAST url: ${resultingUrl}`);
  }

  return resultingUrl;
}

function obtainVastUrl(bid) {
  const vastUrl = bid && bid.vastUrl;

  if (vastUrl) {
    logInfo(`VAST url found in the bid - ${vastUrl}`);

    return encodeURIComponent(vastUrl);
  }

  const cacheUrl = config.getConfig('cache.url');
  if (cacheUrl) {
    const composedCacheUrl = `${cacheUrl}?uuid=${bid.videoCacheKey}`;

    logInfo(`VAST url is taken from cache.url: ${composedCacheUrl}`);

    return encodeURIComponent(composedCacheUrl);
  }
}

registerVideoSupport('konduit', {
  buildVastUrl: buildVastUrl,
});
