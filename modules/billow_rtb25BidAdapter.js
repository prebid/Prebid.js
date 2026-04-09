import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {BANNER, VIDEO, NATIVE, AUDIO} from '../src/mediaTypes.js';
const BIDDER_CODE = 'billow_rtb25';
const DEFAULT_ENDPOINT = 'https://adx-sg.billowlink.com/api/rtb/adsWeb';
const BILLOW_BID_CURRENCY = 'USD';
const converter = ortbConverter({
    context: {
        netRevenue: true,
        ttl: 30,
    },
    imp(buildImp, bidRequest, context) {
        const imp = buildImp(bidRequest, context);

        const placementId = utils.deepAccess(bidRequest, 'params.placementId');
        if (placementId) {
            imp.tagid = String(placementId);
        }
        return imp;
    },
    bidResponse(buildBidResponse, bid, context) {
        const imp = context && context.imp;
        if (imp && imp.native) {
            context.mediaType = NATIVE;
        } else if (imp && imp.audio) {
            context.mediaType = AUDIO;
        } else if (imp && imp.video) {
            context.mediaType = VIDEO;
        } else {
            context.mediaType = BANNER;
        }
        return buildBidResponse(bid, context);
    },
});
function findOrtbSeatId(body, seatBidId) {
    if (!body || !Array.isArray(body.seatbid) || seatBidId == null || seatBidId === '') return '';
    for (const sb of body.seatbid) {
        if (!sb || !Array.isArray(sb.bid)) continue;
        for (const ortbBid of sb.bid) {
            if (ortbBid && ortbBid.id === seatBidId) {
                return sb.seat != null && sb.seat !== '' ? String(sb.seat) : '';
            }
        }
    }
    return '';
}
function findOrtbAdId(body, seatBidId) {
    if (!body || !Array.isArray(body.seatbid) || seatBidId == null || seatBidId === '') return '';
    for (const sb of body.seatbid) {
        if (!sb || !Array.isArray(sb.bid)) continue;
        for (const ortbBid of sb.bid) {
            if (ortbBid && ortbBid.id === seatBidId) {
                return ortbBid.adid != null ? String(ortbBid.adid) : '';
            }
        }
    }
    return '';
}
function applyOpenRtbMacrosToBid(bid, body, ortbRequest) {
    if (!bid) return;
    const priceRaw = bid.originalCpm != null ? bid.originalCpm : bid.cpm;
    const priceStr = priceRaw != null && !Number.isNaN(Number(priceRaw)) ? String(priceRaw) : '';
    const seatBidId = bid.seatBidId != null ? String(bid.seatBidId) : '';
    const subs = {
        AUCTION_ID: ortbRequest && ortbRequest.id != null ? String(ortbRequest.id) : '',
        AUCTION_BID_ID: seatBidId,
        AUCTION_IMP_ID: bid.requestId != null ? String(bid.requestId) : '',
        AUCTION_SEAT_ID: findOrtbSeatId(body, seatBidId),
        AUCTION_AD_ID: findOrtbAdId(body, seatBidId),
        AUCTION_PRICE: priceStr,
        AUCTION_CURRENCY: BILLOW_BID_CURRENCY,
        AUCTION_MBR: '',
        AUCTION_LOSS: '0',
    };
    ['vastXml', 'vastUrl', 'ad'].forEach((key) => {
        const val = bid[key];
        if (typeof val === 'string' && val.indexOf('${') !== -1) {
            const next = utils.replaceMacros(val, subs);
            if (typeof next === 'string') {
                bid[key] = next;
            }
        }
    });
}
export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: [BANNER, VIDEO, NATIVE, AUDIO],
    isBidRequestValid(bid) {
        const placementId = utils.deepAccess(bid, 'params.placementId');
        return !!placementId;
    },
    buildRequests(validBidRequests, bidderRequest) {
        const endpointFromBid = utils.deepAccess(validBidRequests, '0.params.endpoint');
        const endpoint = endpointFromBid || DEFAULT_ENDPOINT;
        const ortbRequest = converter.toORTB({
            bidRequests: validBidRequests, bidderRequest,
        });
        return {
            method: 'POST',
            url: endpoint,
            data: ortbRequest,
        };
    },
    interpretResponse(serverResponse, request) {
        const body = serverResponse && serverResponse.body;
        if (!body) {
            return [];
        }
        const seatbid = body.seatbid;
        if (!Array.isArray(seatbid) || seatbid.length === 0) {
            return [];
        }
        const result = converter.fromORTB({
            response: body, request: request.data,
        });
        const bids = (result && result.bids) || [];
        bids.forEach((b) => {
            b.currency = BILLOW_BID_CURRENCY;
            applyOpenRtbMacrosToBid(b, body, request.data);
        });
        return bids;
    },
    getUserSyncs() {
        return [];
    },
    alwaysHasCapacity: true,
};
registerBidder(spec);
