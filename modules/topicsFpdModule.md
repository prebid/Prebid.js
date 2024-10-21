# Overview

Module Name: topicsFpdModule

# Description
Purpose of this module is to call the Topics API (document.browsingTopics()) which will fetch the first party domain as well third party domain(Iframe) topics data which will be sent onto user.data in bid stream. 

The intent of the Topics API is to provide callers (including third-party ad-tech or advertising providers on the page that run script) with coarse-grained advertising topics that the page visitor might currently be interested in. 

Topics Module(topicsFpdModule) should be included in prebid final package to call topics API.
Module topicsFpdModule helps to call the Topics API which will send topics data in bid stream (onto user.data)

```
try {
    if ('browsingTopics' in document && document.featurePolicy.allowsFeature('browsing-topics')) {
        topics = document.browsingTopics();
    }
} catch (e) {
    console.error('Could not call topics API', e);
}
```

# Topics Iframe Configuration

Topics iframe implementation is the enhancements of existing module under topicsFpdModule.js where different bidders will call the topic API under their domain to fetch the topics for respective domain and the segment data will be part of ORTB request under user.data object. Default config is maintained in the module itself. 

Below are the configuration which can be used to configure and override the default config maintained in the module.

```
pbjs.setConfig({
    userSync: {
        ...,
        topics: { 
            maxTopicCaller: 3, // SSP rotation 
            bidders: [{
                bidder: 'pubmatic',
                iframeURL: 'https://ads.pubmatic.com/AdServer/js/topics/topics_frame.html',
                expiry: 7 // Configurable expiry days
            },{
                bidder: 'rtbhouse',
                iframeURL: 'https://topics.authorizedvault.com/topicsapi.html',
                expiry: 7 // Configurable expiry days
            },{
                bidder: 'openx',
                iframeURL: 'https://pa.openx.net/topics_frame.html',
                expiry: 7 // Configurable expiry days
            },{
                bidder: 'rubicon',
                iframeURL: 'https://rubicon.com:8080/topics/fpd/topic.html', // dummy URL
                expiry: 7 // Configurable expiry days
            },{
                bidder: 'appnexus',
                iframeURL: 'https://appnexus.com:8080/topics/fpd/topic.html', // dummy URL
                expiry: 7 // Configurable expiry days
            }, {
                bidder: 'onetag',
                iframeURL: 'https://onetag-sys.com/static/topicsapi.html',
                expiry: 7 // Configurable expiry days
            }, {
                bidder: 'taboola',
                iframeURL: 'https://cdn.taboola.com/libtrc/static/topics/taboola-prebid-browsing-topics.html',
                expiry: 7 // Configurable expiry days
            }, {
                bidder: 'discovery',
                iframeURL: 'https://api.popin.cc/topic/prebid-topics-frame.html',
                expiry: 7 // Configurable expiry days
            }, {
                bidder: 'undertone',
                iframeURL: 'https://creative-p.undertone.com/spk-public/topics_frame.html',
                expiry: 7 // Configurable expiry days
            }]
        }
        ....
    }
})
```

## Topics Config Descriptions

| Field | Required? | Type | Description |
|---|---|---|---|
| topics.maxTopicCaller | no | integer | Defines the maximum numbers of Bidders Iframe which needs to be loaded on the publisher page. Default is 1 which is hardcoded in Module. Eg: topics.maxTopicCaller is set to 3. If there are 10 bidders configured along with their iframe URLS, random 3 bidders iframe URL is loaded which will call TOPICS API. If topics.maxTopicCaller is set to 0, it will load random 1(default) bidder iframe atleast. |
| topics.bidders | no | Array of objects  | Array of topics callers with the iframe locations and other necessary informations like bidder(Bidder code) and expiry. Default Array of topics in the module itself.|
| topics.bidders[].bidder | yes | string  | Bidder Code of the bidder(SSP).  |
| topics.bidders[].iframeURL | yes | string  | URL which is hosted on bidder/SSP/third-party domains which will call Topics API.  |
| topics.bidders[].expiry | no | integer  | Max number of days where Topics data will be persist. If Data is stored for more than mentioned expiry day, it will be deleted from storage. Default is 21 days which is hardcoded in Module. |
