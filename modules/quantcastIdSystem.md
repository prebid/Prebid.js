#### Overview

```
Module Name: Quantcast Id System
Module Type: Id System
Maintainer: asig@quantcast.com
```

#### Description

 The Prebid Quantcast ID module stores a Quantcast ID in a first party cookie. The ID is then made available in the bid request. The ID from the cookie added in the bidstream allows Quantcast to more accurately bid on publisher inventories without third party cookies, which can result in better monetization across publisher sites from Quantcast. And, it’s free to use! For easier integration, you can work with one of our SSP partners, like PubMatic, who can facilitate the legal process as well as the software integration for you.

 Add it to your Prebid.js package with:

 `gulp build --modules=userId,quantcastIdSystem`

 Quantcast’s privacy policies for the services rendered can be found at
  		https://www.quantcast.com/privacy/

 Publishers deploying the module are responsible for ensuring legally required notices and choices for users. 

 The Quantcast ID module will only perform any action and return an ID in situations where:
 1. the publisher has not set a ‘coppa'  flag on the prebid configuration on their site (see [pbjs.setConfig.coppa](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#setConfig-coppa)) 
 2. there is not a IAB us-privacy string indicating the digital property has provided user notice and the user has made a choice to opt out of sale
 3. if GDPR applies, an IAB TCF v2 string exists indicating that Quantcast does not have consent for purpose 1 (cookies, device identifiers, or other information can be stored or accessed on your device for the purposes presented to you), or an established legal basis (by default legitimate interest) for purpose 10 (your data can be used to improve existing systems and software, and to develop new products).

 #### Quantcast ID Configuration

 | Param under userSync.userIds[] | Scope | Type | Description | Example |
 | --- | --- | --- | --- | --- |
 | name | Required | String | `"quantcastId"` | `"quantcastId"` |
 | params | Optional | Object | Details for Quantcast initialization. | |
 | params.ClientID | Optional | String | Optional parameter for Quantcast prebid managed service partners. The parameter is not required for websites with Quantcast Measure tag. Reach out to Quantcast for ClientID if you are not an existing Quantcast prebid managed service partner: quantcast-idsupport@quantcast.com.  | |


 #### Quantcast ID Example

```js
 pbjs.setConfig({
     userSync: {
         userIds: [{
             name: "quantcastId"
         }]
     }
 });
```
