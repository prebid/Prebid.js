# Overview


**Module Name**: Hybrid.ai Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prebid@hybrid.ai

# Description

You can use this adapter to get a bid from Hybrid.ai

About us: https://hybrid.ai

## Sample Banner Ad Unit

```js
var adUnits = [{
    code: 'banner_ad_unit',
    mediaTypes: {
        banner: {
            sizes: [[728, 90]]
        }
    },
    bids: [{
        bidder: "hybrid",
        params: {
            placement: "banner",                  // required
            placeId: "5af45ad34d506ee7acad0c26"   // required
        }
    }]
}];
```

## Sample Video Ad Unit

```js
var adUnits = [{
    code: 'video_ad_unit',
    mediaTypes: {
        video: {
            context: 'outstream',    // required
            playerSize: [640, 480]   // required
        }
    },
    bids: [{
        bidder: 'hybrid',
        params: {
            placement: "video",                   // required
            placeId: "5af45ad34d506ee7acad0c26"   // required
        }
    }]
}];
```

# Sample In-Image Ad Unit

```js
var adUnits = [{
    code: 'test-div',
    mediaTypes: {
        banner: {
            sizes: [0, 0]
        }
    },
    bids: [{
        bidder: "hybrid",
        params: {
            placement: "inImage",
            placeId: "102030405060708090000020",
            imageUrl: "https://hybrid.ai/images/image.jpg"
        }
    }]
}];
```

# Example page with In-Image

```html
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Prebid.js Banner Example</title>
	<script async src="prebid.js"></script>
	<style>
        .banner-block {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: 1;
            border: none;
            overflow: hidden;
        }
    </style>
    <script>
        var adUnits = [{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [0, 0]
                }
            },
            bids: [{
                bidder: "hybrid",
                params: {
                    placement: "inImage",
                    placeId: "102030405060708090000020",
                    imageUrl: "https://hybrid.ai/images/image.jpg"
                }
            }]
        }];

        var pbjs = pbjs || {};
        pbjs.que = pbjs.que || [];

        pbjs.que.push(function() {
            pbjs.addAdUnits(adUnits);
            pbjs.requestBids({
                bidsBackHandler: function (e) {
                    if (pbjs.adserverRequestSent) return;
                    pbjs.adserverRequestSent = true;

                    var params = pbjs.getAdserverTargetingForAdUnitCode("test-div");
                    var iframe = document.getElementById('test-div');

                    if (params && params['hb_adid']) {
                        iframe.parentElement.style.position = "relative";
                        iframe.style.display = "block";
                        pbjs.renderAd(iframe.contentDocument, params['hb_adid']);
                    }
                }
            });
        });
    </script>
</head>
<body>
	<h2>Prebid.js InImage Banner Test</h2>
	<div style="width: 600px;">
        <img src="https://hybrid.ai/images/image.jpg" />
        <iframe id='test-div' class="banner-block" style="display: none;"></iframe>
    </div>
</body>
</html>
```

# Example page with In-Image and GPT

```html
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Prebid.js Banner Example</title>
	<script async src="prebid.js"></script>
	<script async src="https://www.googletagservices.com/tag/js/gpt.js"></script>
	<style>
		.banner-block {
			position: absolute;
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
			z-index: 1;
			border: none;
			overflow: hidden;
		}
		.banner-block div {
			width: 100%;
			height: 100%;
		}
	</style>
	<script>
		var pbjs = pbjs || {};
		pbjs.que = pbjs.que || [];

		var adUnits = [{
			code: 'div-gpt-ad-1574864639578-0',
			mediaTypes: {
				banner: {
					sizes: [1, 1]
				}
			},
			bids: [{
				bidder: "hybrid",
				params: {
					placement: "inImage",
					placeId: "102030405060708090000020",
					imageUrl: "https://hybrid.ai/images/image.jpg"
				}
			}]
		}];

		var googletag = googletag || {};
		googletag.cmd = googletag.cmd || [];

		googletag.cmd.push(() => {
			googletag.pubads().disableInitialLoad();
		});

		pbjs.que.push(() => {
			pbjs.addAdUnits(adUnits);
			pbjs.requestBids({ bidsBackHandler: sendAdServerRequest });
		});

		function sendAdServerRequest() {
			googletag.cmd.push(() => {
				pbjs.que.push(() => {
					pbjs.setTargetingForGPTAsync('div-gpt-ad-1574864639578-0');
					googletag.pubads().refresh();
				});
			});
		}

		googletag.cmd.push(() => {
			googletag
				.defineSlot('/21877108735/rtb-pbjs', [1, 1], 'div-gpt-ad-1574864639578-0')
				.addService(googletag.pubads());

			googletag.pubads().enableSingleRequest();
			googletag.enableServices();
		});
	</script>
</head>
<body>
	<h2>Prebid.js Banner Ad Unit Test</h2>
	<div style="width: 600px; position: relative">
		<img src="https://hybrid.ai/images/image.jpg" />
		<div id='div-gpt-ad-1574864639578-0' class="banner-block">
			<script>
				googletag.cmd.push(() => { googletag.display('div-gpt-ad-1574864639578-0'); });
			</script>
		</div>
	</div>
</body>
</html>
```
