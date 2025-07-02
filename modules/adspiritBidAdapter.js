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
    let host = spec.getBidderHost(bid);
    if (!host || !bid.params.placementId) {
      return false;
    }
    return true;
  },
  getScriptUrl: function () {
    return SCRIPT_URL;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    let requests = [];
    let prebidVersion = getGlobal().version;
    const win = getWinDimensions();

    for (let i = 0; i < validBidRequests.length; i++) {
      let bidRequest = validBidRequests[i];
      bidRequest.adspiritConId = spec.genAdConId(bidRequest);
      let reqUrl = spec.getBidderHost(bidRequest);
      let placementId = utils.getBidIdParameter('placementId', bidRequest.params);
      const eids = spec.getEids(bidRequest);

      reqUrl = '//' + reqUrl + RTB_URL +
        '&pid=' + placementId +
        '&ref=' + encodeURIComponent(bidderRequest.refererInfo.topmostLocation) +
        '&scx=' + (win.screen?.width || 0) +
        '&scy=' + (win.screen?.height || 0) +
        '&wcx=' + win.innerWidth +
        '&wcy=' + win.innerHeight +
        '&async=' + bidRequest.adspiritConId +
        '&t=' + Math.round(Math.random() * 100000);

      let gdprApplies = bidderRequest.gdprConsent ? (bidderRequest.gdprConsent.gdprApplies ? 1 : 0) : 0;
      let gdprConsentString = bidderRequest.gdprConsent ? encodeURIComponent(bidderRequest.gdprConsent.consentString) : '';

      if (bidderRequest.gdprConsent) {
        reqUrl += '&gdpr=' + gdprApplies + '&gdpr_consent=' + gdprConsentString;
      }

      let openRTBRequest = {
        id: bidderRequest.auctionId,
        at: 1,
        cur: ['EUR'],
        imp: [{
          id: bidRequest.bidId,
          bidfloor: bidRequest.params.bidfloor !== undefined ? parseFloat(bidRequest.params.bidfloor) : 0,
          bidfloorcur: 'EUR',
          secure: 1,
          banner: (bidRequest.mediaTypes.banner && bidRequest.mediaTypes.banner.sizes?.length > 0) ? {
            format: bidRequest.mediaTypes.banner.sizes.map(size => ({
              w: size[0],
              h: size[1]
            }))
          } : undefined,
          native: (bidRequest.mediaTypes.native) ? {
            request: JSON.stringify({
              ver: '1.2',
              assets: bidRequest.mediaTypes.native.ortb?.assets?.length
                ? bidRequest.mediaTypes.native.ortb.assets
                : [
                  { id: 1, required: 1, title: { len: 100 } },
                  { id: 2, required: 1, img: { type: 3, wmin: 1200, hmin: 627, mimes: ['image/png', 'image/gif', 'image/jpeg'] } },
                  { id: 4, required: 1, data: {type: 2, len: 150} },
                  { id: 3, required: 0, data: {type: 12, len: 50} },
                  { id: 6, required: 0, data: {type: 1, len: 50} },
                  { id: 5, required: 0, img: { type: 1, wmin: 50, hmin: 50, mimes: ['image/png', 'image/gif', 'image/jpeg'] } }

                ]
            })
          } : undefined,
          ext: {
            placementId: bidRequest.params.placementId
          }
        }],

        site: {
          id: bidRequest.params.siteId || '',
          domain: new URL(bidderRequest.refererInfo.topmostLocation).hostname,
          page: bidderRequest.refererInfo.topmostLocation,
          publisher: {
            id: bidRequest.params.publisherId || '',
            name: bidRequest.params.publisherName || ''
          }
        },
         user: {
          data: bidRequest.userData || [],
          ext: {
            eids: eids,
            consent: gdprConsentString || ''
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
            gdpr: gdprApplies ? 1 : 0,
            gdpr_consent: gdprConsentString || ''
          }
        },
        ext: {
          oat: 1,
          prebidVersion: prebidVersion,
          adUnitCode: {
            prebidVersion: prebidVersion,
            code: bidRequest.adUnitCode,
            mediaTypes: bidRequest.mediaTypes
          }
        }
      };

      const schain = bidRequest?.ortb2?.source?.ext?.schain;
      if (schain) {
        openRTBRequest.source = {
          ext: {
            schain: schain
          }
        };
      }
      requests.push({
        method: 'POST',
        url: reqUrl,
        data: JSON.stringify(openRTBRequest),
        headers: { 'Content-Type': 'application/json' },
        bidRequest: bidRequest
      });
    }

    return requests;
  },
  getEids: function (bidRequest) {
    return utils.deepAccess(bidRequest, 'userIdAsEids') || [];
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const bidObj = bidRequest.bidRequest;
    let host = spec.getBidderHost(bidObj);

    if (!serverResponse || !serverResponse.body) {
      utils.logWarn(`adspirit: Empty response from bidder`);
      return [];
    }

    if (serverResponse.body.seatbid) {
      serverResponse.body.seatbid.forEach(seat => {
        seat.bid.forEach(bid => {
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

          let adm = bid.adm;
          if (typeof adm === 'string' && adm.trim().startsWith('{')) {
            adm = JSON.parse(adm || '{}');
            if (typeof adm !== 'object') adm = null;
          }

          if (adm?.native?.assets) {
            const getAssetValue = (id, type) => {
              const assetList = adm.native.assets.filter(a => a.id === id);
              if (assetList.length === 0) return '';
              return assetList[0][type]?.text || assetList[0][type]?.value || assetList[0][type]?.url || '';
            };

            const duplicateTracker = {};

            bidResponse.native = {
              title: getAssetValue(1, 'title'),
              body: getAssetValue(4, 'data'),
              cta: getAssetValue(3, 'data'),
              image: { url: getAssetValue(2, 'img') || '' },
              icon: { url: getAssetValue(5, 'img') || '' },
              sponsoredBy: getAssetValue(6, 'data'),
              clickUrl: adm.native.link?.url || '',
              impressionTrackers: Array.isArray(adm.native.imptrackers) ? adm.native.imptrackers : []
            };

            const predefinedAssetIds = Object.entries(bidResponse.native)
              .filter(([key, value]) => key !== 'clickUrl' && key !== 'impressionTrackers')
              .map(([key, value]) => adm.native.assets.find(asset =>
                typeof value === 'object' ? value.url === asset?.img?.url : value === asset?.data?.value
              )?.id)
              .filter(id => id !== undefined);

            adm.native.assets.forEach(asset => {
              const type = Object.keys(asset).find(k => k !== 'id');

              if (!duplicateTracker[asset.id]) {
                duplicateTracker[asset.id] = 1;
              } else {
                duplicateTracker[asset.id]++;
              }

              if (predefinedAssetIds.includes(asset.id) && duplicateTracker[asset.id] === 1) return;

              if (type && asset[type]) {
                const value = asset[type].text || asset[type].value || asset[type].url || '';

                if (type === 'img') {
                  bidResponse.native[`image_${asset.id}_extra${duplicateTracker[asset.id] - 1}`] = {
                    url: value, width: asset.img.w || null, height: asset.img.h || null
                  };
                } else {
                  bidResponse.native[`data_${asset.id}_extra${duplicateTracker[asset.id] - 1}`] = value;
                }
              }
            });

            bidResponse.mediaType = NATIVE;
          }

          bidResponses.push(bidResponse);
        });
      });
    } else {
      let adData = serverResponse.body;
      let cpm = adData.cpm;

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
      let adm = '<script>window.inDapIF=false</script><script src="//' + host + SCRIPT_URL + '"></script><ins id="' + bidObj.adspiritConId + '"></ins>' + adData.adm;
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
