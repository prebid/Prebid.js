# Overview
Module Name: Hadron Analytics Adapter

Module Type: Analytics Adapter

Maintainer: [audigent.com](https://audigent.com)

# Hadron ID

The Hadron ID is a container that publishers and ad tech platforms can use to 
recognise users' segments where 3rd party cookies are not available. 
The Hadron ID is designed to respect users' privacy choices and publishers’ 
preferences throughout the advertising value chain. 
For more information about the Hadron ID and detailed integration docs, please visit 
[our brochure](https://audigent.com/hadron-id).

# Hadron Analytics Registration

The Hadron Analytics Adapter is free to use for our customers. 
Please visit [audigent/hadron-id](https://audigent.com/hadron-id) to request a demo or get more info.

The partners' privacy policy is at [https://audigent.com/privacypolicy/#partners](https://audigent.com/privacypolicy/#partners).

## Hadron Analytics Configuration

First, make sure to add the Hadron Analytics submodule to your Prebid.js package with:

```
gulp build --modules=...,hadronAnalyticsAdapter
```

The following configuration parameters are available:

```javascript
pbjs.enableAnalytics({
    provider: 'hadron',
    options: {
        partnerId: 1234, // change to the Partner ID you got from Audigent
        eventsToTrack: ['auctionEnd','bidWon']
    }
});
```

| Parameter | Scope | Type | Description                                             | Example |
| --- | --- | --- |---------------------------------------------------------| --- |
| provider | Required | String | The name of this module: `hadronAnalytics`              | `hadronAnalytics` |
| options.partnerId | Required | Number | This is the Audigent Partner ID obtained from Audigent. | `1234` |
| options.eventsToTrack | Optional | Array of strings | Overrides the set of tracked events                     | `['auctionEnd','bidWon']` |
