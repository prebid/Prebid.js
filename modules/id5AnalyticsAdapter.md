# Overview
Module Name: ID5 Analytics Adapter

Module Type: Analytics Adapter

Maintainer: [id5.io](https://id5.io)

# ID5 Universal ID

The ID5 Universal ID is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. The ID5 Universal ID is designed to respect users' privacy choices and publishers’ preferences throughout the advertising value chain. For more information about the ID5 Universal ID and detailed integration docs, please visit [our documentation](https://support.id5.io/portal/en/kb/articles/prebid-js-user-id-module).

# ID5 Analytics Registration

The ID5 Analytics Adapter is free to use during our Beta period, but requires a simple registration with ID5. Please visit [id5.io/universal-id](https://id5.io/universal-id) to sign up and request your ID5 Partner Number to get started. If you're already using the ID5 Universal ID, you may use your existing Partner Number with the analytics adapter.

The ID5 privacy policy is at [https://www.id5.io/platform-privacy-policy](https://www.id5.io/platform-privacy-policy).

## ID5 Analytics Configuration

First, make sure to add the ID5 Analytics submodule to your Prebid.js package with:

```
gulp build --modules=...,id5AnalyticsAdapter
```

The following configuration parameters are available:

```javascript
pbjs.enableAnalytics({
    provider: 'id5Analytics',
    options: {
        partnerId: 1234, // change to the Partner Number you received from ID5
        eventsToTrack: ['auctionEnd','bidWon']
    }
});
```

| Parameter | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| provider | Required | String | The name of this module: `id5Analytics` | `id5Analytics` |
| options.partnerId | Required | Number | This is the ID5 Partner Number obtained from registering with ID5. | `1234` |
| options.eventsToTrack | Optional | Array of strings | Overrides the set of tracked events | `['auctionEnd','bidWon']` |
