import * as utils from 'src/utils';
import {
    registerBidder
} from 'src/adapters/bidderFactory';
import {
    BANNER
} from 'src/mediaTypes';
import {
    config
} from 'src/config';

const BIDDER_CODE = 'emx_digital';
const ENDPOINT = 'hb.emxdgt.com';
export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: [BANNER],
    isBidRequestValid: function (bid) {
        return !!(bid.params.tagid);
    },
    buildRequests: function (validBidRequests, bidRequests) {
        const {host, href, protocol} = utils.getTopWindowLocation();
        var emxData = {};
        var emxImps = [];
        var auctionId = bidRequests.auctionId;
        var timeout = config.getConfig('bidderTimeout');
        var timestamp = Date.now();
        var url = location.protocol + "//" + ENDPOINT + ('?t=' + timeout + '&ts=' + timestamp );

        utils._each(validBidRequests, function (bid) {
            let tagId = String(utils.getBidIdParameter('tagid', bid.params));
            let bidFloor = utils.getBidIdParameter('bidfloor', bid.params) || 0;
            let emxBid = {
                id: bid.bidId,
                tid: bid.transactionId,
                tagid: tagId,
                secure: protocol === 'https:' ? 1 : 0,
                banner: {
                    format: bid.sizes.map(function (size) {
                        return {
                            w: size[0],
                            h: size[1]
                        };
                    }),
                    w: bid.sizes[0][0],
                    h: bid.sizes[0][1]
                }
            }
            bidFloor > 0 ? emxBid.bidfloor = bidFloor : null;
            emxImps.push(emxBid);
        });
        emxData = {
            id: auctionId,
            imp: emxImps,
            site: {
                domain: host,
                page: href
            }
        };
        if (bidRequests.gdprConsent) {
            emxData.regs = {
                ext: {
                    gdpr: bidRequests.gdprConsent.gdprApplies === true ? 1 : 0
                }
            };
            emxData.user = {
                ext: {
                    consent: bidRequests.gdprConsent.consentString
                }
            };
        }
        return {
            method: 'POST',
            url: url,
            data: JSON.stringify(emxData),
            options: {
                withCredentials: true
            }
        };
    },
    interpretResponse: function (serverResponse) {
        var emxBidResponses = [];
        var response = serverResponse.body || {};
        if (response.seatbid && response.seatbid.length > 0 && response.seatbid[0].bid) {
            response.seatbid.forEach(function (emxBid) {
                emxBid = emxBid.bid[0];
                emxBidResponses.push({
                    requestId: emxBid.id,
                    cpm: emxBid.price,
                    width: emxBid.w,
                    height: emxBid.h,
                    creativeId: emxBid.crid || emxBid.id,
                    dealId: emxBid.dealid || null,
                    currency: 'USD',
                    netRevenue: true,
                    mediaType: BANNER,
                    ad: decodeURIComponent(emxBid.adm),
                    ttl: emxBid.ttl
                });
            });
        }
        return emxBidResponses;
    },
    getUserSyncs: function (syncOptions) {
    }
};
registerBidder(spec);