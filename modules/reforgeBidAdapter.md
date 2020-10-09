# Overview

**Module Name**: reforge Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: d.kuster@reforge.de

# Description

Module that connects to reforge's bidder for bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'ad-div',
               pbjs: true,
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250]],
                   }
               },
               bids: [
                   {
                       bidder: 'reforge',
                       params: {
                           placementId: 'mediumrectangle-demo',
                           categories: ['Games'] // optional: categories of page
                       }
                   }
               ]
           }, {
               code: 'native-ad-div',
               pbjs: true,
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
                       bidder: 'reforge',
                       params: {
                           placementId: 'native-demo'
                       }
                   }
               ]
           }, {
               code: 'video-ad',
               pbjs: true,
               mediaTypes: {
                   video: {
                       playerSize: [[320, 480]],
                       context: 'instream'
                  }
               },
               bids: [
                   {
                       bidder: 'reforge',
                       params: {
                           placementId: 'instream-demo'
                       }
                   }
               ]
           }
    ];
```
