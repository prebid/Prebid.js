# Overview

Module Name: tncIdSystem

# Description

TNCID is a shared persistent identifier that improves user recognition compared to both third-party and first-party cookies. This enhanced identification capability enables publishers and advertisers to consistently recognize their audiences, leading to improved monetization and more precise targeting.  The Newco User ID sub-module adds powerful TNCID user identification technology to your Prebid.js bidstream. 
For more details, visit our <a href="https://www.thenewco.tech">website</a> and contact us to request your publisher-id and the on-page tag.

## Prebid Configuration

First, make sure to add the TNCID submodule to your Prebid.js package with: 

```bash
gulp build --modules=tncIdSystem,userId
```

## TNCIdSystem module Configuration 

Disclosure: This module loads external script unreviewed by the prebid.js community

You can configure this submodule in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'tncId',
            params: {
              url: 'TNC-fallback-script-url' // Fallback url, not required if onpage tag is present (ask TNC for it)
            },
            storage: {
              type: "cookie",
              name: "tncid",
              expires: 365 // in days
            }
        }],
        syncDelay: 5000
    }
});
```

## Configuration Params

The following configuration parameters are available:

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this sub-module | `"tncId"` |
| params ||| Details for the sub-module initialization ||
| params.url | Optional | String | TNC script fallback URL - This script is loaded if there is no TNC script on page | `"https://js.tncid.app/remote.min.js"` |
| params.publisherId | Optional | String | Publisher ID used in TNC fallback script - As default Prebid specific Publisher ID is used | `"c8549079-f149-4529-a34b-3fa91ef257d1"` |
