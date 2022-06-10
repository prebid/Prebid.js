### Overview

 Akamai DAP Real time data Provider automatically invokes the DAP APIs and submit audience segments and the SAID to the bid-stream.

### Integration

 1) Build the akamaiDapRTD module into the Prebid.js package with:

 ```
 gulp build --modules=akamaiDapRtdProvider,...
 ```

 2) Use `setConfig` to instruct Prebid.js to initilaize the akamaiDapRtdProvider module, as specified below.

### Configuration

```
 pbjs.setConfig({
   realTimeData: {
     auctionDelay: 2000,
     dataProviders: [
       {
         name: "dap",
         waitForIt: true,
         params: {
           apiHostname: '<see your Akamai account rep>',
           apiVersion: "x1",
           domain: 'your-domain.com',
           identityType: 'email' | 'mobile' | ... | 'dap-signature:1.3.0',
           segtax: 504,
           dapEntropyUrl: 'https://dap-dist.akamaized.net/dapentropy.js',
           dapEntropyTimeout: 1500       // Maximum time for dapentropy to run
         }
       }
     ]
   }
 });
 ```

Please reach out to your Akamai account representative(Prebid@akamai.com) to get provisioned on the DAP platform.


### Testing
To view an example of available segments returned by dap:
```
‘gulp serve --modules=rtdModule,akamaiDapRtdProvider,appnexusBidAdapter,sovrnBidAdapter’
```
and then point your browser at:
"http://localhost:9999/integrationExamples/gpt/akamaidap_segments_example.html"
