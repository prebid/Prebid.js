import {
    registerBidder,
    BidderSpec,
    ServerRequest,
    BidRequest,
    BidResponse,
    UserSync
} from '../../src/adapters/bidderFactory.js'
import { BANNER } from '../../src/mediaTypes.js'
import { config } from '../../src/config.js'

const BIDDER_CODE = 'rakuten';
const ENDPOINT = 'https://s-bid.rmp.rakuten.com/h';

declare var navigator: NavigatorIE;
interface NavigatorIE extends Navigator {
    browserLanguage: string
}

type BidParams = {
    adSpotId: number;
};

type RequestData = {
    bi: BidRequest<BidParams>['bidId']
    t: BidParams['adSpotId'];
    s: string;                  // protocol: "http:" | "https:"
    ua: string;                 // user agent
    l: string;                  // language
    d: string;                  // domain
    tp: string;                 // window location
    pp: string;                 // referer
    gdpr: number;               // gdpr applies
    cd?: string;                 // gdpr consent string
    ccpa?: string;               // ccpa consent string
}

type ServerResponse = {
    cpm: number;
    ad: string;
    bid_id: BidRequest<BidParams>['bidId'];
    width: number;
    height: number;
    creative_id: number;
    deal_id: string;
    currency: string;
    ttl: number;
    net_revenue?: boolean;
    sync_urls?: string[]
}

export const spec : BidderSpec<BidParams, RequestData, ServerResponse> = {
    code: BIDDER_CODE,
    isBidRequestValid: bid => !!bid.params.adSpotId,
    buildRequests: (validBidRequests, bidderRequest) => {
        const bidRequests : ServerRequest<RequestData>[] = [];
        validBidRequests.forEach(bid => {
            const params = bid.params;
            bidRequests.push({
                method: 'GET',
                url: config.getConfig('rakuten.endpoint') || ENDPOINT,
                data: {
                    bi: bid.bidId,
                    t: params.adSpotId,
                    s: document.location.protocol,
                    ua: navigator.userAgent,
                    l:
                        navigator.browserLanguage ||
                        navigator.language,
                    d: document.domain,
                    tp: bidderRequest.refererInfo.stack[0] || window.location.href,
                    pp: bidderRequest.refererInfo.referer,
                    gdpr: bidderRequest.gdprConsent?.gdprApplies ? 1 : 0,
                    ...bidderRequest.gdprConsent?.consentString && {
                        cd: bidderRequest.gdprConsent.consentString
                    },
                    ...bidderRequest.uspConsent && {
                        ccpa: bidderRequest.uspConsent
                    }
                }
            })
        });
        return bidRequests
    },
    interpretResponse: (response, request) => {
        const sb = response.body;
        const bidResponses : BidResponse[] = [];

        if (sb.cpm && sb.ad) {
            bidResponses.push({
                requestId: sb.bid_id,
                cpm: sb.cpm,
                width: sb.width || 0,
                height: sb.height || 0,
                creativeId: sb.creative_id || 0,
                dealId: sb.deal_id || '',
                currency: sb.currency || 'USD',
                netRevenue: (typeof sb.net_revenue === 'undefined') ? true : !!sb.net_revenue,
                mediaType: BANNER,
                ttl: sb.ttl,
                ad: sb.ad
            });
        }

        return bidResponses
    },

    getUserSyncs: function(syncOptions, serverResponses) {
        const syncs : UserSync[] = [];
        if (syncOptions.pixelEnabled && serverResponses[0].body !== undefined) {const bidResponseObj = serverResponses[0].body;
            if (!bidResponseObj) {
                return [];
            }
            if (bidResponseObj.sync_urls && bidResponseObj.sync_urls.length > 0) {
                bidResponseObj.sync_urls.forEach(syncUrl => {
                    if (syncUrl && syncUrl !== 'null' && syncUrl.length > 0) {
                        syncs.push({
                            type: 'image',
                            url: syncUrl
                        });
                    }
                });
            }
        }
        return syncs;
    }
};

registerBidder(spec);
