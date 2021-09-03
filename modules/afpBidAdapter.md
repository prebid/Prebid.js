# Overview


**Module Name**: AFP Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: devops@astraone.io

# Description

You can use this adapter to get a bid from AFP.
Please reach out to your AFP account team before using this plugin to get placeId.
The code below returns a demo ad.

About us: https://afp.ai

# Test Parameters
```js
var adUnits = [{
  code: 'iib-target',
  mediaTypes: {
    banner: {
      sizes: [[0, 0]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "In-image", // or "In-image Max"
      placeId: "613221112871613d1517d181",
      placeContainer: '#iib-container',
      imageUrl: "https://rtbinsight.ru/content/images/size/w1000/2021/05/ximage-30.png.pagespeed.ic.IfuX4zAEPP.png",
      imageWidth: 1000,
      imageHeight: 524,
    }
  }]
}];

var adUnits = [{
  code: 'iib-target',
  mediaTypes: {
    banner: {
      sizes: [[0, 0]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "In-content Banner", // or "In-content Stories" or "Action Scroller" or "Action Scroller Light"
      placeId: "{{id from personal account}}",
      placeContainer: '#iib-container',
    }
  }]
}];

var adUnits = [{
  code: 'iib-target',
  mediaTypes: {
    video: {
      playerSize: [[480, 320]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "In-content Video", // or "Out-content Video"
      placeId: "{{id from personal account}}",
      placeContainer: '#iib-container',
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
	<title>Prebid.js In-image Example</title>
	<script async src="prebid.js"></script>
	<script>
		var adUnits = [{
			code: 'iib-target',
			mediaTypes: {
				banner: {
					sizes: [0, 0],
				}
			},
			bids: [{
				bidder: "afp",
				params: {
					placeType: "In-image",
					placeId: "613221112871613d1517d181",
					placeContainer: '#iib-container',
					imageUrl: "https://rtbinsight.ru/content/images/size/w1000/2021/05/ximage-30.png.pagespeed.ic.IfuX4zAEPP.png",
					imageWidth: 1000,
					imageHeight: 524,
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
					var params = pbjs.getAdserverTargetingForAdUnitCode("iib-target");
					var iframe = document.getElementById("iib-target");
					
					if (params && params['hb_adid']) {
						pbjs.renderAd(iframe.contentDocument, params['hb_adid']);
					}
				}
			});
		});
	</script>
</head>
<body>
    <h2>In-image</h2>
    <div class="container-wrapper">
        <div id="iib-container" style="width: 600px;">
            <img src="https://creative.astraone.io/files/default_image-1-600x400.jpg" width="100%" />
        </div>
        <iframe id="iib-target" style="display: none;"></iframe>
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
	<title>Prebid.js In-image Example</title>
	<script async src="https://www.googletagservices.com/tag/js/gpt.js"></script>
	<script async src="prebid.js"></script>
	<script>
		var adUnits = [{
			code: 'div-gpt-ad-1574864639578-0',
			mediaTypes: {
				banner: {
					sizes: [0, 0],
				}
			},
			bids: [{
				bidder: "afp",
				params: {
					placeType: "In-image",
					placeId: "613221112871613d1517d181",
					placeContainer: '#iib-container',
					imageUrl: "https://rtbinsight.ru/content/images/size/w1000/2021/05/ximage-30.png.pagespeed.ic.IfuX4zAEPP.png",
					imageWidth: 600,
					imageHeight: 400,
				}
			}]
		}];
		
		var pbjs = pbjs || {};
		pbjs.que = pbjs.que || [];
		
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
				.defineSlot('/19968336/header-bid-tag-0', [300, 250], 'div-gpt-ad-1574864639578-0')
				.addService(googletag.pubads());
			googletag.pubads().enableSingleRequest();
			googletag.enableServices();
		});
	</script>
</head>
<body>
    <h2>In-image</h2>
    <div class="container-wrapper">
        <div id="iib-container" style="width: 600px;">
            <img src="https://creative.astraone.io/files/default_image-1-600x400.jpg" width="100%" />
        </div>
        <div id="div-gpt-ad-1574864639578-0">
            <script type="text/javascript">
                googletag.cmd.push(function() {
                    googletag.display('div-gpt-ad-1574864639578-0');
                });
            </script>
        </div>
    </div>
</body>
</html>
```
