### Overview

 Symitri DAP Real time data Provider automatically invokes the DAP APIs and submit audience segments and the SAID to the bid-stream.

### Integration

 1) Build the symitriDapRTD module into the Prebid.js package with:

 ```
 gulp build --modules=symitriDapRtdProvider,...
 ```

 2) Use `setConfig` to instruct Prebid.js to initilaize the symitriDapRtdProvider module, as specified below.

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
           apiHostname: '<see your Symitri account rep>',
           apiVersion: "x1",
           domain: 'your-domain.com',
           identityType: 'email' | 'mobile' | ... | 'dap-signature:1.3.0',
           segtax: 504,
           dapEntropyUrl: 'https://sym-dist.symitri.net/dapentropy.js',
           dapEntropyTimeout: 1500       // Maximum time for dapentropy to run
         }
       }
     ]
   }
 });
 ```

Please reach out to your Symitri account representative(Prebid@symitri.com) to get provisioned on the DAP platform.


### Testing
To view an example of available segments returned by dap:
```
‘gulp serve --modules=rtdModule,symitriDapRtdProvider,appnexusBidAdapter,sovrnBidAdapter’
```
and then point your browser at:
"http://localhost:9999/integrationExamples/gpt/symitridap_segments_example.html"
