# Overview

**Module Name**: Ablida Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: d.kuster@ablida.de

# Description

Module that connects to Ablida's bidder for bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'ad-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250]],
                   }
               },
               bids: [
                   {
                       bidder: 'ablida',
                       params: {
                           placementId: 'mediumrectangle-demo',
                           categories: ['automotive', 'news-and-politics'] // optional: categories of page
                       }
                   }
               ]
           }, {
               code: 'native-ad-div',
               mediaTypes: {
                   native: {
                       image: {
                           sendId: true,
                           required: true
                       },
                       title: {
                           required: true
                       },
                       body: {
                           required: true
                       }
                   }
               },
               bids: [
                   {
                       bidder: 'ablida',
                       params: {
                           placementId: 'native-demo'
                       }
                   }
               ]
           }, {
               code: 'video-ad',
               mediaTypes: {
                   video: {
                       playerSize: [[640, 360]],
                       context: 'instream'
                  }
               },
               bids: [
                   {
                       bidder: 'ablida',
                       params: {
                           placementId: 'instream-demo'
                       }
                   }
               ]
           }
    ];
```
