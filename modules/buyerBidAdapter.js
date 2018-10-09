import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'buyer';
const ENDPOINT_URL = 'https://buyer.dspx.tv/request';
const USER_SYNC_URL = 'https://buyer.dspx.tv/sync';

export const spec = {
    code: BIDDER_CODE,
    aliases: ['buyer'],
    isBidRequestValid: function(bid) {
        return !!(bid.params.placement);
    },
    buildRequests: function(validBidRequests, bidderRequest) {
        return validBidRequests.map(bidRequest => {
            const params = bidRequest.params;
            const sizes = utils.parseSizesInput(bidRequest.sizes)[0];
            const width = sizes.split('x')[0];
            const height = sizes.split('x')[1];
            const placementId = params.placement;
            const pfilter = params.pfilter;

            const rnd = Math.floor(Math.random() * 99999999999);
            const referrer = encodeURIComponent(utils.getTopWindowUrl()); // bidderRequest.refererInfo ??
            const bidId = bidRequest.bidId;
            const payload = {
                _f: 'prebid_js',
                inventory_item_id: placementId,
                srw: width,
                srh: height,
                idt: 100,
                rnd: rnd,
                ref: referrer,
                bid_id: bidId,
            };
            if ( params.pfilter != undefined ) {
                payload.pfilter = params.pfilter;
            }
            if ( params.bcats != undefined ) {
                payload.bcats = params.bcats;
            }
            if ( params.dvt != undefined ) {
                payload.dvt = params.dvt;
            }
            return {
                method: 'GET',
                url: ENDPOINT_URL,
                data: payload,
            }
        });
    },
    interpretResponse: function(serverResponse, bidRequest) {
        const bidResponses = [];
        const response = serverResponse.body;
        const crid = response.crid || 0;
        const width = response.width || 0;
        const height = response.height || 0;
        const cpm = response.cpm / 1000 || 0;
        if (width !== 0 && height !== 0 && cpm !== 0 && crid !== 0) {
            const dealId = response.dealid || '';
            const currency = response.currency || 'EUR';
            const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
            const referrer = utils.getTopWindowUrl();
            const bidResponse = {
                requestId: bidRequest.data.bid_id,
                cpm: cpm,
                width: response.width,
                height: response.height,
                creativeId: crid,
                dealId: dealId,
                currency: currency,
                netRevenue: netRevenue,
                ttl: config.getConfig('_bidderTimeout'),
                referrer: referrer,
                ad: response.adTag
            };
            bidResponses.push(bidResponse);
        }
        return bidResponses;
    },
    getUserSyncs: function(syncOptions, serverResponses) {
        if (syncOptions.iframeEnabled) {
            return [{
                type: 'iframe',
                url: USER_SYNC_URL
            }];
        }
        if (syncOptions.pixelEnabled && serverResponses.length > 0) {
            syncs.push({
                type: 'image',
                url: serverResponses[0].body.userSync.url
            });
        }
    }
}
registerBidder(spec);