### Overview

ID Ward is a data anonymization technology for privacy-preserving advertising. Publishers and advertisers are able to target and retarget custom audience segments covering 100% of consented audiences. 
ID Ward’s Real-time Data Provider automatically obtains segment IDs from the ID Ward on-domain script (via localStorage) and passes them to the bid-stream.

### Integration

 1) Build the idWardRtd module into the Prebid.js package with:

 ```
 gulp build --modules=idWardRtdProvider,...
 ```

 2) Use `setConfig` to instruct Prebid.js to initilaize the idWardRtdProvider module, as specified below.

### Configuration

```
 pbjs.setConfig({
   realTimeData: {
     dataProviders: [
       {
         name: "idWard",
         waitForIt: true,
         params: {
           cohortStorageKey: "cohort_ids",
           segtax: <taxonomy_name>,           
         }
       }
     ]
   }
 });
 ```

Please note that idWardRtdProvider should be integrated into the publisher website along with the [ID Ward Pixel](https://publishers-web.id-ward.com/pixel-integration).
Please reach out to Id Ward representative(support@id-ward.com) if you have any questions or need further help to integrate Prebid, idWardRtdProvider, and Id Ward Pixel

### Testing
To view an example of available segments returned by Id Ward:
```
‘gulp serve --modules=rtdModule,idWardRtdProvider,pubmaticBidAdapter
```
and then point your browser at:
"http://localhost:9999/integrationExamples/gpt/idward_segments_example.html"
