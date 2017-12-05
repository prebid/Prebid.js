import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

// const ADMIXER_ENDPOINT = '//prebid.admixer.co.kr/nasmediaAdMixerAdServer.php';
const ADMIXER_ENDPOINT = '//adn2.admixer.co.kr:25846/prebid';
const DEFAULT_BID_TTL = 360;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_REVENUE = false;

export const spec = {
    code: 'nasmediaAdmixer',

    aliases: ['nasmediaAdmixerLite'],

    isBidRequestValid: function (bid) {
        return !!(bid && bid.params && bid.params.ax_key);
    },

    buildRequests: function (validBidRequests) {
        return validBidRequests.map(bid => {
            let adSizes = getSize(bid.sizes);

            return {
                method: 'GET',
                url: ADMIXER_ENDPOINT,
                data: {
                    ax_key: utils.getBidIdParameter('ax_key', bid.params),
                    req_id: bid.bidId,
                    width: adSizes[0],
                    height: adSizes[1],
                    referrer: utils.getTopWindowUrl(),
                    os: getOsType()
                }
            }
        })
    },

    interpretResponse: function (serverResponse, bidRequest) {
        const serverBody = serverResponse.body;
        const bidResponses = [];

        if (serverBody && serverBody.error_code === 0 && serverBody.body && serverBody.body.length > 0) {
            let bidData = serverBody.body[0];

            const bidResponse = {
                ad: bidData.ad,
                requestId: serverBody.req_id,
                creativeId: bidData.ad_id,
                cpm: bidData.cpm,
                width: bidData.width,
                height: bidData.height,
                currency: bidData.currency ? bidData.currency : DEFAULT_CURRENCY,
                netRevenue: bidData.revenue ? bidData.revenue : DEFAULT_REVENUE,
                ttl: bidData.ttl ? bidData.ttl : DEFAULT_BID_TTL
            };

            bidResponses.push(bidResponse);
        } else {
            utils.logWarn('nasmediaAdmixer Error' + serverBody.error_msg, 'nasmediaAdmixer')
        }
        return bidResponses;
    }
}

function getOsType() {
    let ua = navigator.userAgent.toLowerCase();

    if (ua.match(/android/i)) {
        return 'android';
    } else if (ua.match(/iphone/i) || ua.match(/ipad/i)) {
        return 'ios';
    } else if (ua.match(/mac/i)) {
        return 'mac';
    } else if (ua.match(/linux/i)) {
        return 'linux';
    } else if (ua.match(/window/i)) {
        return 'window';
    } else {
        return 'etc';
    }
}

function getSize(sizes) {
    let width = 0;
    let height = 0;
    if (sizes.length === 2 && typeof sizes[0] === 'number' && typeof sizes[1] === 'number') {
        width = sizes[0];
        height = sizes[1];
    } else {
        width = sizes[0][0];
        height = sizes[0][1];
    }
    return [width, height];
}
registerBidder(spec);
