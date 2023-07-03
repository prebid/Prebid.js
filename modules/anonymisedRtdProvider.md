### Overview

Anonymised is a data anonymization technology for privacy-preserving advertising. Publishers and advertisers are able to target and retarget custom audience segments covering 100% of consented audiences.
Anonymised’s Real-time Data Provider automatically obtains segment IDs from the Anonymised on-domain script (via localStorage) and passes them to the bid-stream.

### Integration

 - Build the anonymisedRtd module into the Prebid.js package with:

 ```bash
 gulp build --modules=anonymisedRtdProvider,...
 ```

 - Use `setConfig` to instruct Prebid.js to initilaize the anonymisedRtdProvider module, as specified below.

### Configuration

```javascript
 pbjs.setConfig({
   realTimeData: {
     dataProviders: [
       {
         name: "anonymised",
         waitForIt: true,
         params: {
           cohortStorageKey: "cohort_ids"       
         }
       }
     ]
   }
 });
 ```

Please note that anonymisedRtdProvider should be integrated into the publisher website along with the [Anonymised Marketing Tag](https://support.anonymised.io/integrate/marketing-tag).
Please reach out to Anonymised [representative](mailto:support@anonymised.io) if you have any questions or need further help to integrate Prebid, anonymisedRtdProvider, and Anonymised Marketing Tag

### Testing
To view an example of available segments returned by Anonymised:
```bash
gulp serve --modules=rtdModule,anonymisedRtdProvider,pubmaticBidAdapter
```
and then point your browser at:
"http://localhost:9999/integrationExamples/gpt/anonymised_segments_example.html"
