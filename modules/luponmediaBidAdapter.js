import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'luponmedia';
const ENDPOINT_URL = 'https://rtb.adxpremium.services/openrtb2/auction';

const DIGITRUST_PROP_NAMES = {
  PREBID_SERVER: {
    id: 'id',
    keyv: 'keyv'
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.siteId && bid.params.keyId); // TODO: check for siteId and keyId
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const bRequest = {
      method: 'POST',
      url: ENDPOINT_URL,
      data: null,
      options: {},
      bidderRequest
    };

    let currentImps = [];

    for (let i = 0, len = bidRequests.length; i < len; i++) {
      let newReq = newOrtbBidRequest(bidRequests[i], bidderRequest, currentImps);
      currentImps = newReq.imp;
      bRequest.data = JSON.stringify(newReq);
    }

    return bRequest;
  },
  interpretResponse: (response, request) => {
    const bidResponses = [];
    var respCur = 'USD';
    let parsedRequest = JSON.parse(request.data);
    let parsedReferrer = parsedRequest.site && parsedRequest.site.ref ? parsedRequest.site.ref : '';
    try {
      if (response.body && response.body.seatbid && utils.isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        respCur = response.body.cur || respCur;
        response.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
            utils.isArray(seatbidder.bid) &&
            seatbidder.bid.forEach(bid => {
              let newBid = {
                requestId: bid.impid,
                cpm: (parseFloat(bid.price) || 0).toFixed(2),
                width: bid.w,
                height: bid.h,
                creativeId: bid.crid || bid.id,
                dealId: bid.dealid,
                currency: respCur,
                netRevenue: false,
                ttl: 300,
                referrer: parsedReferrer,
                ad: bid.adm
              };

              bidResponses.push(newBid);
            });
        });
      }
    } catch (error) {
      utils.logError(error);
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    let allUserSyncs = [];
    if (!hasSynced && (syncOptions.iframeEnabled || syncOptions.pixelEnabled)) {
      responses.forEach(csResp => {
        if (csResp.body && csResp.body.ext && csResp.body.ext.usersyncs) {
          try {
            let response = csResp.body.ext.usersyncs
            let bidders = response.bidder_status;
            for (let synci in bidders) {
              let thisSync = bidders[synci];
              if (thisSync.no_cookie) {
                let url = thisSync.usersync.url;
                let type = thisSync.usersync.type;

                if (!url) {
                  utils.logError(`No sync url for bidder luponmedia.`);
                } else if ((type === 'image' || type === 'redirect') && syncOptions.pixelEnabled) {
                  utils.logMessage(`Invoking image pixel user sync for luponmedia`);
                  allUserSyncs.push({type: 'image', url: url});
                } else if (type == 'iframe' && syncOptions.iframeEnabled) {
                  utils.logMessage(`Invoking iframe user sync for luponmedia`);
                  allUserSyncs.push({type: 'iframe', url: url});
                } else {
                  utils.logError(`User sync type "${type}" not supported for luponmedia`);
                }
              }
            }
          } catch (e) {
            utils.logError(e);
          }
        }
      });
    } else {
      utils.logWarn('Luponmedia: Please enable iframe/pixel based user sync.');
    }

    hasSynced = true;
    return allUserSyncs;
  },
};

function newOrtbBidRequest(bidRequest, bidderRequest, currentImps) {
  bidRequest.startTime = new Date().getTime();

  const bannerParams = utils.deepAccess(bidRequest, 'mediaTypes.banner');

  let bannerSizes = [];

  if (bannerParams && bannerParams.sizes) {
    const sizes = utils.parseSizesInput(bannerParams.sizes);

    // get banner sizes in form [{ w: <int>, h: <int> }, ...]
    const format = sizes.map(size => {
      const [ width, height ] = size.split('x');
      const w = parseInt(width, 10);
      const h = parseInt(height, 10);
      return { w, h };
    });

    bannerSizes = format;
  }

  const data = {
    id: bidRequest.transactionId,
    test: config.getConfig('debug') ? 1 : 0,
    source: {
      tid: bidRequest.transactionId
    },
    tmax: config.getConfig('timeout') || 1500,
    imp: currentImps.concat([{
      id: bidRequest.bidId,
      secure: 1,
      ext: {
        [bidRequest.bidder]: bidRequest.params
      },
      banner: {
        format: bannerSizes
      }
    }]),
    ext: {
      prebid: {
        targeting: {
          includewinners: true,
          // includebidderkeys always false for openrtb
          includebidderkeys: false
        }
      }
    },
    user: {
    }
  }

  const bidFloor = parseFloat(utils.deepAccess(bidRequest, 'params.floor'));
  if (!isNaN(bidFloor)) {
    data.imp[0].bidfloor = bidFloor;
  }
  appendSiteAppDevice(data, bidRequest, bidderRequest);

  const digiTrust = _getDigiTrustQueryParams(bidRequest, 'PREBID_SERVER');
  if (digiTrust) {
    utils.deepSetValue(data, 'user.ext.digitrust', digiTrust);
  }

  if (bidderRequest.gdprConsent) {
    // note - gdprApplies & consentString may be undefined in certain use-cases for consentManagement module
    let gdprApplies;
    if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
      gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

    utils.deepSetValue(data, 'regs.ext.gdpr', gdprApplies);
    utils.deepSetValue(data, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  if (bidderRequest.uspConsent) {
    utils.deepSetValue(data, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  // Set user uuid
  utils.deepSetValue(data, 'user.id', utils.generateUUID());

  // set crumbs
  if (bidRequest.crumbs && bidRequest.crumbs.pubcid) {
    utils.deepSetValue(data, 'user.buyeruid', bidRequest.crumbs.pubcid);
  } else {
    utils.deepSetValue(data, 'user.buyeruid', utils.generateUUID());
  }

  if (bidRequest.userId && typeof bidRequest.userId === 'object' &&
        (bidRequest.userId.tdid || bidRequest.userId.pubcid || bidRequest.userId.lipb || bidRequest.userId.idl_env)) {
    utils.deepSetValue(data, 'user.ext.eids', []);

    if (bidRequest.userId.tdid) {
      data.user.ext.eids.push({
        source: 'adserver.org',
        uids: [{
          id: bidRequest.userId.tdid,
          ext: {
            rtiPartner: 'TDID'
          }
        }]
      });
    }

    if (bidRequest.userId.pubcid) {
      data.user.ext.eids.push({
        source: 'pubcommon',
        uids: [{
          id: bidRequest.userId.pubcid,
        }]
      });
    }

    // support liveintent ID
    if (bidRequest.userId.lipb && bidRequest.userId.lipb.lipbid) {
      data.user.ext.eids.push({
        source: 'liveintent.com',
        uids: [{
          id: bidRequest.userId.lipb.lipbid
        }]
      });

      data.user.ext.tpid = {
        source: 'liveintent.com',
        uid: bidRequest.userId.lipb.lipbid
      };

      if (Array.isArray(bidRequest.userId.lipb.segments) && bidRequest.userId.lipb.segments.length) {
        utils.deepSetValue(data, 'rp.target.LIseg', bidRequest.userId.lipb.segments);
      }
    }

    // support identityLink (aka LiveRamp)
    if (bidRequest.userId.idl_env) {
      data.user.ext.eids.push({
        source: 'liveramp.com',
        uids: [{
          id: bidRequest.userId.idl_env
        }]
      });
    }
  }

  if (config.getConfig('coppa') === true) {
    utils.deepSetValue(data, 'regs.coppa', 1);
  }

  if (bidRequest.schain && hasValidSupplyChainParams(bidRequest.schain)) {
    utils.deepSetValue(data, 'source.ext.schain', bidRequest.schain);
  }

  const siteData = Object.assign({}, bidRequest.params.inventory, config.getConfig('fpd.context'));
  const userData = Object.assign({}, bidRequest.params.visitor, config.getConfig('fpd.user'));

  if (!utils.isEmpty(siteData) || !utils.isEmpty(userData)) {
    const bidderData = {
      bidders: [ bidderRequest.bidderCode ],
      config: {
        fpd: {}
      }
    };

    if (!utils.isEmpty(siteData)) {
      bidderData.config.fpd.site = siteData;
    }

    if (!utils.isEmpty(userData)) {
      bidderData.config.fpd.user = userData;
    }

    utils.deepSetValue(data, 'ext.prebid.bidderconfig.0', bidderData);
  }

  const pbAdSlot = utils.deepAccess(bidRequest, 'fpd.context.pbAdSlot');
  if (typeof pbAdSlot === 'string' && pbAdSlot) {
    utils.deepSetValue(data.imp[0].ext, 'context.data.adslot', pbAdSlot);
  }

  return data;
}

export function hasValidSupplyChainParams(schain) {
  let isValid = false;
  const requiredFields = ['asi', 'sid', 'hp'];
  if (!schain.nodes) return isValid;
  isValid = schain.nodes.reduce((status, node) => {
    if (!status) return status;
    return requiredFields.every(field => node[field]);
  }, true);
  if (!isValid) utils.logError('LuponMedia: required schain params missing');
  return isValid;
}

function _getDigiTrustQueryParams(bidRequest = {}, endpointName) {
  if (!endpointName || !DIGITRUST_PROP_NAMES[endpointName]) {
    return null;
  }
  const propNames = DIGITRUST_PROP_NAMES[endpointName];

  function getDigiTrustId() {
    const bidRequestDigitrust = utils.deepAccess(bidRequest, 'userId.digitrustid.data');
    if (bidRequestDigitrust) {
      return bidRequestDigitrust;
    }

    let digiTrustUser = (window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: 'T9QSFKPDN9'})));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }

  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return null;
  }

  const digiTrustQueryParams = {
    [propNames.id]: digiTrustId.id,
    [propNames.keyv]: digiTrustId.keyv
  };
  if (propNames.pref) {
    digiTrustQueryParams[propNames.pref] = 0;
  }
  return digiTrustQueryParams;
}

function _getPageUrl(bidRequest, bidderRequest) {
  let pageUrl = config.getConfig('pageUrl');
  if (bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else if (!pageUrl) {
    pageUrl = bidderRequest.refererInfo.referer;
  }
  return bidRequest.params.secure ? pageUrl.replace(/^http:/i, 'https:') : pageUrl;
}

function appendSiteAppDevice(data, bidRequest, bidderRequest) {
  if (!data) return;

  // ORTB specifies app OR site
  if (typeof config.getConfig('app') === 'object') {
    data.app = config.getConfig('app');
  } else {
    data.site = {
      page: _getPageUrl(bidRequest, bidderRequest)
    }
  }
  if (typeof config.getConfig('device') === 'object') {
    data.device = config.getConfig('device');
  }
}

var hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

registerBidder(spec);
