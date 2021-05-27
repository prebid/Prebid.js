import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import strIncludes from 'core-js-pure/features/string/includes.js';

const BIDDER_CODE = 'sspBC';
const BIDDER_URL = 'https://ssp.wp.pl/bidder/';
const SYNC_URL = 'https://ssp.wp.pl/bidder/usersync';
const NOTIFY_URL = 'https://ssp.wp.pl/bidder/notify';
const TMAX = 450;
const BIDDER_VERSION = '4.8';
const W = window;
const { navigator } = W;
const oneCodeDetection = {};
var consentApiVersion;

/**
 * Get bid parameters for notification
 * @param {*} bidData - bid (bidWon), or array of bids (timeout)
 */
const getNotificationPayload = bidData => {
  if (bidData) {
    const bids = utils.isArray(bidData) ? bidData : [bidData];
    if (bids.length > 0) {
      const result = {
        requestId: undefined,
        siteId: [],
        adUnit: [],
        slotId: [],
      }
      bids.forEach(bid => {
        let params = utils.isArray(bid.params) ? bid.params[0] : bid.params;
        params = params || {};

        // check for stored detection
        if (oneCodeDetection[bid.requestId]) {
          params.siteId = oneCodeDetection[bid.requestId][0];
          params.id = oneCodeDetection[bid.requestId][1];
        }

        if (params.siteId) {
          result.siteId.push(params.siteId);
        }
        if (params.id) {
          result.slotId.push(params.id);
        }
        if (bid.cpm) {
          const meta = bid.meta || {};
          result.cpm = bid.cpm;
          result.creativeId = bid.creativeId;
          result.adomain = meta.advertiserDomains && meta.advertiserDomains[0];
          result.networkName = meta.networkName;
        }
        result.adUnit.push(bid.adUnitCode)
        result.requestId = bid.auctionId || result.requestId;
        result.timeout = bid.timeout || result.timeout;
      })
      return result;
    }
  }
}

const cookieSupport = () => {
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  const useCookies = navigator.cookieEnabled || !!document.cookie.length;

  return !isSafari && useCookies;
};

const applyClientHints = ortbRequest => {
  const connection = navigator.connection || false;
  const viewport = W.visualViewport || false;
  const segments = [];
  const hints = {
    'CH-Ect': connection.effectiveType,
    'CH-Rtt': connection.rtt,
    'CH-SaveData': connection.saveData,
    'CH-Downlink': connection.downlink,
    'CH-DeviceMemory': navigator.deviceMemory,
    'CH-Dpr': W.devicePixelRatio,
    'CH-ViewportWidth': viewport.width,
  };

  Object.keys(hints).forEach(key => {
    const hint = hints[key];

    if (hint) {
      segments.push({
        name: key,
        value: hint.toString(),
      });
    }
  });
  const data = [
    {
      id: '12',
      name: 'NetInfo',
      segment: segments,
    }];

  ortbRequest.user = Object.assign(ortbRequest.user, { data });
};

function applyGdpr(bidderRequest, ortbRequest) {
  if (bidderRequest && bidderRequest.gdprConsent) {
    consentApiVersion = bidderRequest.gdprConsent.apiVersion;
    ortbRequest.regs = Object.assign(ortbRequest.regs, { '[ortb_extensions.gdpr]': bidderRequest.gdprConsent.gdprApplies ? 1 : 0 });
    ortbRequest.user = Object.assign(ortbRequest.user, { '[ortb_extensions.consent]': bidderRequest.gdprConsent.consentString });
  }
}

function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = utils.deepAccess(collection[i], key);

    if (result) {
      return result;
    }
  }
}

function sendNotification(payload) {
  ajax(NOTIFY_URL, null, JSON.stringify(payload), {
    withCredentials: false,
    method: 'POST',
    crossOrigin: true
  });
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Banner by OpenRTB 2.5 §3.2.6
 */
function mapBanner(slot) {
  if (slot.mediaType === 'banner' ||
    utils.deepAccess(slot, 'mediaTypes.banner') ||
    (!slot.mediaType && !slot.mediaTypes)) {
    const format = slot.sizes.map(size => ({
      w: size[0],
      h: size[1],
    }));

    // override - tylko 1szy wymiar
    // format = format.slice(0, 1);
    return {
      format,
      id: slot.bidId,
    };
  }
}

function mapImpression(slot) {
  const { adUnitCode, bidId, params } = slot;
  const { id, siteId } = params || {};
  const imp = {
    id: id && siteId ? id : 'bidid-' + bidId,
    banner: mapBanner(slot),
    /* native: mapNative(slot), */
    tagid: adUnitCode,
  };

  const bidfloor = (slot.params && slot.params.bidFloor) ? parseFloat(slot.params.bidFloor) : undefined;

  if (bidfloor) {
    imp.bidfloor = bidfloor;
  }

  return imp;
}

function renderCreative(site, auctionId, bid, seat, request) {
  let gam;

  const mcad = {
    id: auctionId,
    seat,
    seatbid: [{
      bid: [bid],
    }],
  };

  const mcbase = btoa(encodeURI(JSON.stringify(mcad)));

  if (bid.adm) {
    // parse adm for gam config
    try {
      gam = JSON.parse(bid.adm).gam;

      if (!gam || !Object.keys(gam).length) {
        gam = undefined;
      } else {
        gam.namedSizes = ['fluid'];
        gam.div = 'div-gpt-ad-x01';
        gam.targeting = Object.assign(gam.targeting || {}, {
          OAS_retarg: '0',
          PREBID_ON: '1',
          emptygaf: '0',
        });
      }

      if (gam && !gam.targeting) {
        gam.targeting = {};
      }
    } catch (err) {
      utils.logWarn('Could not parse adm data', bid.adm);
    }
  }

  let adcode = `<head>
  <title></title>
  <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
    body {
    background-color: transparent;
    margin: 0;
    padding: 0;
  }
</style>
  <script>
  window.rekid = ${site.id};
  window.slot = ${parseInt(site.slot, 10)};
  window.wp_sn = "${site.sn}";
  window.mcad = JSON.parse(decodeURI(atob("${mcbase}")));
  window.gdpr = ${JSON.stringify(request.gdprConsent)};
  window.page = "${site.page}";
  window.ref = "${site.ref}";
  `;

  if (gam) {
    adcode += `window.gam = ${JSON.stringify(gam)};`;
  }

  adcode += `</script>
    </head>
    <body>
    <div id="c"></div>
    <script id="wpjslib" crossorigin src="//std.wpcdn.pl/wpjslib/wpjslib-inline.js" async defer></script>
  </body>
  </html>`;

  return adcode;
}

const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER],
  isBidRequestValid(bid) {
    // as per OneCode integration, bids without params are valid
    return true;
  },
  buildRequests(validBidRequests, bidderRequest) {
    if ((!validBidRequests) || (validBidRequests.length < 1)) {
      return false;
    }

    const siteId = setOnAny(validBidRequests, 'params.siteId');
    const publisherId = setOnAny(validBidRequests, 'params.publisherId');
    const page = setOnAny(validBidRequests, 'params.page') || bidderRequest.refererInfo.referer;
    const domain = setOnAny(validBidRequests, 'params.domain') || utils.parseUrl(page).hostname;
    const tmax = setOnAny(validBidRequests, 'params.tmax') ? parseInt(setOnAny(validBidRequests, 'params.tmax'), 10) : TMAX;
    const pbver = '$prebid.version$';
    const testMode = setOnAny(validBidRequests, 'params.test') ? 1 : undefined;

    let ref;

    try {
      if (W.self === W.top && document.referrer) { ref = document.referrer; }
    } catch (e) {
    }

    const payload = {
      id: bidderRequest.auctionId,
      site: {
        id: siteId,
        publisher: publisherId ? { id: publisherId } : undefined,
        page,
        domain,
        ref
      },
      imp: validBidRequests.map(slot => mapImpression(slot)),
      tmax,
      user: {},
      regs: {},
      test: testMode,
    };

    applyGdpr(bidderRequest, payload);
    applyClientHints(payload);

    return {
      method: 'POST',
      url: BIDDER_URL + '?cs=' + cookieSupport() + '&bdver=' + BIDDER_VERSION + '&pbver=' + pbver + '&inver=0',
      data: JSON.stringify(payload),
      bidderRequest,
    };
  },

  interpretResponse(serverResponse, request) {
    const { bidderRequest } = request;
    const response = serverResponse.body;
    const bids = [];
    const site = JSON.parse(request.data).site; // get page and referer data from request
    site.sn = response.sn || 'mc_adapter'; // WPM site name (wp_sn)
    let seat;

    if (response.seatbid !== undefined) {
      /*
        Match response to request, by comparing bid id's
        'bidid-' prefix indicates oneCode (parameterless) request and response
      */
      response.seatbid.forEach(seatbid => {
        seat = seatbid.seat;
        seatbid.bid.forEach(serverBid => {
          // get data from bid response
          const { adomain, crid, impid, exp, ext, price, w, h } = serverBid;

          const bidRequest = bidderRequest.bids.filter(b => {
            const { bidId, params } = b;
            const { id, siteId } = params || {};
            const currentBidId = id && siteId ? id : 'bidid-' + bidId;
            return currentBidId === impid;
          })[0];

          // get data from linked bidRequest
          const { bidId, params } = bidRequest || {};

          // get slot id for current bid
          site.slot = params && params.id;

          if (ext) {
            /*
              bid response might include ext object containing siteId / slotId, as detected by OneCode
              update site / slot data in this case
            */
            const { siteid, slotid } = ext;
            site.id = siteid || site.id;
            site.slot = slotid || site.slot;
          }

          if (bidRequest && site.id && !strIncludes(site.id, 'bidid')) {
            // found a matching request; add this bid

            // store site data for future notification
            oneCodeDetection[bidId] = [site.id, site.slot];

            const bid = {
              requestId: bidId,
              creativeId: crid || 'mcad_' + bidderRequest.auctionId + '_' + site.slot,
              cpm: price,
              currency: response.cur,
              ttl: exp || 300,
              width: w,
              height: h,
              bidderCode: BIDDER_CODE,
              mediaType: 'banner',
              meta: {
                advertiserDomains: adomain,
                networkName: seat,
              },
              netRevenue: true,
              ad: renderCreative(site, response.id, serverBid, seat, bidderRequest),
            };

            if (bid.cpm > 0) {
              // check bidFloor (if present in params)
              const { bidFloor } = params || {};

              if (!bidFloor || bid.cpm >= bidFloor) {
                bids.push(bid);
              } else {
                utils.logWarn('Discarding bid due to bidFloor setting', bid.cpm, bidFloor);
              }
            }
          } else {
            utils.logWarn('Discarding response - no matching request / site id', serverBid.impid);
          }
        });
      });
    }

    return bids;
  },
  getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: SYNC_URL + '?tcf=' + consentApiVersion,
      }];
    }
    utils.logWarn('sspBC adapter requires iframe based user sync.');
  },

  onTimeout(timeoutData) {
    const payload = getNotificationPayload(timeoutData);
    if (payload) {
      payload.event = 'timeout';
      sendNotification(payload);
      return payload;
    }
  },

  onBidWon(bid) {
    const payload = getNotificationPayload(bid);
    if (payload) {
      payload.event = 'bidWon';
      sendNotification(payload);
      return payload;
    }
  },
};

registerBidder(spec);

export {
  spec,
};
