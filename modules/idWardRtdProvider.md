### Overview

 ID Ward Real time data Provider automatically obtains and submit audience segments IDs to the bid-stream. 

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

Please note that idWardRtdProvider should be integrated into the publisher website along with the ID Ward Pixel. See the integration guide [here](https://publishers-web.id-ward.com/pixel-integration).