# Overview

```
name: AIDEM Adapter
type: Bidder Adapter
support: prebid@aidem.com
biddercode: aidem
```

# Description
This module connects publishers to AIDEM demand.

This module is GDPR and CCPA compliant, and no 3rd party userIds are allowed.


## Global Bid Params
| Name          | Scope    | Description             | Example    | Type     |
|---------------|----------|-------------------------|------------|----------|
| `siteId`      | required | Unique site ID          | `'ABCDEF'` | `String` |
| `publisherId` | required | Unique publisher ID     | `'ABCDEF'` | `String` |
| `placementId` | optional | Unique publisher tag ID | `'ABCDEF'` | `String` |
| `rateLimit`   | optional | Limit the volume sent to AIDEM. Must be between 0 and 1 | `0.6`      | `Number`   |


### Banner Bid Params
| Name       | Scope    | Description              | Example                   | Type    |
|------------|----------|--------------------------|---------------------------|---------|
| `sizes`    | required | List of the sizes wanted | `[[300, 250], [300,600]]` | `Array` |


### Video Bid Params
| Name          | Scope    | Description                             | Example         | Type      |
|---------------|----------|-----------------------------------------|-----------------|-----------|
| `context`     | required | One of instream, outstream, adpod       | `'instream'`    | `String`  |
| `playerSize`  | required | Width and height of the player          | `'[640, 480]'`  | `Array`   |
| `maxduration` | required | Maximum video ad duration, in seconds   | `30`            | `Integer` |
| `minduration` | required | Minimum video ad duration, in seconds   | `5`             | `Integer` |
| `mimes`       | required | List of the content MIME types supported by the player    | `["video/mp4"]` | `Array`   |
| `protocols`   | required | An array of supported video protocols. At least one supported protocol must be specified, where: `2` = VAST 2.0 `3` = VAST 3.0 `5` = VAST 2.0 wrapper `6` = VAST 3.0 wrapper | `2`             | `Array`   |


### Additional Config
| Name                | Scope    | Description                                             | Example | Type      |
|---------------------|----------|---------------------------------------------------------|---------|-----------|
| `coppa`             | optional | Child Online Privacy Protection Act                     | `true`  | `Boolean` |
| `consentManagement` | optional | [Consent Management Object](#consent-management-object) | `{}`    | `Object`  |


### Consent Management Object
| Name   | Scope    | Description                                                                                      | Example | Type     |
|--------|----------|--------------------------------------------------------------------------------------------------|---------|----------|
| `gdpr` | optional | GDPR Object see [Prebid.js doc](https://docs.prebid.org/dev-docs/modules/consentManagement.html) | `{}`    | `Object` |
| `usp`  | optional | USP Object see [Prebid.js doc](https://docs.prebid.org/dev-docs/modules/consentManagementUsp.html)                                                                     | `{}`    | `Object` |


### Example Banner ad unit
```javascript
var adUnits = [{
    code: 'banner-prebid-test-site',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 600],
                [300, 250]
            ]
        }
    },
    bids: [{
          bidder: 'aidem',
          params: {
            siteId: 'prebid-test-siteId',
            publisherId: 'prebid-test-publisherId',
          },
    }]
}];
```

### Example Video ad unit
```javascript
var adUnits = [{
    code: 'video-prebid-test-site',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        maxduration: 30,
        minduration: 5,
        mimes: ["video/mp4"],
        protocols: 2
      }
    },
    bids: [{
          bidder: 'aidem',
          params: {
            siteId: 'prebid-test-siteId',
            publisherId: 'prebid-test-publisherId',
          },
    }]
}];
```

### Example GDPR Consent Management
```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function (){
  pbjs.setConfig({
    consentManagement: {
      gdpr:{
        cmpApi: 'iab'
      }
    }
  });
})
```


### Example USP Consent Management
```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function (){
  pbjs.setConfig({
    consentManagement: {
      usp:{
        cmpApi: 'static',
        consentData:{
          getUSPData:{
            uspString: '1YYY'
          }
        }
      }
    }
  });
})
```


### Setting First Party Data (FPD)
```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function (){
  pbjs.setConfig({
    ortb2: {
      site: {
        cat: ['IAB2'],
        sectioncat: ['IAB2-2'],
        keywords: 'power tools, drills'
      },
    }
  });
})
```

### Supported Media Types
| Type   | Support                                                            |
|--------|--------------------------------------------------------------------|
| Banner | Support all [AIDEM Sizes](https://kb.aidem.com/ssp/lists/adsizes/) | 
| Video  | Support all [AIDEM Sizes](https://kb.aidem.com/ssp/lists/adsizes/) | 


# Setup / Dev Guide
```shell
nvm use

npm install

gulp build --modules=aidemBidAdapter

gulp serve --modules=aidemBidAdapter

# Open a chrome browser with no ad blockers enabled, and paste in this URL. The `pbjs_debug=true` is needed if you want to enable `loggerInfo` output on the `console` tab of Chrome Developer Tools.
http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true
```

If you need to run the tests suite but do *not* want to have to build the full adapter and serve it, simply run:
```shell
gulp test --file "test/spec/modules/aidemBidAdapter_spec.js"
```


For video: gulp serve --modules=aidemBidAdapter,dfpAdServerVideo

# FAQs
### How do I view AIDEM bid request?
Navigate to a page where AIDEM is setup to bid. In the network tab,
search for requests to `zero.aidemsrv.com/bid/request`.
