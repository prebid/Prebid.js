import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { generateUUID, isFn, isPlainObject, getWinDimensions } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';

export const BIDDER_CODE = 'hypelab';
export const ENDPOINT_URL = 'https://api.hypelab.com';

export const REQUEST_ROUTE = '/v1/prebid_requests';
export const EVENT_ROUTE = '/v1/events';
export const REPORTING_ROUTE = '';

const PREBID_VERSION = '$prebid.version$';
const PROVIDER_NAME = 'prebid';
const PROVIDER_VERSION = '0.0.3';

const url = (route) => ENDPOINT_URL + route;

export function mediaSize(data) {
  if (!data || !data.creative_set) return { width: 0, height: 0 };
  const media = data.creative_set.video || data.creative_set.image || {};
  return { width: media.width, height: media.height };
}

function isBidRequestValid(bidderRequest) {
  return (
    !!bidderRequest.params?.property_slug &&
    !!bidderRequest.params?.placement_slug
  );
}

function buildRequests(validBidRequests, bidderRequest) {
  const result = validBidRequests.map((request) => {
    const uids = (request.userIdAsEids || []).reduce((a, c) => {
      const ids = c.uids.map((uid) => uid.id);
      return [...a, ...ids];
    }, []);

    const uuid = uids[0] ? uids[0] : generateTemporaryUUID();
    const floor = getBidFloor(request, request.sizes || []);
    const dpr = typeof window != 'undefined' ? window.devicePixelRatio : 1;
    const wp = getWalletPresence();
    const wpfs = getWalletProviderFlags();
    const winDimensions = getWinDimensions();
    const vp = [
      Math.max(
        winDimensions?.document.documentElement.clientWidth || 0,
        winDimensions?.innerWidth || 0
      ),
      Math.max(
        winDimensions?.document.documentElement.clientHeight || 0,
        winDimensions?.innerHeight || 0
      ),
    ];
    const pp = getPosition(request.adUnitCode);

    const payload = {
      property_slug: request.params.property_slug,
      placement_slug: request.params.placement_slug,
      provider_version: PROVIDER_VERSION,
      provider_name: PROVIDER_NAME,
      location:
        bidderRequest.refererInfo?.page || typeof window != 'undefined'
          ? window.location.href
          : '',
      sdk_version: PREBID_VERSION,
      sizes: request.sizes,
      wids: [],
      floor,
      dpr,
      uuid,
      bidRequestsCount: request.bidRequestsCount,
      bidderRequestsCount: request.bidderRequestsCount,
      bidderWinsCount: request.bidderWinsCount,
      wp,
      wpfs,
      vp,
      pp,
    };

    return {
      method: 'POST',
      url: url(REQUEST_ROUTE),
      options: { contentType: 'application/json', withCredentials: true },
      data: payload,
      bidId: request.bidId,
    };
  });

  return result;
}

function generateTemporaryUUID() {
  return 'tmp_' + generateUUID();
}

function getBidFloor(bid, sizes) {
  if (!isFn(bid.getFloor)) {
    return bid.params.bidFloor ? bid.params.bidFloor : null;
  }

  let floor;

  let floorInfo = bid.getFloor({
    currency: 'USD',
    mediaType: 'banner',
    size: sizes.length === 1 ? sizes[0] : '*',
  });

  if (
    isPlainObject(floorInfo) &&
    floorInfo.currency === 'USD' &&
    !isNaN(parseFloat(floorInfo.floor))
  ) {
    floor = parseFloat(floorInfo.floor);
  }

  return floor;
}

function getPosition(id) {
  const element = document.getElementById(id);
  if (!element) return null;
  const rect = getBoundingClientRect(element);
  return [rect.left, rect.top];
}

function getWalletPresence() {
  return {
    ada: typeof window != 'undefined' && !!window.cardano,
    bnb: typeof window != 'undefined' && !!window.BinanceChain,
    eth: typeof window != 'undefined' && !!window.ethereum,
    sol: typeof window != 'undefined' && !!window.solana,
    tron: typeof window != 'undefined' && !!window.tron,
  };
}

function getWalletProviderFlags() {
  let ada, bnb, eth, sol, tron;

  try {
    ada = getAdaWalletProviderFlags();
  } catch (e) {
    ada = [];
  }
  try {
    bnb = getBnbWalletProviderFlags();
  } catch (e) {
    bnb = [];
  }
  try {
    eth = getEthWalletProviderFlags();
  } catch (e) {
    eth = [];
  }
  try {
    sol = getSolWalletProviderFlags();
  } catch (e) {
    sol = [];
  }

  try {
    tron = getTronWalletProviderFlags();
  } catch (e) {
    tron = [];
  }

  return {
    ada,
    bnb,
    eth,
    sol,
    tron,
  };
}

function getAdaWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.cardano) {
    const allWalletProviderFlags = [
      'eternl',
      'yoroi',
      'nufi',
      'flint',
      'exodus',
      'lace',
      'nami',
      'gerowallet',
      'typhon',
      'begin',
    ];
    for (const flag of allWalletProviderFlags) {
      if (window.cardano[flag]) flags.push(flag);
    }
  }
  return flags;
}

function getBnbWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.BinanceChain) {
    const allWalletProviderFlags = [
      'isTrustWallet',
      'isCoin98',
      'isKaiWallet',
      'isMetaMask',
      'isNifyWallet',
    ];
    for (const flag of allWalletProviderFlags) {
      if (window.BinanceChain[flag]) flags.push(flag);
    }
    // Coin98 adds additional flags
    if (flags.includes('isCoin98') && flags.includes('isKaiWallet')) {
      flags.splice(flags.indexOf('isKaiWallet'), 1);
    }
    if (flags.includes('isCoin98') && flags.includes('isNifyWallet')) {
      flags.splice(flags.indexOf('isNifyWallet'), 1);
    }
    if (flags.includes('isCoin98') && flags.includes('isMetaMask')) {
      flags.splice(flags.indexOf('isMetaMask'), 1);
    }
  }
  return flags;
}

function getEthWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.ethereum) {
    const allWalletProviderFlags = [
      'isApexWallet',
      'isAvalanche',
      'isBackpack',
      'isBifrost',
      'isBitKeep',
      'isBitski',
      'isBlockWallet',
      'isBraveWallet',
      'isCoinbaseWallet',
      'isDawn',
      'isEnkrypt',
      'isExodus',
      'isFrame',
      'isFrontier',
      'isGamestop',
      'isHyperPay',
      'isImToken',
      'isKuCoinWallet',
      'isMathWallet',
      'isMetaMask',
      'isOkxWallet',
      'isOKExWallet',
      'isOneInchAndroidWallet',
      'isOneInchIOSWallet',
      'isOpera',
      'isPhantom',
      'isPortal',
      'isRabby',
      'isRainbow',
      'isStatus',
      'isTally',
      'isTokenPocket',
      'isTokenary',
      'isTrust',
      'isTrustWallet',
      'isXDEFI',
      'isZerion',
    ];
    for (const flag of allWalletProviderFlags) {
      if (window.ethereum[flag]) flags.push(flag);
    }
    // Filter MetaMask lookalikes
    if (
      flags.includes('isMetaMask') &&
      [
        'isApexWallet',
        'isAvalanche',
        'isBitKeep',
        'isBlockWallet',
        'isKuCoinWallet',
        'isMathWallet',
        'isOKExWallet',
        'isOkxWallet',
        'isOneInchAndroidWallet',
        'isOneInchIOSWallet',
        'isOpera',
        'isPhantom',
        'isPortal',
        'isRabby',
        'isTokenPocket',
        'isTokenary',
        'isZerion',
      ].some((f) => flags.includes(f))
    ) {
      flags.splice(flags.indexOf('isMetaMask'), 1);
    }
  }
  return flags;
}

function getSolWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.solana) {
    const allWalletProviderFlags = ['isPhantom', 'isNufi'];
    for (const flag of allWalletProviderFlags) {
      if (window.solana[flag]) flags.push(flag);
    }
    if (flags.includes('isNufi') && flags.includes('isPhantom')) {
      flags.splice(flags.indexOf('isPhantom'), 1);
    }
  }
  if (window.solflare) flags.push('isSolflare');
  if (window.backpack) flags.push('isBackpack');
  return flags;
}

function getTronWalletProviderFlags() {
  const flags = [];
  if (typeof window === 'undefined') return flags;
  if (window.tron) {
    const allWalletProviderFlags = ['isTronLink'];
    for (const flag of allWalletProviderFlags) {
      if (window.tron[flag]) flags.push(flag);
    }
  }
  return flags;
}

function interpretResponse(serverResponse, bidRequest) {
  const { data } = serverResponse.body;

  if (!data.cpm || !data.html) return [];

  const size = mediaSize(data);

  const result = {
    requestId: bidRequest.bidId,
    cpm: data.cpm,
    width: size.width,
    height: size.height,
    creativeId: data.creative_set_slug,
    currency: data.currency,
    netRevenue: true,
    referrer: bidRequest.data.location,
    ttl: data.ttl,
    ad: data.html,
    mediaType: serverResponse.body.data.media_type,
    meta: {
      advertiserDomains: data.advertiser_domains || [],
    },
  };

  return [result];
}

export function report(eventType, data, route = REPORTING_ROUTE) {
  if (!route) return;

  const options = {
    method: 'POST',
    contentType: 'application/json',
    withCredentials: true,
  };

  const request = { type: eventType, data };
  ajax(url(route), null, request, options);
}

function onTimeout(timeoutData) {
  this.report('timeout', timeoutData);
}

function onBidWon(bid) {
  this.report('bidWon', bid);
}

function onSetTargeting(bid) {
  this.report('setTargeting', bid);
}

function onBidderError(errorData) {
  this.report('bidderError', errorData);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: ['hype'],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onTimeout,
  onBidWon,
  onSetTargeting,
  onBidderError,
  report,
  REPORTING_ROUTE: 'a',
};

registerBidder(spec);
