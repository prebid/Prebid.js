import { logWarn, getWindowTop } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { BANNER, VIDEO, NATIVE, AUDIO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { tryAppendQueryString } from '../libraries/urlUtils/urlUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { isViewabilityMeasurable, getViewability } from '../libraries/percentInView/percentInView.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';

const BIDDER_CODE = 'connectad';
const BIDDER_CODE_ALIAS = 'connectadrealtime';
const ENDPOINT_URL = 'https://i.connectad.io/api/v3';
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE, AUDIO];
const MTYPE_TO_MEDIATYPE = {
  1: BANNER,
  2: VIDEO,
  3: AUDIO,
  4: NATIVE
};
const REQUEST_MEDIATYPE_PRIORITY = [BANNER, VIDEO, AUDIO, NATIVE];

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 360,
    currency: 'USD'
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    imp.ext = imp.ext || {};

    // Add ConnectAd specific parameters
    imp.ext.siteId = bidRequest.params.siteId;
    imp.ext.networkId = bidRequest.params.networkId;

    // Fallback for bidfloor if floor module didn't set it
    if (!imp.bidfloor && (bidRequest.params.bidfloor || bidRequest.params.floorprice)) {
      imp.bidfloor = bidRequest.params.bidfloor || bidRequest.params.floorprice;
      imp.bidfloorcur = 'USD';
    }

    // Viewability Integration
    if (imp.banner || imp.video) {
      const element = getAdUnitElement(bidRequest);
      if (element && isViewabilityMeasurable(element)) {
        let elementSize = { w: 0, h: 0 };

        if (imp.video && imp.video.w > 0 && imp.video.h > 0) {
          elementSize.w = imp.video.w;
          elementSize.h = imp.video.h;
        } else if (bidRequest.mediaTypes && bidRequest.mediaTypes.banner && bidRequest.mediaTypes.banner.sizes && bidRequest.mediaTypes.banner.sizes.length > 0) {
          const sizes = bidRequest.mediaTypes.banner.sizes[0];
          elementSize.w = Array.isArray(sizes) ? sizes[0] : sizes.w;
          elementSize.h = Array.isArray(sizes) ? sizes[1] : sizes.h;
        }

        const viewabilityAmount = getViewability(element, getWindowTop(), elementSize);
        if (typeof viewabilityAmount === 'number') {
          imp.ext.viewability = Math.round(viewabilityAmount);
        }
      }
    }

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);

    // Ensure creativeId is set, fallback to adid or id (e.g., for test environments)
    bidResponse.creativeId = bidResponse.creativeId || bid.crid || bid.adid || bid.id || 'connectad-default-creative';

    // Support outstream video with a default renderer if none is provided
    if (bidResponse.mediaType === VIDEO && context.bidRequest?.mediaTypes?.video?.context === 'outstream' && !bidResponse.renderer && !context.bidRequest?.renderer) {
      const rendererUrl = 'https://cdn.connectad.io/video/outstream/connectad-outstream.js';
      bidResponse.renderer = Renderer.install({
        id: bid.id,
        url: rendererUrl,
        adUnitCode: bidResponse.adUnitCode || context.bidRequest?.adUnitCode
      });
      bidResponse.renderer.setRender((bid) => {
        bid.renderer.push(() => {
          if (window.ConnectAdOutstream && typeof window.ConnectAdOutstream.renderAd === 'function') {
            window.ConnectAdOutstream.renderAd({
              targetId: bid.adUnitCode,
              vastXml: bid.vastXml || bid.vastUrl || bid.adm,
              sizes: [bid.width, bid.height]
            });
          } else {
            logWarn('ConnectAd: Outstream renderer script not loaded or window.ConnectAdOutstream not defined.');
          }
        });
      });
    }

    // ConnectAd specific response mappings (e.g. meta tags)
    if (bid.ext && bid.ext.dsa) {
      bidResponse.meta = bidResponse.meta || {};
      bidResponse.meta.dsa = bid.ext.dsa;
    }
    if (bid.cat && bid.cat.length > 0) {
      bidResponse.meta = bidResponse.meta || {};
      bidResponse.meta.primaryCatId = bid.cat[0];
    }

    return bidResponse;
  },
  overrides: {
    bidResponse: {
      mediaType(orig, bidResponse, bid, context) {
        if (bidResponse.mediaType) {
          return;
        }
        bidResponse.mediaType = MTYPE_TO_MEDIATYPE[Number(bid.mtype)] ||
          REQUEST_MEDIATYPE_PRIORITY.find((mediaType) => context.bidRequest?.mediaTypes?.[mediaType]);
        if (!bidResponse.mediaType) {
          orig(bidResponse, bid, context);
        }
      }
    }
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: 138,
  aliases: [BIDDER_CODE_ALIAS],
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    return !!(bid.params.networkId && bid.params.siteId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }

    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });

    let url = ENDPOINT_URL;
    if (validBidRequests[0] && validBidRequests[0].params && validBidRequests[0].params.endpointUrl) {
      url = validBidRequests[0].params.endpointUrl;
    }

    return {
      method: 'POST',
      url: url,
      data: data,
      bids: validBidRequests
    };
  },

  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body || !bidRequest || !bidRequest.data) {
      return [];
    }
    let response = serverResponse.body;
    const request = bidRequest.data;

    if (Array.isArray(response)) {
      response = {
        id: request?.id || '1',
        seatbid: [{
          bid: response
        }]
      };
    }

    if (response.seatbid && response.seatbid.length > 0 && request && request.imp && request.imp.length > 0) {
      const imps = request.imp;
      response.seatbid.forEach(seatbid => {
        if (seatbid.bid && seatbid.bid.length > 0) {
          // ConnectAd may return one bid that references multiple imp IDs.
          // Fan those out to one bid per impid for converter mapping.
          const processedBids = [];
          seatbid.bid.forEach(bid => {
            if (Array.isArray(bid.impid)) {
              bid.impid.forEach(id => {
                const clonedBid = { ...bid, impid: id };
                processedBids.push(clonedBid);
              });
            } else {
              processedBids.push(bid);
            }
          });
          seatbid.bid = processedBids;

          // Some responses return an impid that doesn't match the request.
          // If there is exactly one imp, map the response bid back to it.
          seatbid.bid.forEach(bid => {
            const matchesAnyImp = imps.some(imp => imp.id === bid.impid);
            if (!matchesAnyImp && imps.length === 1) {
              bid.impid = imps[0].id;
            }
          });

          // Normalize native payloads and align response asset IDs to request asset IDs.
          seatbid.bid.forEach(bid => {
            const imp = imps.find(i => i.id === bid.impid);
            const origBidRequest = bidRequest.bids && bidRequest.bids.find(b => b.bidId === bid.impid);
            const isNative = (bid.mtype === 4 || bid.mtype === '4' || (imp && imp.native) || (origBidRequest && origBidRequest.mediaTypes && origBidRequest.mediaTypes.native));
            if (isNative) {
              let nativeResponse;
              try {
                nativeResponse = typeof bid.adm === 'string' ? JSON.parse(bid.adm) : bid.adm;
              } catch {
                // ignore
              }
              if (nativeResponse) {
                let unwrapped = false;
                // If the response is wrapped in a "native" object, unwrap it to get assets at root
                if (nativeResponse.native) {
                  nativeResponse = nativeResponse.native;
                  unwrapped = true;
                }
                if (nativeResponse.assets) {
                  let nativeRequest;
                  if (imp && imp.native) {
                    try {
                      nativeRequest = typeof imp.native.request === 'string' ? JSON.parse(imp.native.request) : imp.native.request;
                    } catch {
                      // ignore
                    }
                  } else if (origBidRequest && origBidRequest.nativeOrtbRequest) {
                    nativeRequest = origBidRequest.nativeOrtbRequest;
                  }
                  const requestAssets = nativeRequest?.assets;
                  if (requestAssets) {
                    alignNativeAssetIds(nativeResponse.assets, requestAssets);
                  }
                }
                if (unwrapped || nativeResponse.assets) {
                  if (typeof bid.adm === 'string') {
                    bid.adm = JSON.stringify(nativeResponse);
                  } else {
                    bid.adm = nativeResponse;
                  }
                }
              }
            }
          });
        }
      });
    }

    return converter.fromORTB({ response, request }).bids || [];
  },

  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent) => {
    const pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let syncEndpoint;

    if (pixelType === 'iframe') {
      syncEndpoint = 'https://sync.connectad.io/iFrameSyncer?';
    } else {
      syncEndpoint = 'https://sync.connectad.io/ImageSyncer?';
    }

    if (gdprConsent) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'gdpr', (gdprConsent.gdprApplies ? 1 : 0));
    }

    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'gdpr_consent', gdprConsent.consentString);
    }

    if (uspConsent) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'us_privacy', uspConsent);
    }

    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'gpp', gppConsent.gppString);
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'gpp_sid', gppConsent?.applicableSections?.join(','));
    }

    if (config.getConfig('coppa') === true) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'coppa', 1);
    }

    if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
      return [{
        type: pixelType,
        url: syncEndpoint
      }];
    } else {
      logWarn('Bidder ConnectAd: No User-Matching allowed');
    }
  }
};

registerBidder(spec);

function alignNativeAssetIds(responseAssets, requestAssets) {
  if (!Array.isArray(responseAssets) || !Array.isArray(requestAssets)) {
    return;
  }
  responseAssets.forEach(respAsset => {
    let matchedReqAsset;
    if (respAsset.title) {
      matchedReqAsset = requestAssets.find(reqAsset => reqAsset.title);
    } else if (respAsset.img) {
      // Try to match by image type (e.g. 1 for icon, 3 for main image)
      matchedReqAsset = requestAssets.find(reqAsset => reqAsset.img && Number(reqAsset.img.type) === Number(respAsset.img.type));
      if (!matchedReqAsset) {
        // Fallback: match any image asset
        matchedReqAsset = requestAssets.find(reqAsset => reqAsset.img);
      }
    } else if (respAsset.data) {
      // Try to match by data asset type
      matchedReqAsset = requestAssets.find(reqAsset => reqAsset.data && Number(reqAsset.data.type) === Number(respAsset.data.type));
      if (!matchedReqAsset) {
        // Fallback: match any data asset
        matchedReqAsset = requestAssets.find(reqAsset => reqAsset.data);
      }
    } else if (respAsset.video) {
      matchedReqAsset = requestAssets.find(reqAsset => reqAsset.video);
    }
    if (matchedReqAsset && matchedReqAsset.id !== undefined) {
      respAsset.id = matchedReqAsset.id;
    }
  });
}
