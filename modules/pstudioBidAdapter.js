import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  deepAccess,
  isArray,
  isNumber,
  generateUUID,
  isEmpty,
  isFn,
  isPlainObject,
} from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'pstudio';
const ENDPOINT = 'https://exchange.pstudio.tadex.id/prebid-bid'
const TIME_TO_LIVE = 300;
// in case that the publisher limits number of user syncs, thisse syncs will be discarded from the end of the list
// so more improtant syncing calls should be at the start of the list
const USER_SYNCS = [
  // PARTNER_UID is a partner user id
  {
    type: 'img',
    url: 'https://match.adsrvr.org/track/cmf/generic?ttd_pid=k1on5ig&ttd_tpi=1&ttd_puid=%PARTNER_UID%&dsp=ttd',
    macro: '%PARTNER_UID%',
  },
  {
    type: 'img',
    url: 'https://dsp.myads.telkomsel.com/api/v1/pixel?uid=%USERID%',
    macro: '%USERID%',
  },
];
const COOKIE_NAME = '__tadexid';
const COOKIE_TTL_DAYS = 365;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
const VIDEO_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'protocols',
  'startdelay',
  'placement',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity',
];

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function (bid) {
    const params = bid.params || {};
    return !!params.pubid && !!params.floorPrice && isVideoRequestValid(bid);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map((bid) => ({
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(buildRequestData(bid, bidderRequest)),
      options: {
        contentType: 'application/json',
        withCredentials: true,
      },
    }));
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];

    if (!serverResponse.body.bids) return [];
    const { id } = JSON.parse(bidRequest.data);

    serverResponse.body.bids.map((bid) => {
      const { cpm, width, height, currency, ad, meta } = bid;
      let bidResponse = {
        requestId: id,
        cpm,
        width,
        height,
        creativeId: bid.creative_id,
        currency,
        netRevenue: bid.net_revenue,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: meta.advertiser_domains,
        },
      };

      if (bid.vast_url || bid.vast_xml) {
        bidResponse.vastUrl = bid.vast_url;
        bidResponse.vastXml = bid.vast_xml;
        bidResponse.mediaType = VIDEO;
      } else {
        bidResponse.ad = ad;
      }

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },

  getUserSyncs(_optionsType, _serverResponse, _gdprConsent, _uspConsent) {
    const syncs = [];

    let userId = readUserIdFromCookie(COOKIE_NAME);

    if (!userId) {
      userId = generateId();
      writeIdToCookie(COOKIE_NAME, userId);
    }

    USER_SYNCS.map((userSync) => {
      if (userSync.type === 'img') {
        syncs.push({
          type: 'image',
          url: userSync.url.replace(userSync.macro, userId),
        });
      }
    });

    return syncs;
  },
};

function buildRequestData(bid, bidderRequest) {
  let payloadObject = buildBaseObject(bid, bidderRequest);

  if (bid.mediaTypes.banner) {
    return buildBannerObject(bid, payloadObject);
  } else if (bid.mediaTypes.video) {
    return buildVideoObject(bid, payloadObject);
  }
}

function buildBaseObject(bid, bidderRequest) {
  const firstPartyData = prepareFirstPartyData(bidderRequest.ortb2);
  const { pubid, bcat, badv, bapp } = bid.params;
  const { userId } = bid;
  const uid2Token = userId?.uid2?.id;

  if (uid2Token) {
    if (firstPartyData.user) {
      firstPartyData.user.uid2_token = uid2Token;
    } else {
      firstPartyData.user = { uid2_token: uid2Token };
    }
  }
  const userCookieId = readUserIdFromCookie(COOKIE_NAME);
  if (userCookieId) {
    if (firstPartyData.user) {
      firstPartyData.user.id = userCookieId;
    } else {
      firstPartyData.user = { id: userCookieId };
    }
  }

  return {
    id: bid.bidId,
    pubid,
    floor_price: getBidFloor(bid),
    adtagid: bid.adUnitCode,
    ...(bcat && { bcat }),
    ...(badv && { badv }),
    ...(bapp && { bapp }),
    ...firstPartyData,
  };
}

function buildBannerObject(bid, payloadObject) {
  const { sizes, pos, name } = bid.mediaTypes.banner;

  payloadObject.banner_properties = {
    name,
    sizes,
    pos,
  };

  return payloadObject;
}

function buildVideoObject(bid, payloadObject) {
  const { context, playerSize, w, h } = bid.mediaTypes.video;

  payloadObject.video_properties = {
    context,
    w: w || playerSize[0][0],
    h: h || playerSize[0][1],
  };

  for (const param of VIDEO_PARAMS) {
    const paramValue = deepAccess(bid, `mediaTypes.video.${param}`);

    if (paramValue) {
      payloadObject.video_properties[param] = paramValue;
    }
  }

  return payloadObject;
}

function readUserIdFromCookie(key) {
  try {
    const storedValue = storage.getCookie(key);

    if (storedValue !== null) {
      return storedValue;
    }
  } catch (error) {
  }
}

function generateId() {
  return generateUUID();
}

function daysToMs(days) {
  return days * DAY_IN_MS;
}

function writeIdToCookie(key, value) {
  if (storage.cookiesAreEnabled()) {
    const expires = new Date(
      Date.now() + daysToMs(parseInt(COOKIE_TTL_DAYS))
    ).toUTCString();
    storage.setCookie(key, value, expires, '/');
  }
}

function prepareFirstPartyData({ user, device, site, app, regs }) {
  let userData;
  let deviceData;
  let siteData;
  let appData;
  let regsData;

  if (user) {
    userData = {
      yob: user.yob,
      gender: user.gender,
    };
  }

  if (device) {
    deviceData = {
      ua: device.ua,
      dnt: device.dnt,
      lmt: device.lmt,
      ip: device.ip,
      ipv6: device.ipv6,
      devicetype: device.devicetype,
      make: device.make,
      model: device.model,
      os: device.os,
      osv: device.osv,
      js: device.js,
      language: device.language,
      carrier: device.carrier,
      connectiontype: device.connectiontype,
      ifa: device.ifa,
      ...(device.geo && {
        geo: {
          lat: device.geo.lat,
          lon: device.geo.lon,
          country: device.geo.country,
          region: device.geo.region,
          regionfips104: device.geo.regionfips104,
          metro: device.geo.metro,
          city: device.geo.city,
          zip: device.geo.zip,
          type: device.geo.type,
        },
      }),
      ...(device.ext && {
        ext: {
          ifatype: device.ext.ifatype,
        },
      }),
    };
  }

  if (site) {
    siteData = {
      id: site.id,
      name: site.name,
      domain: site.domain,
      page: site.page,
      cat: site.cat,
      sectioncat: site.sectioncat,
      pagecat: site.pagecat,
      ref: site.ref,
      ...(site.publisher && {
        publisher: {
          name: site.publisher.name,
          cat: site.publisher.cat,
          domain: site.publisher.domain,
        },
      }),
      ...(site.content && {
        content: {
          id: site.content.id,
          episode: site.content.episode,
          title: site.content.title,
          series: site.content.series,
          artist: site.content.artist,
          genre: site.content.genre,
          album: site.content.album,
          isrc: site.content.isrc,
          season: site.content.season,
        },
      }),
      mobile: site.mobile,
    };
  }

  if (app) {
    appData = {
      id: app.id,
      name: app.name,
      bundle: app.bundle,
      domain: app.domain,
      storeurl: app.storeurl,
      cat: app.cat,
      sectioncat: app.sectioncat,
      pagecat: app.pagecat,
      ver: app.ver,
      privacypolicy: app.privacypolicy,
      paid: app.paid,
      ...(app.publisher && {
        publisher: {
          name: app.publisher.name,
          cat: app.publisher.cat,
          domain: app.publisher.domain,
        },
      }),
      keywords: app.keywords,
      ...(app.content && {
        content: {
          id: app.content.id,
          episode: app.content.episode,
          title: app.content.title,
          series: app.content.series,
          artist: app.content.artist,
          genre: app.content.genre,
          album: app.content.album,
          isrc: app.content.isrc,
          season: app.content.season,
        },
      }),
    };
  }

  if (regs) {
    regsData = { coppa: regs.coppa };
  }

  return cleanObject({
    user: userData,
    device: deviceData,
    site: siteData,
    app: appData,
    regs: regsData,
  });
}

function cleanObject(data) {
  for (let key in data) {
    if (typeof data[key] == 'object') {
      cleanObject(data[key]);

      if (isEmpty(data[key])) delete data[key];
    }

    if (data[key] === undefined) delete data[key];
  }

  return data;
}

function isVideoRequestValid(bidRequest) {
  if (bidRequest.mediaTypes.video) {
    const { w, h, playerSize, mimes, protocols } = deepAccess(
      bidRequest,
      'mediaTypes.video',
      {}
    );

    const areSizesValid =
      (isNumber(w) && isNumber(h)) || validateSizes(playerSize);
    const areMimesValid = isArray(mimes) && mimes.length > 0;
    const areProtocolsValid =
      isArray(protocols) && protocols.length > 0 && protocols.every(isNumber);

    return areSizesValid && areMimesValid && areProtocolsValid;
  }

  return true;
}

function validateSizes(sizes) {
  return (
    isArray(sizes) &&
    sizes.length > 0 &&
    sizes.every(
      (size) => isArray(size) && size.length === 2 && size.every(isNumber)
    )
  );
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return bid.params.floorPrice ? bid.params.floorPrice : null;
  }

  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*',
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

registerBidder(spec);
