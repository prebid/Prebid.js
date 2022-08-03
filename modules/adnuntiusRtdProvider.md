### Overview

The Adnuntius Real Time Data Provider will request segments from adnuntius data, based on what is defined in the realTimeData object. It uses the siteId and userId that a publisher provides. These will have to correspond to a previously uploaded user to Adnuntius Data.

### Integration

1.  Build the adnuntiusRTD module into the Prebid.js package with:

```
gulp build --modules=adnuntiusRtdProvider,...
```

2.  Use `setConfig` to instruct Prebid.js to initilaize the adnuntiusRtdProvider module, as specified below.

### Configuration

```
var pbjs = pbjs || { que: [] }
pbjs.que.push(function () {
	pbjs.setConfig({
		realTimeData: {
			auctionDelay: 300,
			dataProviders: [
				{
					name: 'adnuntius',
					waitForIt: true,
					params: {
						bidders: ['adnuntius'],
						providers: [{
							siteId: 'site123',
							userId: 'user123'
						}]
					}
				}
			]
		},
	});
});
```

Please reach out to Adnuntius if you need more info about this: prebid@adnuntius.com
