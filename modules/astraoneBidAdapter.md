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
	<script>
        var adUnits = [{
			code: 'test-div',
			sizes: [],
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
					var div = document.getElementById('test-div');

					if (params && params['hb_adid']) {
						pbjs.renderAd(div, params['hb_adid']);
					}
				}
			});
		});
	</script>
</head>

<body>
	<h2>Prebid.js InImage Banner Test</h2>

	<div style="width: 600px;" id='test-div'>
		<img src="https://creative.astraone.io/files/default_image-1-600x400.jpg" />
	</div>
</body>

</html>
```

