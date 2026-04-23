import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';

const BIDDER_CODE = 'pigeoon';
const ENDPOINT_URL = 'https://pbjs.pigeoon.com/bid';

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: [BANNER, NATIVE],

    isBidRequestValid: function (bid) {
        return !!(bid.params && bid.params.networkId && bid.params.placementId);
    },

    buildRequests: function (validBidRequests, bidderRequest) {
        const userId = getCookie('pigeoon_uid');
        const gdprConsent = bidderRequest.gdprConsent;

        const imps = validBidRequests.map(bid => {
            const imp = {
                id: bid.bidId,
                tagid: bid.params.placementId
            };

            if (bid.mediaTypes[BANNER]) {
                const sizes = bid.mediaTypes[BANNER].sizes || [];
                imp.banner = {
                    format: sizes.map(s => ({ w: s[0], h: s[1] }))
                };
            }

            if (bid.mediaTypes[NATIVE]) {
                imp.native = {
                    request: JSON.stringify(bid.mediaTypes[NATIVE])
                };
            }

            return imp;
        });

        const request = {
            id: bidderRequest.auctionId,
            imp: imps,
            site: {
                page: bidderRequest.refererInfo?.page,
                publisher: {
                    id: validBidRequests[0].params.networkId
                }
            },
            user: {
                id: userId || ''
            },
            regs: {
                ext: {
                    gdpr: gdprConsent ? 1 : 0
                }
            },
            ext: {
                consent: gdprConsent?.consentString || ''
            }
        };

        return {
            method: 'POST',
            url: ENDPOINT_URL,
            data: JSON.stringify(request),
            options: {
                contentType: 'application/json'
            }
        };
    },

    interpretResponse: function (serverResponse) {
        const response = serverResponse.body;
        if (!response || !response.seatbid || !response.seatbid.length) return [];

        const bids = [];
        response.seatbid.forEach(seatbid => {
            seatbid.bid.forEach(bid => {
                bids.push({
                    requestId: bid.impid,
                    cpm: bid.price,
                    currency: response.cur || 'TRY',
                    width: bid.w,
                    height: bid.h,
                    creativeId: bid.adid,
                    netRevenue: true,
                    ttl: 300,
                    adUrl: bid.adm,
                    meta: {
                        advertiserDomains: []
                    }
                });
            });
        });

        return bids;
    },

    getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
        const gdprParams = gdprConsent
            ? `&gdpr=1&gdpr_consent=${gdprConsent.consentString}`
            : '';

        if (syncOptions.iframeEnabled) {
            return [{
                type: 'iframe',
                url: `https://pbjs.pigeoon.com/sync${gdprParams}`
            }];
        }
        return [];
    }
};

registerBidder(spec);