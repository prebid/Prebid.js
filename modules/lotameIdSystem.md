# Overview

```
Module Name:  Lotame Id System
Module Type:  Id System
Maintainer:   prebid@lotame.com
```

# Description

Retrieve Lotame's Id

# Usage

```
 pbjs.que.push(function() {
    pbjs.setConfig({                
        usersync: {
            userIds: [
            {
                name: 'lotameId',
                storage: {
                    type: 'cookie', // cookie|html5
                    name: '_cc_pano', // The name of the cookie or html5 local storage where the user Id will be stored
                    expires: 7 // How long (in days) the user ID will be stored
                }
            }],
        }
    });
```            