# Overview


**Module Name**: AstraOne Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prebid@astraone.io

# Description

You can use this adapter to get a bid from AstraOne.
Please reach out to your AstraOne account team before using this plugin to get placeId.
The code below returns a demo ad.

About us: https://astraone.io

# Test Parameters
```js
var adUnits = [{
    code: 'test-div',
    mediaTypes: {
        banner: {
            sizes: [],
        }
    },
    bids: [{
        bidder: "astraone",
        params: {
            placement: "inImage",
            placeId: "5af45ad34d506ee7acad0c26",
            imageUrl: "https://creative.astraone.io/files/default_image-1-600x400.jpg"
        }
    }]
}];
```

# Example page

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
            sizes: [],``
            bids: [{
                bidder: "astraone",
                params: {
                    placement: "inImage",
                    placeId: "5af45ad34d506ee7acad0c26",
                    imageUrl: "https://creative.astraone.io/files/default_image-1-600x400.jpg"
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
        <img src="https://creative.astraone.io/files/default_image-1-600x400.jpg" />
        <iframe id='test-div' class="banner-block" style="display: none;"></iframe>
    </div>
</body>

</html>
```
# Example page with GPT

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
					sizes: [],
				}
			},
			bids: [{
				bidder: "astraone",
				params: {
					placement: "inImage",
					placeId: "5af45ad34d506ee7acad0c26",
					imageUrl: "https://creative.astraone.io/files/default_image-1-600x400.jpg"
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
		<img src="https://creative.astraone.io/files/default_image-1-600x400.jpg" />

		<div id='div-gpt-ad-1574864639578-0' class="banner-block">
			<script>
				googletag.cmd.push(() => { googletag.display('div-gpt-ad-1574864639578-0'); });
			</script>
		</div>
	</div>
</body>
</html>
```
