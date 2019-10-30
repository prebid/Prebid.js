# Overview

```
Module Name:  Proxistore Bid Adapter
Module Type:  Bidder Adapter
GDPR compliant: true
```

# Description

Connects any publisher to Proxistore.com's exchange for bids.

The present document is available [online](https://abs.proxistore.com/scripts/proxistore-prebid-adapter.md);
the companion Javascript file is available [online](https://abs.proxistore.com/scripts/proxistore-prebid-adapter.js) as well. 

# Sample Ad Unit: For Publishers

Parameters:
* website: __Required__ - Publisher website as registered with Proxistore - __Each publisher must get this value from Proxistore__
* language: __Required__ - Publisher website language - Must be one of __fr__,__nl__,__es__

Example for a website 'example.com' in French

```
var adUnits = [
{
    code: 'half-page',
    mediaTypes: {
            banner: {
                sizes: [[300,600]]
        }
    },  
    bids: [
    {
        bidder: 'proxistore',
        params: {
            website: 'example.com',
            language: 'fr'
        }
    }]
},
{
    code: 'rectangle',
    mediaTypes: {
            banner: {
                sizes: [[300,250]]
        }
    },   
    bids: [{
        bidder: 'proxistore',
        params: {
            website: 'example.com',
            language: 'fr'
        }
    }]
},
{   
    code: 'leaderboard',
    mediaTypes: {
            banner: {
                sizes: [[970,250]]
        }
    },  
    bids: [{
        bidder: 'proxistore',
        params: {
            website: 'example.com',
            language: 'fr'
        }
    }]
}
];
```
