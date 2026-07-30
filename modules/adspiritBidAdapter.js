import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getGlobal } from '../src/prebidGlobal.js';
const { getWinDimensions } = utils;
const RTB_URL = '/rtb/getbid.php?rtbprovider=prebid';
const SCRIPT_URL = '/adasync.min.js';

export const spec = {

  code: 'adspirit',
  aliases: ['twiago'],
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bid) {
    const host = spec.getBidderHost(bid);
    if (!host || !bid.params.placementId) {
      return false;
    }
    return true;
  },
  getScriptUrl: function () {
    return SCRIPT_URL;
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const { refererInfo, gdprConsent, auctionId } = bidderRequest;
    const { topmostLocation } = refererInfo;
    const win = getWinDimensions();
    const prebidVersion = getGlobal().version;

    return validBidRequests.map(bidRequest => {
      const adspiritConId = spec.genAdConId(bidRequest);
      bidRequest.adspiritConId = adspiritConId;

      const host = spec.getBidderHost(bidRequest);
      const placementId = utils.getBidIdParameter('placementId', bidRequest.params);
      const eids = spec.getEids(bidRequest);

      const gdprApplies = gdprConsent?.gdprApplies ? 1 : 0;
      const gdprConsentString = gdprConsent?.consentString || '';

      let reqUrl = `//${host}${RTB_URL}&pid=${placementId}` +
        `&ref=${encodeURIComponent(topmostLocation)}` +
        `&scx=${win.screen?.width || 0}&scy=${win.screen?.height || 0}` +
        `&wcx=${win.innerWidth}&wcy=${win.innerHeight}` +
        `&async=${adspiritConId}&t=${Math.round(Math.random() * 100000)}`;

      if (gdprConsent) {
        reqUrl += `&gdpr=${gdprApplies}&gdpr_consent=${encodeURIComponent(gdprConsentString)}`;
      }

      // Set by Prebid core when the ad unit has a valid mediaTypes.native
      // configuration (ortb form is used as-is, legacy form is converted).
      // If it is missing, the ad unit did not (validly) request native, so we
      // must not request or return native — core would crash on validation.
      const nativeRequest = bidRequest.nativeOrtbRequest;

      if (bidRequest.mediaTypes?.native && !nativeRequest) {
        utils.logWarn('adspirit: mediaTypes.native is present but Prebid did not accept it (nativeOrtbRequest missing). Check that assets are defined directly under mediaTypes.native.ortb.assets.');
      }

      const openRTBRequest = {
        id: auctionId,
        at: 1,
        cur: ['EUR'],
        imp: [{
          id: bidRequest.bidId,
          bidfloor: parseFloat(bidRequest.params.bidfloor) || 0,
          bidfloorcur: 'EUR',
          secure: 1,
          banner: (bidRequest.mediaTypes.banner?.sizes?.length > 0) ? {
            format: bidRequest.mediaTypes.banner.sizes.map(([w, h]) => ({ w, h }))
          } : undefined,
          native: nativeRequest ? {
            request: JSON.stringify({
              ver: nativeRequest.ver || '1.2',
              assets: nativeRequest.assets
            }),
            ver: nativeRequest.ver || '1.2'
          } : undefined,
          ext: {
            placementId: bidRequest.params.placementId
          }
        }],

        site: {
          id: bidRequest.params.siteId || '',
          domain: new URL(topmostLocation).hostname,
          page: topmostLocation,
          publisher: {
            id: bidRequest.params.publisherId || '',
            name: bidRequest.params.publisherName || ''
          }
        },
        user: {
          data: bidRequest.userData || [],
          ext: {
            eids,
            consent: gdprConsentString
          }
        },
        device: {
          ua: navigator.userAgent,
          language: (navigator.language || '').split('-')[0],
          w: win.innerWidth,
          h: win.innerHeight,
          geo: {
            lat: bidderRequest?.geo?.lat || 0,
            lon: bidderRequest?.geo?.lon || 0,
            country: bidderRequest?.geo?.country || ''
          }
        },
        regs: {
          ext: {
            gdpr: gdprApplies,
            gdpr_consent: gdprConsentString
          }
        },
        ext: {
          oat: 1,
          prebidVersion,
          adUnitCode: {
            prebidVersion,
            code: bidRequest.adUnitCode,
            mediaTypes: bidRequest.mediaTypes
          }
        }
      };

      const schain = bidRequest?.ortb2?.source?.ext?.schain;
      if (schain) {
        openRTBRequest.source = {
          ext: { schain }
        };
      }

      return {
        method: 'POST',
        url: reqUrl,
        data: JSON.stringify(openRTBRequest),
        headers: { 'Content-Type': 'application/json' },
        bidRequest,
        nativeOrtbRequest: nativeRequest
      };
    });
  },
  getEids: function (bidRequest) {
    return utils.deepAccess(bidRequest, 'userIdAsEids') || [];
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const bidObj = bidRequest.bidRequest;
    const host = spec.getBidderHost(bidObj);
    const nativeRequest = bidRequest.nativeOrtbRequest;

    if (!serverResponse || !serverResponse.body) {
      utils.logWarn(`adspirit: Empty response from bidder`);
      return [];
    }

    if (serverResponse.body.seatbid) {
      serverResponse.body.seatbid.forEach(seat => {
        seat.bid.forEach(bid => {
          let adm = bid.adm;
          if (typeof adm === 'string' && adm.trim().startsWith('{')) {
            adm = JSON.parse(adm);
          }

          const bidResponse = {
            requestId: bidObj.bidId,
            cpm: bid.price,
            width: bid.w || 1,
            height: bid.h || 1,
            creativeId: bid.crid || bid.impid,
            currency: serverResponse.body.cur || 'EUR',
            netRevenue: true,
            ttl: bid.exp || 300,
            meta: {
              advertiserDomains: bid.adomain || []
            }
          };

          if (adm?.native?.assets) {
            // A native bid is only usable if the request actually asked for
            // native — otherwise Prebid core cannot validate it.
            if (!nativeRequest) {
              utils.logWarn('adspirit: Skipping native bid — the ad unit did not request native (nativeOrtbRequest missing).');
              return;
            }

            bidResponse.native = {
              clickUrl: adm.native.link?.url || '',
              impressionTrackers: Array.isArray(adm.native.imptrackers) ? adm.native.imptrackers : [],
              ortb: adm.native
            };

            const duplicateTracker = {};
            const assignedLegacyFields = {};
            const requestedAssets = nativeRequest.assets || [];

            adm.native.assets.forEach(asset => {
              duplicateTracker[asset.id] = (duplicateTracker[asset.id] || 0) + 1;

              const requestedAsset = requestedAssets.find(requestAsset => requestAsset.id === asset.id);
              let legacyField;

              if (asset.title && requestedAsset?.title) {
                legacyField = 'title';
              } else if (asset.img && requestedAsset?.img) {
                legacyField = requestedAsset.img.type === 1 ? 'icon' : 'image';
              } else if (asset.data && requestedAsset?.data) {
                if (requestedAsset.data.type === 1) legacyField = 'sponsoredBy';
                if (requestedAsset.data.type === 2) legacyField = 'body';
                if (requestedAsset.data.type === 12) legacyField = 'cta';
              }

              if (legacyField && !assignedLegacyFields[legacyField]) {
                if (asset.img) {
                  bidResponse.native[legacyField] = {
                    url: asset.img.url || '',
                    width: asset.img.w || null,
                    height: asset.img.h || null
                  };
                } else if (asset.title) {
                  bidResponse.native[legacyField] = asset.title.text || '';
                } else if (asset.data) {
                  bidResponse.native[legacyField] = asset.data.value || '';
                }

                assignedLegacyFields[legacyField] = true;
                return;
              }

              const extraIndex = duplicateTracker[asset.id] - 1;
              if (asset.img) {
                bidResponse.native[`image_${asset.id}_extra${extraIndex}`] = {
                  url: asset.img.url || '',
                  width: asset.img.w || null,
                  height: asset.img.h || null
                };
              } else if (asset.title) {
                bidResponse.native[`data_${asset.id}_extra${extraIndex}`] = asset.title.text || '';
              } else if (asset.data) {
                bidResponse.native[`data_${asset.id}_extra${extraIndex}`] = asset.data.value || '';
              }
            });

            bidResponse.mediaType = NATIVE;
          }

          bidResponses.push(bidResponse);
        });
      });
    } else {
      const adData = serverResponse.body;
      const cpm = adData.cpm;

      if (!cpm) return [];
      const bidResponse = {
        requestId: bidObj.bidId,
        cpm: cpm,
        width: adData.w,
        height: adData.h,
        creativeId: bidObj.params.placementId,
        currency: 'EUR',
        netRevenue: true,
        ttl: 300,
        meta: {
          advertiserDomains: adData.adomain || []
        }
      };
      const adm = '<script>window.inDapIF=false</script><script src="//' + host + SCRIPT_URL + '"></script><ins id="' + bidObj.adspiritConId + '"></ins>' + adData.adm;
      bidResponse.ad = adm;
      bidResponse.mediaType = BANNER;

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
  getBidderHost: function (bid) {
    if (bid.bidder === 'adspirit') {
      return utils.getBidIdParameter('host', bid.params);
    }
    if (bid.bidder === 'twiago') {
      return 'a.twiago.com';
    }
    return null;
  },

  genAdConId: function (bid) {
    return bid.bidder + Math.round(Math.random() * 100000);
  }
};

registerBidder(spec);
