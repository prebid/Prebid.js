# Overview


**Module Name**: VOX Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prebid@hybrid.ai

# Description

You can use this adapter to get a bid from partners.hybrid.ai


## Sample Banner Ad Unit

```js
var adUnits = [{
    code: 'banner_ad_unit',
    mediaTypes: {
        banner: {
            sizes: [[160, 600]]
        }
    },
    bids: [{
        bidder: "vox",
        params: {
            placement: "banner",                      // required
            placementId: "5fc77bc5a757531e24c89a4c"   // required
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
            context: 'outstream',      // required
            playerSize: [[640, 480]]   // required
        }
    },
    bids: [{
        bidder: 'vox',
        params: {
            placement: "video",                       // required
            placementId: "5fc77a94a757531e24c89a3d"   // required
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
        bidder: "vox",
        params: {
            placement: "inImage",
            placementId: "5fc77b40a757531e24c89a42",
            imageUrl: "https://gallery.voxexchange.io/vox-main.png"
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
                bidder: "vox",
                params: {
                    placement: "inImage",
                    placementId: "5fc77b40a757531e24c89a42",
                    imageUrl: "https://gallery.voxexchange.io/vox-main.png"
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
        <img src="https://gallery.voxexchange.io/vox-main.png" />
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
				bidder: "vox",
				params: {
					placement: "inImage",
					placementId: "5fc77b40a757531e24c89a42",
					imageUrl: "https://gallery.voxexchange.io/vox-main.png"
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
		<img src="https://gallery.voxexchange.io/vox-main.png" />
		<div id='div-gpt-ad-1574864639578-0' class="banner-block">
			<script>
				googletag.cmd.push(() => { googletag.display('div-gpt-ad-1574864639578-0'); });
			</script>
		</div>
	</div>
</body>
</html>
```
