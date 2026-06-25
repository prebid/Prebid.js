# Overview

```
Module Name:  Lotame Panorama Id System
Module Type:  Id System
Maintainer:   prebid@lotame.com
```

# Description

Retrieve the Lotame Panorama Id

# Usage

```
 pbjs.que.push(function() {
    pbjs.setConfig({                
        usersync: {
            userIds: [
                {
                    name: 'lotamePanoramaId',
                    storage: {
                        name: 'panoramaId',
                        type: 'cookie&html5',
                        expires: 7
                    }
                }
            ],
        }
    });
```

| Parameters under `userSync.userIds[]` | Scope | Type | Description | Example |
| ---| --- | --- | --- | --- |
| name | Required | String | Name for the Lotame ID submodule | `"lotamePanoramaId"` |
| storage | Optional | Object | Configures how to cache User IDs locally in the browser | See [storage settings](#storage-settings) |


### Storage Settings

The following settings are available for the `storage` property in the `userSync.userIds[]` object. Please note that inclusion of the `storage` property is optional, but if provided, all three attributes listed below *must* be specified:

| Param name | Scope | Type | Description | Example   |
| --- | --- | --- | --- | --- |
| name | Required | String| Name of the cookie or localStorage where the user ID will be stored; *must* be `"panoramaId"` | `"panoramaId"` |
| type | Required | String | `"cookie&html5"` (preferred)  or `"cookie"` or `"html5"` | `"cookie&html5"` |
| expires | Required | Number | How long (in days) the user ID information will be stored. Lotame recommends `7`. | `7` |

