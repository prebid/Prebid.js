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
      placeType: "In-image",
      placeId: "613221112871613d1517d181", // id from personal account
      placeContainer: '#iib-container',
      imageUrl: "https://rtbinsight.ru/content/images/size/w1000/2021/05/ximage-30.png.pagespeed.ic.IfuX4zAEPP.png",
      imageWidth: 1000,
      imageHeight: 524,
    }
  }]
}];

var adUnits = [{
  code: 'iimb-target',
  mediaTypes: {
    banner: {
      sizes: [[0, 0]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "In-image Max",
      placeId: "6139ae472871613d1517dedd", // id from personal account
      placeContainer: '#iimb-container',
      imageUrl: "https://rtbinsight.ru/content/images/size/w1000/2021/05/ximage-30.png.pagespeed.ic.IfuX4zAEPP.png",
      imageWidth: 1000,
      imageHeight: 524,
    }
  }]
}];

var adUnits = [{
  code: 'icb-target',
  mediaTypes: {
    banner: {
      sizes: [[0, 0]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "In-content Banner",
      placeId: "6139ae082871613d1517dec0", // id from personal account
      placeContainer: '#icb-container',
    }
  }]
}];

var adUnits = [{
  code: 'ics-target',
  mediaTypes: {
    banner: {
      sizes: [[0, 0]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "In-content Stories",
      placeId: "6139ae292871613d1517ded3", // id from personal account
      placeContainer: '#ics-container',
    }
  }]
}];

var adUnits = [{
  code: 'as-target',
  mediaTypes: {
    banner: {
      sizes: [[0, 0]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "Action Scroller",
      placeId: "6139adc12871613d1517deb0", // id from personal account
      placeContainer: '#as-container',
    }
  }]
}];

var adUnits = [{
  code: 'asl-target',
  mediaTypes: {
    banner: {
      sizes: [[0, 0]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "Action Scroller Light",
      placeId: "6139adda2871613d1517deb8", // id from personal account
      placeContainer: '#asl-container',
    }
  }]
}];

var adUnits = [{
  code: 'jb-target',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "Just Banner",
      placeId: "6139ae832871613d1517dee9", // id from personal account
      placeContainer: '#jb-container',
    }
  }]
}];

var adUnits = [{
  code: 'icv-target',
  mediaTypes: {
    video: {
      playerSize: [[480, 320]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "In-content Video",
      placeId: "6139ae182871613d1517deca", // id from personal account
      placeContainer: '#icv-container',
    }
  }]
}];

var adUnits = [{
  code: 'ocv-target',
  mediaTypes: {
    video: {
      playerSize: [[480, 320]],
    }
  },
  bids: [{
    bidder: "afp",
    params: {
      placeType: "Out-content Video",
      placeId: "6139ae5b2871613d1517dee2", // id from personal account
      placeContainer: '#ocv-container', // only the "body" tag is used as a container
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
		},{
            code: 'jb-target',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [{
                bidder: "afp",
                params: {
                    placeType: "Just Banner",
                    placeId: "6139ae832871613d1517dee9", // id from personal account
                    placeContainer: '#jb-container',
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
									
                    params = pbjs.getAdserverTargetingForAdUnitCode("jb-target");
                    iframe = document.getElementById("jb-target");
                    
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
        <div id="iib-container" style="max-width: 600px;">
            <img src="https://creative.astraone.io/files/default_image-1-600x400.jpg" width="100%" />
        </div>
        <iframe id="iib-target" style="display: none;"></iframe>
    </div>

    <h2>Just Banner</h2>
    <div class="container-wrapper">
        <div id="jb-container"></div>
        <iframe id="jb-target" style="display: none;"></iframe>
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
        <div id="iib-container" style="max-width: 600px;">
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
