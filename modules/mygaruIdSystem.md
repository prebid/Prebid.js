## Mygaru User ID Submodule

MyGaru provides single use tokens as a UserId for SSPs and DSP that consume  telecom DMP data.  

## Building Prebid with Mygaru ID Support

First, make sure to add submodule to your Prebid.js package with:

```
gulp build --modules=userId,mygaruIdSystem
```
Params configuration is not required. 
Also mygaru is async, in order to get ids for initial ad auctions you need to add auctionDelay param to userSync config.

```javascript
pbjs.setConfig({
    userSync: {
        auctionDelay: 100,
        userIds: [{
            name: 'mygaruId',
        }]
    }
});
```
