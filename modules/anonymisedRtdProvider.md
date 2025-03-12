### Overview

Anonymised is a data anonymization technology for privacy-preserving advertising. Publishers and advertisers are able to target and retarget custom audience segments covering 100% of consented audiences.
Anonymised’s Real-time Data Provider automatically obtains segment IDs from the Anonymised on-domain script (via localStorage) and passes them to the bid-stream.

### Integration

 - Build the anonymisedRtd module into the Prebid.js package with:

 ```bash
 gulp build --modules=rtdModule,anonymisedRtdProvider,...
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
           cohortStorageKey: "cohort_ids",
           bidders: ["appnexus", "onetag", "pubmatic", "smartadserver", ...],
           segtax: 1000,
           tagConfig: {
            clientId: 'testId'
            //The rest of the Anonymised Marketing Tag parameters goes here
           }
         }
       }
     ]
   }
 });
 ```

 ### Config Syntax details
| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | `String` | Anonymised Rtd module name | 'anonymised' always|
| waitForIt | `Boolean` | Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false |
| params.cohortStorageKey | `String` | the `localStorage` key, under which Anonymised Marketing Tag stores the segment IDs | 'cohort_ids' always |
| params.bidders | `Array` | Bidders with which to share segment information | Optional |
| params.segtax | `Integer` | The taxonomy for Anonymised | '1000' always |
| params.tagConfig | `Object` | Configuration for the Anonymised Marketing Tag | Optional. Defaults to `{}`. |
| params.tagUrl | `String` | The URL of the Anonymised Marketing Tag script | Optional. Defaults to `https://static.anonymised.io/light/loader.js`. |

Please note that anonymisedRtdProvider should be integrated into the publisher website along with the [Anonymised Marketing Tag](https://support.anonymised.io/integrate/marketing-tag). There are several different ways to install the Anonymised Marketing Tag, one of them is via anonymisedRtdProvider. To do so, please provide the Anonymised Marketing Tag [parameters](https://support.anonymised.io/integrate/optional-anonymised-tag-parameters) in the `tagConfig` object. If the `tagConfig` object is empty or undefined, the Anonymised Marketing Tag will not be initialized by the anonymisedRtdProvider.
Please reach out to Anonymised [representative](mailto:support@anonymised.io) if you have any questions or need further help to integrate Prebid, anonymisedRtdProvider, and Anonymised Marketing Tag

### Testing
To view an example of available segments returned by Anonymised:
```bash
gulp serve --modules=rtdModule,anonymisedRtdProvider,pubmaticBidAdapter
```
And then point your browser at:
"http://localhost:9999/integrationExamples/gpt/anonymised_segments_example.html"
