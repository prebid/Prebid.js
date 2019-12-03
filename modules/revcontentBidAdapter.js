// jshint esversion: 6, es3: false, node: true
'use strict';

import {
registerBidder
        } from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';

const BIDDER_CODE = 'revcontent';
const NATIVE_PARAMS = {
    title: {
        id: 0,
        name: 'title'
    },
    icon: {
        id: 2,
        type: 1,
        name: 'img'
    },
    image: {
        id: 3,
        type: 3,
        name: 'img'
    },
    sponsoredBy: {
        id: 5,
        name: 'data',
        type: 1
    },
    body: {
        id: 4,
        name: 'data',
        type: 2
    },
    cta: {
        id: 1,
        type: 12,
        name: 'data'
    }
};

export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: ['banner', 'native', 'video'],
    isBidRequestValid: function (bid) {
        return (typeof bid.params.apiKey !== 'undefined' && typeof bid.params.userId !== 'undefined') && (bid.hasOwnProperty('nativeParams') || bid.hasOwnProperty('bannerParams'));
    },
    buildRequests: (validBidRequests, bidderRequest) => {
        const userId = setOnAny(validBidRequests, 'params.userId');
        const widgetId = setOnAny(validBidRequests, 'params.widgetId');
        const apiKey = setOnAny(validBidRequests, 'params.apiKey');

        var domain = setOnAny(validBidRequests, 'params.domain');
        var host = setOnAny(validBidRequests, 'params.endpoint');

        if (typeof host === 'undefined') {
            host = 'trends.revcontent.com';
        }

        let serverRequests = [];
        var refererInfo;
        if (bidderRequest && bidderRequest.refererInfo) {
            refererInfo = bidderRequest.refererInfo.referer;
        }

        if (typeof domain === 'undefined') {
            domain = extractHostname(refererInfo);
        }

        var endpoint = '//' + host + '/rtb?apiKey=' + apiKey + '&userId=' + userId;

        if (!isNaN(widgetId) && widgetId > 0) {
            endpoint = endpoint + '&widgetId=' + widgetId;
        }

        let secure = location.protocol === 'https:';

        const imp = validBidRequests.map((bid, id) => {
            if (bid.hasOwnProperty('nativeParams')) {
                const assets = utils._map(bid.nativeParams, (bidParams, key) => {
                    const props = NATIVE_PARAMS[key];
                    const asset = {
                        required: bidParams.required & 1
                    };
                    if (props) {
                        asset.id = props.id;
                        let wmin, hmin, w, h;
                        let aRatios = bidParams.aspect_ratios;

                        if (aRatios && aRatios[0]) {
                            aRatios = aRatios[0];
                            wmin = aRatios.min_width || 0;
                            hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
                        }

                        if (bidParams.sizes) {
                            const sizes = flatten(bidParams.sizes);
                            w = sizes[0];
                            h = sizes[1];
                        }

                        asset[props.name] = {
                            len: bidParams.len,
                            type: props.type,
                            wmin,
                            hmin,
                            w,
                            h
                        };

                        return asset;
                    }
                }).filter(Boolean);

                return {
                    id: id + 1,
                    tagid: bid.params.mid,
                    bidderRequestId: bid.bidderRequestId,
                    auctionId: bid.auctionId,
                    transactionId: bid.transactionId,
                    native: {
                        request: {
                            ver: '1.1',
                            context: 2,
                            contextsubtype: 21,
                            plcmttype: 4,
                            plcmtcnt: 4,
                            assets: assets
                        },
                        ver: '1.1',
                        battr: [1, 3, 8, 11, 17]
                    },
                    instl: 0,
                    bidfloor: 0.1,
                    secure: secure ? '1' : '0'
                };
            } else if (bid.hasOwnProperty('bannerParams')) {
                const sizeObjects = bid.bannerParams.sizes.map(size => ({ w: size[0], h: size[1] }));

                return {
                    id: id + 1,
                    tagid: bid.params.mid,
                    banner: {
                        format: sizeObjects
                    },
                    instl: 0,
                    bidfloor: 0.1,
                    secure: secure ? '1' : '0'
                };
            }
        });

        let data = {
            id: bidderRequest.bidderRequestId,
            imp: imp,
            site: {
                id: widgetId,
                domain: domain,
                page: refererInfo,
                cat: ['IAB17'],
                publisher: {
                    id: userId,
                    domain: domain
                }
            },
            device: {
                ua: navigator.userAgent,
                ip: "99.203.11.63",
                language: 'en'
            },
            user: {
                id: 1
            },
            at: 2,
            bcat: [
                'IAB24',
                'IAB25',
                'IAB25-1',
                'IAB25-2',
                'IAB25-3',
                'IAB25-4',
                'IAB25-5',
                'IAB25-6',
                'IAB25-7',
                'IAB26',
                'IAB26-1',
                'IAB26-2',
                'IAB26-3',
                'IAB26-4'
            ]
        };

        serverRequests.push({
            method: 'POST',
            options: {
                contentType: 'application/json'
            },
            url: endpoint,
            data: JSON.stringify(data),
            bid: validBidRequests
        });

        return serverRequests;
    },
    interpretResponse: function (serverResponse, originalBidRequest) {        
        if (!serverResponse.body) {
            return;
        }

        const seatbid = serverResponse.body.seatbid[0];
        const bidResponses = [];

        for (var x in seatbid.bid) {
            const bidResponse = {
                requestId: originalBidRequest.bid[0].bidId,
                cpm: seatbid.bid[x]['price'],
                creativeId: seatbid.bid[x]['adid'],
                currency: 'USD',
                netRevenue: true,
                ttl: 360,
                nurl: seatbid.bid[x]['nurl'],
                bidderCode: 'revcontent',
                ad: "<html><h3>I am an ad</h3></html>"
            };
            
            bidResponses.push(bidResponse);
        }        

        return bidResponses;
    }
};

registerBidder(spec);

function setOnAny(collection, key) {
    for (let i = 0, result; i < collection.length; i++) {
        result = utils.deepAccess(collection[i], key);
        if (result) {
            return result;
        }
    }
}

function flatten(arr) {
    return [].concat(...arr);
}

// Source: https://stackoverflow.com/a/23945027/1935500
function extractHostname(url) {
    var hostname;
    if (url.indexOf('//') > -1) {
        hostname = url.split('/')[2];
    } else {
        hostname = url.split('/')[0];
    }

    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];

    return hostname;
}
