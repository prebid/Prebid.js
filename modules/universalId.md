
## Example Configurations
1) Publisher supports OpenID and first party domain cookie storage
```
pbjs.setConfig({
    usersync: {
        universalIds: [{
            name: "openId",
            params: {
                partner: "PARTNER_CODE",
                url: "URL_TO_OPEN_ID_SERVER"
            },
            storage: {
                type: "cookie",  
                name: "pbjs-openid",       // create a cookie with this name
                expires: 60                        // cookie can last for 60 days
            }
        }],
        syncDelay: 5000       // 5 seconds after the first bidRequest()
    }
});
```
2) Publisher supports OpenID with HTML5 local storage, synchronously with the first PBJS
```
pbjs.setConfig({
    usersync: {
        universalIds: [{
            name: "openId",
            params: {
                partner: "PARTNER_CODE",
                url: "URL_TO_OPEN_ID_SERVER"
            },
            storage: {
                type: "html5",
                name: "pbjs-openid"    // set localstorage with this name
            },
            maxDelayToAuction: 500 // implies syncDelay of 0
                           // wait up to 500ms before starting auction
        }]
    }
});
```
3) Publisher has integrated with OpenID on their own and wants to pass the OpenIDs directly through to Prebid.js
```
pbjs.setConfig({
    usersync: {
        universalIds: [{
            name: "openId",
            value: {"tdid": "D6885E90-2A7A-4E0F-87CB-7734ED1B99A3", 
                     "appnexus_id": "1234"}
        }]
    }
});
```

4) Publisher supports PubCommonID and first party domain cookie storage
```
pbjs.setConfig({
    usersync: {
        universalIds: [{
            name: "pubCommonId",
            storage: {
                type: "cookie",  
                name: "_pubCommonId",       // create a cookie with this name
                expires: 1825                           // expires in 5 years
            }
        }]
    }
});
```

5) Publisher supports both OpenID and PubCommonID and first party domain cookie storage
```
pbjs.setConfig({
    usersync: {
        universalIds: [{
            name: "openId",
            params: {
                partner: "PARTNER_CODE",
                url: "URL_TO_OPEN_ID_SERVER"
            },
            storage: {
                type: "cookie",  
                name: "pbjs-openId"       // create a cookie with this name
            }
        },{
            name: "pubCommonId",
            storage: {
                type: "cookie",  
                name: "pbjs-pubCommonId"       // create a cookie with this name
            }
        }],
        syncDelay: 5000       // 5 seconds after the first bidRequest()
    }
});
```

6) DigiTrust example
```
pbjs.setConfig({
    usersync: {
        universalIds: [{
            name: "digitrust",
            params: {
                memberId: "123abc"
            },
            storage: {
                type: "cookie",  
                name: "pbjs-digitrust"       // create a cookie with this name
            }
        }],
        syncDelay: 5000       // 5 seconds after the first bidRequest()
    }
});
```
