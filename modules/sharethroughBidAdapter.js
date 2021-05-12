import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';

const VERSION = '3.3.2';
const BIDDER_CODE = 'sharethrough';
const STR_ENDPOINT = 'https://btlr.sharethrough.com/WYu2BXv1/v1';
const DEFAULT_SIZE = [1, 1];

// this allows stubbing of utility function that is used internally by the sharethrough adapter
export const sharethroughInternal = {
  b64EncodeUnicode,
  handleIframe,
  isLockedInFrame,
  getProtocol
};

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,

  isBidRequestValid: bid => !!bid.params.pkey && bid.bidder === BIDDER_CODE,

  buildRequests: (bidRequests, bidderRequest) => {
    const timeout = config.getConfig('bidderTimeout');

    const nonHttp = sharethroughInternal.getProtocol().indexOf('http') < 0;
    const secure = nonHttp || (sharethroughInternal.getProtocol().indexOf('https') > -1);

    const req = {
      id: utils.generateUUID(),
      cur: ['USD'],
      tmax: timeout,
      user: {
        ext: {
          eids: handleUniversalIds(bidRequests[0], [
            { attr: 'userId.idl_env', source: 'liveramp.com' },
            { attr: 'userId.id5id.uid', source: 'id5-sync.com' },
            { attr: 'userId.pubcid', source: 'pubcid.org' },
            { attr: 'userId.tdid', source: 'adserver.org' },
            { attr: 'userId.criteoId', source: 'criteo.com' },
            { attr: 'userId.britepoolid', source: 'britepool.com' },
            { attr: 'userId.lipb.lipbid', source: 'liveintent.com' },
            { attr: 'userId.intentiqid', source: 'intentiq.com' },
            { attr: 'userId.lotamePanoramaId', source: 'lotame.com' },
            { attr: 'userId.parrableId', source: 'parrable.com' },
            { attr: 'userId.netId', source: 'netid.de' },
            { attr: 'userId.sharedid', source: 'sharedid.org' },
          ])
        }
      },
      regs: {
        coppa: config.getConfig('coppa') === true ? 1 : 0,
        ext: {},
      },
      source: {
        ext: {
          schain: bidRequest[0].schain
        }
      },
      bcat: bidRequests[0].params.bcat || [],
      badv: bidRequests[0].params.badv || [],
    };

    if (bidderRequest.gdprConsent) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies === true;
      req.regs.ext.gdpr = gdprApplies ? 1 : 0;
      if (gdprApplies) {
        req.user.ext.consent = bidderRequest.gdprConsent.consentString;
      }
    }

    if (bidderRequest.uspConsent) {
      req.regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    const imps = bidRequests.map(bidReq => {
      let impression;

      if (bidReq.mediaTypes && bidReq.mediaTypes.video) {
        impression = {
          video: {
            topframe: utils.inIframe() ? 0 : 1,
            skip: bidReq.mediaTypes.video.skip || 0,
            linearity: bidReq.mediaTypes.video.linearity || 1,
            minduration: bidReq.mediaTypes.video.minduration || 5,
            maxduration: bidReq.mediaTypes.video.maxduration || 60,
            playbackmethod: bidReq.mediaTypes.video.playbackmethod || [2],
            api: getVideoApi(bidReq.mediaTypes.video),
            mimes: bidReq.mediaTypes.video.mimes || ['video/mp4'],
            protocols: getVideoProtocols(bidReq.mediaTypes.video),
            h: bidReq.mediaTypes.video.playerSize[0][1],
            w: bidReq.mediaTypes.video.playerSize[0][0]
          }
        };
      } else {
        impression = {
          banner: {
            topframe: utils.inIframe() ? 0 : 1,
            format: cleanSizes(bidReq.sizes)
          }
        };
      }

      // obj.tagid = String(bidReq.params.dmxid || bidReq.adUnitCode);
      return {
        id: bidReq.bidId,
        secure: secure ? 1 : 0,
        bidfloor: getFloor(bidReq),
        ...impression
      };
    });

    return {
      method: 'POST',
      url: STR_ENDPOINT,
      data: {
        ...req,
        imp: imps
      },
      bidderRequest
    };










    // ----------------------------------
    // OLD VERSION



    return bidRequests.map(bidRequest => {
      let query = {
        placement_key: bidRequest.params.pkey,
        bidId: bidRequest.bidId,
        consent_required: false,
        instant_play_capable: canAutoPlayHTML5Video(),
        hbSource: 'prebid',
        hbVersion: '$prebid.version$',
        strVersion: VERSION
      };

      Object.assign(query, handleUniversalIds(bidRequest));

      const nonHttp = sharethroughInternal.getProtocol().indexOf('http') < 0;
      query.secure = nonHttp || (sharethroughInternal.getProtocol().indexOf('https') > -1);

      if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) {
        query.consent_string = bidderRequest.gdprConsent.consentString;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        query.consent_required = !!bidderRequest.gdprConsent.gdprApplies;
      }

      if (bidderRequest && bidderRequest.uspConsent) {
        query.us_privacy = bidderRequest.uspConsent
      }

      if (config.getConfig('coppa') === true) {
        query.coppa = true
      }

      if (bidRequest.schain) {
        query.schain = JSON.stringify(bidRequest.schain);
      }

      if (bidRequest.bidfloor) {
        query.bidfloor = parseFloat(bidRequest.bidfloor);
      }

      if (bidRequest.params.badv) {
        query.badv = bidRequest.params.badv;
      }

      if (bidRequest.params.bcat) {
        query.bcat = bidRequest.params.bcat;
      }

      // Data that does not need to go to the server,
      // but we need as part of interpretResponse()
      const strData = {
        skipIframeBusting: bidRequest.params.iframe,
        iframeSize: bidRequest.params.iframeSize,
        sizes: bidRequest.sizes
      };

      return {
        method: 'POST',
        url: STR_ENDPOINT,
        data: query,
        strData: strData
      };
    })
  },

  interpretResponse: ({ body }, req) => {
    if (!body || !body.seatbid || body.seatbid.length === 0) {
      return [];
    }

    let size = DEFAULT_SIZE;
    if (req.params.iframeSize || req.params.sizes.length) {
      size = req.params.iframeSize
        ? req.params.iframeSize
        : getLargestSize(req.params.sizes);
    }

    const seatbid = body.seatbid[0];
    return [{
      requestId: seatbid.impid,
      width: size[0],
      height: size[1],
      cpm: +seatbid.price,
      creativeId: seatbid.crid,
      dealId: seatbid.dealid,
      currency: 'USD',
      netRevenue: true,
      ttl: 360,
      ad: generateAd(body, req) // body here is not a butler response anymore, need to get a butler formatted response from the iab response
    }];
  },

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    const syncParams = uspConsent ? `&us_privacy=${uspConsent}` : '';
    const syncs = [];
    const shouldCookieSync = syncOptions.pixelEnabled &&
      serverResponses.length > 0 &&
      serverResponses[0].body &&
      serverResponses[0].body.cookieSyncUrls;

    if (shouldCookieSync) {
      serverResponses[0].body.cookieSyncUrls.forEach(url => {
        syncs.push({ type: 'image', url: url + syncParams });
      });
    }

    return syncs;
  },

  // Empty implementation for prebid core to be able to find it
  onTimeout: (data) => {},

  // Empty implementation for prebid core to be able to find it
  onBidWon: (bid) => {},

  // Empty implementation for prebid core to be able to find it
  onSetTargeting: (bid) => {}
};

function getVideoApi({ api }) {
  let defaultValue = [2];
  if (api && Array.isArray(api) && api.length > 0) {
    return api
  } else {
    return defaultValue;
  }
}

function getVideoProtocols({ protocols }) {
  let defaultValue = [2, 3, 5, 6, 7, 8];
  if (protocols && Array.isArray(protocols) && protocols.length > 0) {
    return protocols;
  } else {
    return defaultValue;
  }
}

function cleanSizes(sizes) {
  const supported = {
    160: {
      600: true,
    },
    300: {
      50: true,
      250: true,
      340: true,
      600: true,
    },
    320: {
      50: true,
      100: true,
      480: true,
    },
    336: {
      280: true,
    },
    400: {
      225: true,
      300: true,
    },
    480: {
      320: true,
    },
    640: {
      360: true,
      390: true,
    },
    660: {
      371: true,
    },
    728: {
      90: true,
    },
    854: {
      480: true,
    },
    970: {
      250: true,
    }
  }

  return sizes
    .map(size => ({ w: +size[0], h: +size[1] }))
    .filter(size => supported[size.w] && supported[size.w][size.h]);
}

function getFloor(bid) {
  let floor = null;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: bid.mediaTypes.video ? 'video' : 'banner',
      size: bid.sizes.map(size => ({ w: size[0], h: size[1] }))
    });
    if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor !== null ? floor : bid.params.floor;
}

function shuffle(sizes, list) {
  let removeSizes = sizes.filter(size => {
    return list.map(l => `${l.size[0]}x${l.size[1]}`).indexOf(`${size[0]}x${size[1]}`) === -1
  })
  let reOrder = sizes.reduce((results, current) => {
    if (results.length === 0) {
      results.push(current);
      return results;
    }
    results.push(current);
    results = list.filter(l => results.map(r => `${r[0]}x${r[1]}`).indexOf(`${l.size[0]}x${l.size[1]}`) !== -1);
    results = results.sort(function (a, b) {
      return b.s - a.s;
    })
    return results.map(r => r.size);
  }, [])
  return removeDuplicate([...reOrder, ...removeSizes]);
}

function removeDuplicate(values) {
  return values.filter((elem, index) => {
    return values.map(e => `${e[0]}x${e[1]}`).indexOf(`${elem[0]}x${elem[1]}`) === index
  })
}

function handleUniversalIds(bidRequest, uids) {
  return uids.map((uid) => ({
    source: uid.source,
    uids: [{ id: utils.deepAccess(bidRequest, uid.attr), atype: 1 }]
  }))





  // if (!bidRequest.userId) return {};
  //
  // const universalIds = {};
  //
  // const ttd = utils.deepAccess(bidRequest, 'userId.tdid');
  // if (ttd) universalIds.ttduid = ttd;
  //
  // const pubc = utils.deepAccess(bidRequest, 'userId.pubcid') || utils.deepAccess(bidRequest, 'crumbs.pubcid');
  // if (pubc) universalIds.pubcid = pubc;
  //
  // const idl = utils.deepAccess(bidRequest, 'userId.idl_env');
  // if (idl) universalIds.idluid = idl;
  //
  // const id5 = utils.deepAccess(bidRequest, 'userId.id5id.uid');
  // if (id5) {
  //   universalIds.id5uid = { id: id5 };
  //   const id5link = utils.deepAccess(bidRequest, 'userId.id5id.ext.linkType');
  //   if (id5link) universalIds.id5uid.linkType = id5link;
  // }
  //
  // const lipb = utils.deepAccess(bidRequest, 'userId.lipb.lipbid');
  // if (lipb) universalIds.liuid = lipb;
  //
  // const shd = utils.deepAccess(bidRequest, 'userId.sharedid');
  // if (shd) universalIds.shduid = shd; // object with keys: id & third
  //
  // return universalIds;
}

function getLargestSize(sizes) {
  function area(size) {
    return size[0] * size[1];
  }

  return sizes.reduce((prev, current) => {
    if (area(current) > area(prev)) {
      return current
    } else {
      return prev
    }
  });
}

function generateAd(body, req) {
  const strRespId = `str_response_${req.data.bidId}`;

  let adMarkup = `
    <div data-str-native-key="${req.data.placement_key}" data-stx-response-name="${strRespId}">
    </div>
    <script>var ${strRespId} = "${b64EncodeUnicode(JSON.stringify(body))}"</script>
  `;

  if (req.strData.skipIframeBusting) {
    // Don't break out of iframe
    adMarkup = adMarkup + `<script src="https://native.sharethrough.com/assets/sfp.js"></script>`;
  } else {
    // Add logic to the markup that detects whether or not in top level document is accessible
    // this logic will deploy sfp.js and/or iframe buster script(s) as appropriate
    adMarkup = adMarkup + `
      <script>
        (${sharethroughInternal.isLockedInFrame.toString()})()
      </script>
      <script>
        (${sharethroughInternal.handleIframe.toString()})()
      </script>`;
  }

  return adMarkup;
}

function handleIframe () {
  // only load iframe buster JS if we can access the top level document
  // if we are 'locked in' to this frame then no point trying to bust out: we may as well render in the frame instead
  var iframeBusterLoaded = false;
  if (!window.lockedInFrame) {
    var sfpIframeBusterJs = document.createElement('script');
    sfpIframeBusterJs.src = 'https://native.sharethrough.com/assets/sfp-set-targeting.js';
    sfpIframeBusterJs.type = 'text/javascript';
    try {
      window.document.getElementsByTagName('body')[0].appendChild(sfpIframeBusterJs);
      iframeBusterLoaded = true;
    } catch (e) {
      utils.logError('Trouble writing frame buster script, error details:', e);
    }
  }

  var clientJsLoaded = (!iframeBusterLoaded) ? !!(window.STR && window.STR.Tag) : !!(window.top.STR && window.top.STR.Tag);
  if (!clientJsLoaded) {
    var sfpJs = document.createElement('script');
    sfpJs.src = 'https://native.sharethrough.com/assets/sfp.js';
    sfpJs.type = 'text/javascript';

    // only add sfp js to window.top if iframe busting successfully loaded; otherwise, add to iframe
    try {
      if (iframeBusterLoaded) {
        window.top.document.getElementsByTagName('body')[0].appendChild(sfpJs);
      } else {
        window.document.getElementsByTagName('body')[0].appendChild(sfpJs);
      }
    } catch (e) {
      utils.logError('Trouble writing sfp script, error details:', e);
    }
  }
}

// determines if we are capable of busting out of the iframe we are in
// if we catch a DOMException when trying to access top-level document, it means we're stuck in the frame we're in
function isLockedInFrame () {
  window.lockedInFrame = false;
  try {
    window.lockedInFrame = !window.top.document;
  } catch (e) {
    window.lockedInFrame = (e instanceof DOMException);
  }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
function b64EncodeUnicode(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1);
      }));
}

function canAutoPlayHTML5Video() {
  const userAgent = navigator.userAgent;
  if (!userAgent) return false;

  const isAndroid = /Android/i.test(userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(userAgent);
  const chromeVersion = parseInt((/Chrome\/([0-9]+)/.exec(userAgent) || [0, 0])[1]);
  const chromeiOSVersion = parseInt((/CriOS\/([0-9]+)/.exec(userAgent) || [0, 0])[1]);
  const safariVersion = parseInt((/Version\/([0-9]+)/.exec(userAgent) || [0, 0])[1]);

  if (
    (isAndroid && chromeVersion >= 53) ||
    (isiOS && (safariVersion >= 10 || chromeiOSVersion >= 53)) ||
    !(isAndroid || isiOS)
  ) {
    return true;
  } else {
    return false;
  }
}

function getProtocol() {
  return document.location.protocol;
}

registerBidder(sharethroughAdapterSpec);
