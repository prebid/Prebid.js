# Flashtalking's FTrack Identity Framework User ID Module

*The FTrack Identity Framework User ID Module allows publishers to take advantage of Flashtalking's FTrack ID during the bidding process.*

**THE ONLY COMPLETE SOLUTION FOR COOKIELESS MEASUREMENT & PERSONALIZATION**

Flashtalking is the world’s first ad serving platform to function without cookies to orchestrate client identity across buy-side ID spaces for measurement and personalization. With over 120 active global advertisers, our cookieless identity framework is market-ready and includes privacy controls to ensure consumer notification and choice on every impression.

### [FTrack](https://www.flashtalking.com/identity-framework#FTrack)

Flashtalking’s cookieless tracking technology uses probabilistic device recognition to derive a privacy-friendly persistent ID for each device.

**PROVEN**  
With over 120 brands using FTrack globally, Flashtalking has accumulated the largest cookieless footprint in the industry.

**ANTI-FINGERPRINTING**  
FTrack operates in strict compliance with [Google’s definition of anti-fingerprinting](https://blog.google/products/ads-commerce/2021-01-privacy-sandbox/). FTrack does not access PII or sensitive information and provides consumers with notification and choice on every impression. We do not participate in the types of activities that most concern privacy advocates (profiling consumers, building audience segments, and/or monetizing consumer data).

**GDPR COMPLIANT**  
Flashtalking is integrated with the IAB EU’s Transparency & Consent Framework (TCF) and operates on a Consent legal basis where required.  As a Data Processor under GDPR, Flashtalking does not combine data across customers nor sell data to third parties.

**ACCURATE**  
FTrack’s broad adoption combined with the maturity of the models (6+ years old) gives Flashtalking the global scale with which to maintain a high degree of model resolution and accuracy.

**DURABLE**  
As new IDs start to proliferate, they will serve as new incremental signals for our models.

---

### Support or Maintenance:

Questions? Comments? Bugs? Praise? Please contact FlashTalking's Prebid Support at [prebid-support@flashtalking.com](mailto:prebid-support@flashtalking.com)

---

### FTrack User ID Configuration

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'FTrack',
      params: {
        url: 'https://d9.flashtalking.com/d9core' // required, if not populated ftrack will not run
      },
      storage: {
        type: 'html5',           // "html5" is the required storage type
        name: 'FTrackId',        // "FTrackId" is the required storage name
        expires: 90,             // storage lasts for 90 days
        refreshInSeconds: 8*3600 // refresh ID every 8 hours to ensure it's fresh
      }
    }],
    auctionDelay: 50             // 50ms maximum auction delay, applies to all userId modules
  }
});
```




| Param under userSync.userIds[] | Scope | Type | Description | Example |
| :-- | :-- | :-- | :-- | :-- |
| name | Required | String | The name of this module: `"FTrack"` | `"FTrack"` |
| storage | Required | Object | Storage settings for how the User ID module will cache the FTrack ID locally | |
| storage.type | Required | String | This is where the results of the user ID will be stored. FTrack **requires** `"html5"`. | `"html5"` |
| storage.name | Required | String | The name of the local storage where the user ID will be stored. FTrack **requires** `"FTrackId"`. | `"FTrackId"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. FTrack recommends `90`. | `90` |
| storage.refreshInSeconds | Optional | Integer | How many seconds until the FTrack ID will be refreshed. FTrack strongly recommends 8 hours between refreshes | `8*3600` |

**ATTENTION:** As of Prebid.js v4.14.0, FTrack requires `storage.type` to be `"html5"` and `storage.name` to be `"FTrackId"`. Using other values will display a warning today, but in an upcoming release, it will prevent the FTrack module from loading. This change is to ensure the FTrack module in Prebid.js interoperates properly with the [FTrack](https://www.flashtalking.com/identity-framework#FTrack) and to reduce the size of publishers' first-party cookies that are sent to their web servers. If you have any questions, please reach out to us at [prebid-support@flashtalking.com](mailto:prebid-support@flashtalking.com).

---

### Privacy Policies.

Complete information available on the Flashtalking [privacy policy page](https://www.flashtalking.com/privacypolicy).

#### OPTING OUT OF INTEREST-BASED ADVERTISING & COLLECTION OF PERSONAL INFORMATION

Please visit our [Opt Out Page](https://www.flashtalking.com/optout).

#### REQUEST REMOVAL OF YOUR PERSONAL DATA (WHERE APPLICABLE)

You may request by emailing [mailto:privacy@flashtalking.com](privacy@flashtalking.com).

#### GDPR

In its current state, Flashtalking’s FTrack Identity Framework User ID Module does not create an ID if a user's consentData is "truthy" (true, 1). In other words, if GDPR applies in any way to a user, FTrack does not create an ID. 