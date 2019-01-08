import { Renderer } from 'src/Renderer';
import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { VIDEO, BANNER } from 'src/mediaTypes';

const BIDDER_CODE = 'open8';
const URL = '//as.vt.open8.com/v1/control/prebid';
const AD_TYPE = {
    VIDEO: 1,
    BANNER: 2
};

export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: [VIDEO, BANNER],
    
    isBidRequestValid: function(bid) {
        return !!(bid.params.slotId);
    },
    
    buildRequests: function(validBidRequests, bidderRequest) {
        var requests = [];
        for (var i = 0; i < validBidRequests.length; i++) {
            var bid = validBidRequests[i];
            var queryString = '';
            var slotId = utils.getBidIdParameter('slotId', bid.params);
            queryString = utils.tryAppendQueryString(queryString, 'slot_id', slotId);
            queryString = utils.tryAppendQueryString(queryString, 'imp_id', Math.random());
            queryString = utils.tryAppendQueryString(queryString, 'bid_id', bid.bidId);
            
            requests.push({
                    method: 'GET',
                    url: URL,
                    data: queryString
            });
        }
        return requests;
    },
    
    interpretResponse: function(serverResponse, request) {
        var bidderResponse = serverResponse.body;
        
        if (!bidderResponse.isAdReturn) {
            return [];
        }
        
        var ad = bidderResponse.ad;
        
        const bid = {
            slotId: bidderResponse.slotId,
            userId: bidderResponse.userId,
            impId: bidderResponse.impId,
            media: bidderResponse.media,
            requestId: ad.bidId,
            cpm: ad.price,
            creativeId: ad.creativeId,
            dealId: ad.dealId,
            currency: ad.currency || 'JPY',
            netRevenue: true, // TODO
            ttl: 360, // 6 minutes
        }
        
        if (ad.adType === AD_TYPE.VIDEO) {
            const videoAd = bidderResponse.ad.video;
            Object.assign(bid, {
                    vastXml: videoAd.vastXml,
                    width: videoAd.w,
                    height: videoAd.h,
                    renderer: newRenderer(bidderResponse),
                    adResponse: bidderResponse,
                    mediaType: VIDEO
            });
        } else if (ad.adType === AD_TYPE.BANNER) {
            const bannerAd = bidderResponse.ad.banner;
            Object.assign(bid, {
                    width: bannerAd.w,
                    height: bannerAd.h,
                    ad: bannerAd.adm,
                    mediaType: BANNER
            });
            try {
                bannerAd.imps.forEach(impTrackUrl => {
                        const tracker = utils.createTrackPixelHtml(impTrackUrl);
                        bid.ad += tracker;
                });
            } catch (error) {
                utils.logError('Error appending imp tracking pixel', error);
            }
        }
        return [bid];
    },
    
    getUserSyncs: function(syncOptions, serverResponses) {
        const syncs = [];
        if (syncOptions.iframeEnabled && serverResponses.length) {
            const syncIFs = serverResponses[0].body.syncIFs;
            if (syncIFs) {
                syncIFs.forEach(sync => {
                        syncs.push({
                                type: 'iframe',
                                url: sync
                        });
                });
            }
        }
        if (syncOptions.pixelEnabled && serverResponses.length) {
            const syncPixs = serverResponses[0].body.syncPixels;
            if (syncPixs) {
                syncPixs.forEach(sync => {
                        syncs.push({
                                type: 'image',
                                url: sync
                        });
                });
            }
        }
        return syncs;
    },
}

function newRenderer(bidderResponse) {
    const renderer = Renderer.install({
            id: bidderResponse.ad.bidId,
            url: bidderResponse.ad.video.purl,
            loaded: false,
    });
    
    try {
        renderer.setRender(outstreamRender);
    } catch (err) {
        utils.logWarn('Prebid Error calling setRender on newRenderer', err);
    }
    
    return renderer;
}

function outstreamRender(bid) {
    bid.renderer.push(() => {
            window.o8.renderAd({
                    vastXml: bid.vastXml,
                    adUnitCode: bid.adUnitCode,
                    slotId: bid.slotId,
                    impId: bid.impId,
                    userId: bid.userId,
                    media: bid.media,
                    adResponse: bid.adResponse,
                    mediaType: bid.mediaType
            });
    });
}

registerBidder(spec);
