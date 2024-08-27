### Overview

 Symitri Analytics Adapter.

### Integration

 1) Build the symitriAnalyticsAdapter module into the Prebid.js package with:

 ```
 gulp build --modules=symitriAnalyticsAdapter,...
 ```

 2) Use `enableAnalytics` to instruct Prebid.js to initilaize the symitriAnalyticsAdapter module, as specified below.

### Configuration

```
  pbjs.enableAnalytics({
				provider: 'symitri',
				options: {
					'apiAuthToken': '<see your Symitri account rep>'
				}
			});
 ```

Please reach out to your Symitri account representative(Prebid@symitri.com) to get provisioned on the DAP platform.


### Testing
To view an example of available segments returned by dap:
```
‘gulp serve --modules=rtdModule,symitriDapRtdProvider,symitriAnalyticsAdapter,appnexusBidAdapter,sovrnBidAdapter’
```
and then point your browser at:
"http://localhost:9999/integrationExamples/gpt/symitridap_segments_example.html"
