# Overview

Module Name: ceeIdSystem
Module Type: UserID Module
Maintainer: pawel.grudzien@grupawp.pl

# Description

User identification system for WPM

### Prebid Params example

You can configure this submodule in your `userSync.userIds[]` configuration. We have two implementation methods depending on the publisher's needs. The first method we suggest for publishers is to provide appropriate data that will allow you to query the endpoint to retrieve the ceeId token. To query the endpoint correctly, you will need the publisher's ID in the params.publisheId field. In addition, the HEM type, i.e. how the user's email was encoded, we consider two methods: base64 encoding and hex encoding. The value of HEM should be passed in the params.value field.

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'ceeId',
            storage: {
                type: 'cookie',
                name: 'ceeIdToken',
                expires: 7,
                refreshInSeconds: 360
            },
            params: {
                publisherId: '123', // Publisher ID
                type: 'email', // use 'email' if HEM was encoded by base64 or use 'hex' if it was encoded by hex
                value: 'exampleHEMValue', // HEM value
            }
        }]
    }
});
```

The second way is to use a token from a cookie or local storage previously prepared by the publisher. The only thing needed in this approach is to enter the name of the cookie/local storage that the module should use in the params.cookieName field.

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'ceeId',
            storage: {
                type: 'cookie',
                name: 'ceeIdToken',
                expires: 7,
                refreshInSeconds: 360
            },
            params: {
                cookieName: 'name' // Your custom name of token to read from cookies or local storage
            }
        }]
    }
});
```