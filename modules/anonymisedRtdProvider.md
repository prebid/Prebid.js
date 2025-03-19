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

The `anonymisedRtdProvider` must be integrated into the publisher's website along with the [Anonymised Marketing Tag](https://support.anonymised.io/integrate/marketing-tag?t=LPukVCXzSIcRoal5jggyeg). One way to install the Marketing Tag is through `anonymisedRtdProvider` by specifying the required [parameters](https://support.anonymised.io/integrate/optional-anonymised-tag-parameters?t=LPukVCXzSIcRoal5jggyeg) in the `tagConfig` object.  

The `tagConfig.clientId` parameter is mandatory for the Marketing Tag to initialize. If `tagConfig` is undefined or empty or `tagConfig.clientId` is undefined, the `anonymisedRtdProvider` will not initialize the Marketing Tag. The publisher's `clientId` is [provided by Anonymised](https://support.anonymised.io/integrate/install-the-anonymised-tag-natively#InstalltheAnonymisedtagnatively-Instructions?t=LPukVCXzSIcRoal5jggyeg).  

For any questions or assistance with integrating Prebid, `anonymisedRtdProvider`, or the Anonymised Marketing Tag, please contact an [Anonymised representative](mailto:support@anonymised.io).

### Testing
To view an example of available segments returned by Anonymised:
```bash
gulp serve --modules=rtdModule,anonymisedRtdProvider,pubmaticBidAdapter
```
And then point your browser at:
"http://localhost:9999/integrationExamples/gpt/anonymised_segments_example.html"
