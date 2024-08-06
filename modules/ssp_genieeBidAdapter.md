# Overview

```
Module Name: Geniee Bid Adapter
Module Type: Bidder Adapter
Maintainer: supply-carpet@geniee.co.jp
```

# Description
This is [Geniee](https://geniee.co.jp) Bidder Adapter for Prebid.js.
(This is Geniee *SSP* Bidder Adapter. The another adapter named "Geniee Bid Adapter" is Geniee *DSP* Bidder Adapter.)

Please contact us before using the adapter.

We will provide ads when satisfy the following conditions:

- There are a certain number bid requests by zone
- The request is a Banner ad
- Payment is possible in Japanese yen or US dollars
- The request is not for GDPR or COPPA users

Thus, even if the following test, it will be no bids if the request does not reach a certain requests.

# Test Parameters

```js
var adUnits = [
    {
        code: 'banner-ad',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [728, 90]],
            }
        },
        bids: [
            {
                bidder: 'geniee',
                params: {
                    zoneId: 1234567, // required, integer
                    currency: 'JPY', // optional, JPY or USD is valid
                    geparams: {...}, // optional, object
                    gecuparams: {...}, // optional, object
                    isFillOnNoBid: true, // optional, boolean, write out the aladdin tag when not bid if true
                    invalidImpBeacon: true, // optional, boolean, invalid Impressions Beacon if true
                }
            }
        ]
    },
    {
        code: 'native-ad',
        mediaTypes: {
            native: {
                sendTargetingKeys: false,
                ortb: { // Please change as appropriate according to https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf
                    assets: [{
                        id: 1,
                        required: 1,
                        img: {
                            type: 3,
                            w: 300,
                            h: 250,
                        }
                    },
                    {
                        id: 2,
                        required: 1,
                        title: {
                            len: 80
                        }
                    },
                    {
                        id: 3,
                        required: 1,
                        data: {
                            type: 1,
                            len: 80
                        }
                    }]
                }
            }
        },
        bids: [
            {
                bidder: 'geniee',
                params: {
                    zoneId: 1234567, // required, integer
                    native: { // required when using native ads
                        itemFormat: "...", // required, string, not empty
                        nativePostReplace: '', // required, string
                        apiv: '1.1.0', // optional, string, default is '1.0.0', api version
                        tkf: 1, // optional, integer, default is 0, 0 -> return image tag tracker, 1 -> return url tracker
                    },
                    currency: 'JPY', // optional, JPY or USD is valid
                    geparams: {...}, // optional, object
                    gecuparams: {...}, // optional, object
                }
            }
        ]
    }
];
```

# Example page

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Prebid</title>
    <script async src="prebid.js"></script>
    <script>
        var PREBID_TIMEOUT = 1000;

        var adUnitCodes = ['banner-ad', 'native-ad']; // Please change accordingly
        var adUnits = [
            {
                code: adUnitCodes[0],
                mediaTypes: {
                    banner: {
                        sizes: [[300, 250], [728, 90]],
                    }
                },
                bids: [
                    {
                        bidder: 'geniee',
                        params: {
                            zoneId: 1234567,
                            currency: 'JPY',
                            isFillOnNoBid: true,
                        }
                    }
                ]
            },
            {
                code: adUnitCodes[1],
                mediaTypes: {
                    native: {
                        sendTargetingKeys: false,
                        ortb: {
                            assets: [{
                                id: 1,
                                required: 1,
                                img: {
                                    type: 3,
                                    w: 300,
                                    h: 250,
                                }
                            },
                            {
                                id: 2,
                                required: 1,
                                title: {
                                    len: 80
                                }
                            },
                            {
                                id: 3,
                                required: 1,
                                data: {
                                    type: 1,
                                    len: 80
                                }
                            }]
                        }
                    }
                },
                bids: [
                    {
                        bidder: 'geniee',
                        params: {
                            zoneId: 1234567,
                            currency: 'JPY',
                            native: {
                                itemFormat: '<style type="text/css">*{margin:0;padding:0;font-size:100%}div.gn-nad_frst{width:300px;height:250px;margin:auto;background-color:#FFF;position:relative}div.gn-nad_frst a{text-decoration:none;-webkit-tap-highlight-color:transparent;color:#4B4B4B}div.gn-nad_frst div.gn-nad_frst_img-container{margin:0px;padding:0px;text-align:center;background-color:#000;text-align:center;height:157px}p.gn-nad_frst_img-container div.gn-nad_frst_img{position:relative;width:auto;vertical-align:top;border:0;right:0px}div.gn-nad_frst_img img{height:157px;width:auto}div.gn-nad_frst div.gn-nad_frst_optout{position:absolute;top:0px;right:0px}img.gn-nad_frst_optimg{height:20px;width:auto}div.gn-nad_frst div.gn-nad_frst_text-container{padding:2%;overflow:hidden;height:93px}p.gn-nad_frst_bottom-title{width:100%;margin:0px;padding:0px;text-align:left;overflow:hidden;text-overflow:ellipsis;font-size:14px;font-weight:700;margin-top:2px;word-wrap:break-word;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}p.gn-nad_frst_bottom-desc{width:100%;margin:0px;padding:0px;text-align:left;overflow:hidden;text-overflow:ellipsis;font-size:12px;margin-top:8px;word-wrap:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}div.gn-nad_frst_text-container p.gn-nad_frst_pr{margin:0px;padding:0px;position:absolute;bottom:3px;text-align:left;margin-top:0.1em;font-size:8px;color:#CCC}</style><div class="gn-nad_frst"> <a href="{landing-url}" target="_blank"><div class="gn-nad_frst_img-container"><div class="gn-nad_frst_img"> <img src="{screenshots-url}"></div><div class="gn-nad_frst_optout" style="display: none"> <a href="{optout-url}" target="_blank"> <img class="gn-nad_frst_optimg" src="{optout-image-url}"> </a></div></div><div class="gn-nad_frst_text-container"><p class="gn-nad_frst_bottom-title"> {title}</p><p class="gn-nad_frst_bottom-desc">{description}</p><p class="gn-nad_frst_pr"> </p></div> </a></div>',
                                nativePostReplace: '',
                                apiv: '1.1.0',
                                tkf: 1,
                            }
                        }
                    }
                ]
            }
        ];

        window.pbjs = window.pbjs || {};
        pbjs.que = pbjs.que || [];

        pbjs.que.push(function() {
            pbjs.setConfig({
                currency: {
                    adServerCurrency: "JPY",
                    defaultRates: { USD: { JPY: 120 } }
                }
            });
            pbjs.addAdUnits(adUnits);
            pbjs.requestBids({
                timeout: PREBID_TIMEOUT
            });
        });

        function renderAd() {
            for (var i = 0; i < adUnitCodes.length; i++) {
                var iframe = document.getElementById(adUnitCodes[i]);
                var bid = pbjs.getHighestCpmBids(adUnitCodes[i])[0];
                if (bid) pbjs.renderAd(iframe.contentWindow.document, bid.adId);
                else {
                    for (var j = 0; j < adUnits[i].bids.length; j++) {
                        if (adUnits[i].bids[j].bidder === 'geniee' && adUnits[i].bids[j].params.isFillOnNoBid) {
                            var zoneId = String(adUnits[i].bids[j].params.zoneId);
                            var src = "https://js.gsspcln.jp/t/" + zoneId.slice(1, 4) + "/" + zoneId.slice(4) + "/a" + zoneId + ".js";
                            iframe.contentWindow.document.write("<script type='text/javascript' src='" + src + "'></sc"
                            + "ript><script>window.addEventListener('load',function(){window.parent.document.getElementById('" + adUnitCodes[i] + "').height=document.body.scrollHeight})</sc" + "ript>");
                            break;
                        }
                    }
                }
            }
        }

        // Please call at the right time
        function refreshBid() {
            pbjs.que.push(function() {
                pbjs.requestBids({
                    timeout: PREBID_TIMEOUT,
                    adUnitCodes: adUnitCodes,
                    bidsBackHandler: function(bids) {
                        if (document.readyState !== "complete") {
                            window.addEventListener("DOMContentLoaded", renderAd, { once: true });
                        } else {
                            renderAd();
                        }
                    }
                });
            });
        }
    </script>
</head>
<body>
    <h1>Prebid</h1>
    <h5>Ad</h5>
    <iframe id="banner-ad" width="0" height="0" frameborder="0" scrolling="no" style="width: 100%;"></iframe> <!-- id is equal to adUnit code -->
    <iframe id="native-ad" width="0" height="0" frameborder="0" scrolling="no" style="width: 100%;"></iframe>
</body>
</html>
```
