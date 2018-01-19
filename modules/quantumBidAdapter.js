import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'quantum';
const ENDPOINT_URL = '//s.sspqns.com/hb';
export const spec = {
    code: BIDDER_CODE,
    aliases: ['quantx','qtx'], // short code
    /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
    isBidRequestValid: function(bid) {
        return !!(bid.params && bid.params.placementId);
    },
    /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bids
     * @return ServerRequest Info describing the request to the server.
     */
    buildRequests: function(bidRequests) {

        //console.log('_createServerRequest', bidRequests);
        return bidRequests.map(bid => {
            const qtxRequest = {};
            let bidId = '';
            //console.log('_bid', bid);
            const params = bid.params;
            let placementId = params.placementId;

            let devEnpoint = false;
            if(params.useDev && params.useDev === '1') {
                devEnpoint = '//sdev.sspqns.com/hb';
            }
            if(params.bannerFormat === 'true') {
                qtxRequest.type = 'banner';
            }

            let mediaType = (bid.mediaType === 'native' || utils.deepAccess(bid, 'mediaTypes.native'))?'native':'banner';


            if (!bidId) {
                bidId = bid.bidId;
            }
            qtxRequest.auid = placementId;
            const url = devEnpoint || ENDPOINT_URL;
            //console.log('RequestData', qtxRequest, url);
            return {
                method: 'GET',
                bidId: bidId,
                mediaType: mediaType,
                url: url,
                'data': qtxRequest
                //data: payloadString,
            };
        });
    },
    /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
    interpretResponse: function(serverResponse, bidRequest) {
         const serverBody  = serverResponse.body;
        // const headerValue = serverResponse.headers.get('some-response-header');
        const bidResponses = [];
        //console.log('interpretResponse:',serverResponse, bidRequest);
        let responseCPM;

        let bid = {};
       // const bid = newBid(serverBid, rtbBid);

        let id = bidRequest.bidId;

        if (serverBody.price && serverBody.price !== 0) {

            responseCPM = parseFloat(serverBody.price);

            bid.creativeId = serverBody.creative_id || '123d341';
            //bid.bidderCode = bidCode;
            bid.cpm = responseCPM;
            bid.requestId = bidRequest.bidId;
            bid.width = 0;
            bid.height = 0;
            bid.ttl = 200;
            bid.netRevenue = true;
            bid.currency = 'USD';

            if (serverBody.native) {
                bid.native = serverBody.native;
            }
            if (serverBody.cobj) {
                bid.cobj = serverBody.cobj;
            }

            bid.nurl = serverBody.nurl;
            bid.sync = serverBody.sync;

            //console.log(serverResponse,bidRequest);

            if (serverBody.request_type && serverBody.request_type === 'banner') {
                bid.width = 300;
                bid.height = 225;
                if (serverBody.native) {
                    var adAssetsUrl = '//cdn.elasticad.net/native/serve/js/quantx/quantumAd/';
                    var assets = serverBody.native.assets;
                    var link = serverBody.native.link;

                    var trackers = [];
                    if (serverBody.native.imptrackers) {
                        trackers = serverBody.native.imptrackers;
                    }

                    var jstracker = '';
                    if (serverBody.native.jstracker) {
                        jstracker = serverBody.native.jstracker;
                    }

                    if (serverBody.nurl) {
                        trackers.push(serverBody.nurl);
                    }

                    var ad = {};
                    ad['trackers'] = trackers;
                    ad['jstrackers'] = jstracker;

                    for (var i = 0; i < assets.length; i++) {
                        var asset = assets[i];
                        switch (asset['id']) {
                            case 1:
                                ad['title'] = asset['title']['text'];
                                break;
                            case 2:
                                ad['sponsor_logo'] = asset['img']['url'];
                                break;
                            case 3:
                                ad['content'] = asset['data']['value'];
                                break;
                            case 4:
                                ad['main_image'] = asset['img']['url'];
                                break;
                            case 6: //teaser as vast
                                ad['teaser_type'] = 'vast';
                                ad['video_url'] = asset['video']['vasttag'];
                                break;
                            case 10:
                                ad['sponsor_name'] = asset['data']['value'];
                                break;
                            case 2001:
                                ad['expanded_content_type'] = 'embed';
                                ad['expanded_summary'] = asset['data']['value'];
                                break;
                            case 2002:
                                ad['expanded_content_type'] = 'vast';
                                ad['expanded_summary'] = asset['data']['value'];
                                break;
                            case 2003:
                                ad['sponsor_url'] = asset['data']['value'];
                                break;
                            case 2004: //prism
                                ad['content_type'] = 'prism';
                                break;
                            case 2005: //internal_landing_page
                                ad['content_type'] = 'internal_landing_page';
                                ad['internal_content_link'] = asset['data']['value'];
                                break;
                            case 2006: //teaser as vast
                                ad['teaser_type'] = 'vast';
                                ad['video_url'] = asset['data']['value'];
                                break;
                            case 2007:
                                ad['autoexpand_content_type'] = asset['data']['value'];
                                break;
                            case 2022: //content page
                                ad['content_type'] = 'full_text';
                                ad['full_text'] = asset['data']['value'];
                                break;
                        }
                    }

                    ad['action_url'] = link.url;

                    if (!ad['sponsor_url']) {
                        ad['sponsor_url'] = action_url;
                    }

                    ad['clicktrackers'] = [];
                    if (link.clicktrackers) {
                        ad['clicktrackers'] = link.clicktrackers;
                    }

                    ad['main_image'] = "//resize-ssp.elasticad.net/scalecrop-290x130/" + window.btoa(ad['main_image']) + "/external";

                    bid.ad = "<div id=\"ead_" + id + "\">\n" +
                        '<div class="ad_container ead_' + id + '" style="clear: both; display:inline-block;width:100%">' +
                        '  <div class="image_content">' +
                        '    <a href="' + ad['action_url'] + '" class="ea_expand" target="_blank"><img src="' + ad['main_image'] + '" class="ea_image ead_image">' +
                        '    </a>' +
                        '  </div>' +
                        '  <div class="ead_content"><a href="' + ad['action_url'] + '" class="ea_expand" style="text-decoration: none" target="_blank"><h2 style="margin:0px;">' + ad['title'] + '</h2></a>' +
                        '    <p class="ea_summary">' + ad['content'] + '&nbsp;</p></div>' +
                        '  <div style="text-align:right;" class="ea_hide_brand_logo ea_hide_brand_name">' +
                        '    <p style="margin:0;"><span class="ea_creative_var_label">Sponsored by</span>' +
                        '      <a href="' + ad['sponsor_url'] + '" class="ea_link" target="_blank" style="display:inline;" target="_blank"><img src="' + ad['sponsor_logo'] + '" class="ea_image" style="vertical-align:middle;"></a>' +
                        '    </p>' +
                        '  </div>' +
                        '</div>' +
                        '<script type="application/javascript">var eanAD = ' + JSON.stringify(ad) + ';</script>' +
                        '<script src="' + adAssetsUrl + 'qad.js" type="application/javascript"></script>' +
                        '<link rel="stylesheet" href="' + adAssetsUrl + 'qad.css">' +
                        "</div>";
                }
            } else  {
                //native
                if (bidRequest.mediaType === 'native') {
                    if (serverBody.native) {
                        //console.log('native:', serverBody.native);
                        let assets = serverBody.native.assets;
                        let link = serverBody.native.link;

                        let trackers = [];
                        if (serverBody.native.imptrackers) {
                            trackers = serverBody.native.imptrackers;
                        }

                        /*let jstracker = '';
                        if (serverBody.native.jstracker) {
                            jstracker = serverBody.native.jstracker;
                        }*/

                        if (serverBody.nurl) {
                            trackers.push(serverBody.nurl);
                        }

                        let native = {};

                        for (let i = 0; i < assets.length; i++) {
                            let asset = assets[i];
                            switch (asset['id']) {
                                case 1:
                                    native.title = asset['title']['text'];
                                    break;
                                case 2:
                                    native.icon = asset['img']['url'];
                                    break;
                                case 3:
                                    native.body = asset['data']['value'];
                                    break;
                                case 4:
                                    native.image = "//resize-ssp.elasticad.net/scalecrop-290x130/" + window.btoa(asset['img']['url']) + "/external";
                                    break;
                                case 6: //teaser as vast
                                    //ad['teaser_type'] = 'vast';
                                    //ad['video_url'] = asset['video']['vasttag'];
                                    break;
                                case 10:
                                    native.sponsoredBy = asset['data']['value'];
                                    break;
                            }
                        }

                        native.clickUrl = link.url;
                        native.impressionTrackers = trackers;
                        if (link.clicktrackers) {
                            native.clickTrackers = link.clicktrackers;
                        }

                        bid.qtx_native = utils.deepClone(serverBody.native);
                        bid.native = native;
                    }
                }
            }
            //console.log('_bid:',bid);
            bidResponses.push(bid);
        }

        return bidResponses;
    },

    /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
    getUserSyncs: function(syncOptions, serverResponses) {
        const syncs = []
        if (syncOptions.iframeEnabled) {
            syncs.push({
                type: 'iframe',
                url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
            });
        }
        if (syncOptions.pixelEnabled && serverResponses.length > 0) {
            syncs.push({
                type: 'image',
                url: serverResponses[0].body.sync[0]
            });
        }
        return syncs;
    }

}
registerBidder(spec);