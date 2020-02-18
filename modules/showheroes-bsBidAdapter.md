# Overview

Module Name: ShowHeroes Bidder Adapter

Module Type: Bidder Adapter

Alias: showheroesBs

Maintainer: tech@showheroes.com

# Description

Module that connects to ShowHeroes demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'video',
               mediaTypes: {
                   video: {
                       playerSize: [640, 480],
                       context: 'instream',
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',
                           vpaidMode: true // by default is 'false'
                       }
                   }
               ]
           },
           {
               // if you have adSlot renderer or oustream should be returned as banner
               code: 'video',
               mediaTypes: {
                   video: {
                       playerSize: [640, 480],
                       context: 'outstream',
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',
                       }
                   }
               ]
           },
           {
               code: 'video',
               mediaTypes: {
                   video: {
                       playerSize: [640, 480],
                       context: 'outstream',
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',

                           outstreamOptions: {
                               // Required for the outstream renderer to exact node, one of
                               iframe: 'iframe_id',
                               // or
                               slot: 'slot_id'
                           }
                       }
                   }
               ]
           },
           {
               code: 'video',
               mediaTypes: {
                   video: {
                       playerSize: [640, 480],
                       context: 'outstream',
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',

                           outstreamOptions: {
                               // Custom outstream rendering function
                               customRender: function(bid, embedCode) {
                                   // Example with embedCode
                                   someContainer.appendChild(embedCode);

                                   // bid config data
                                   var vastUrl = bid.renderer.config.vastUrl;
                                   var vastXML = bid.renderer.config.vastXML;
                                   var videoWidth = bid.renderer.config.width;
                                   var videoHeight = bid.renderer.config.height;
                                   var playerId = bid.renderer.config.playerId;
                               },
                           }
                       }
                   }
               ]
           },
           {
               code: 'banner',
               mediaTypes: {
                   banner: {
                       sizes: [[640, 480]],
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',
                       }
                   }
               ]
           }
       ];
```
