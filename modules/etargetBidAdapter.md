# Overview

Module Name: ETARGET Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@etarget.sk

# Description

Module that connects to ETARGET demand sources to fetch bids.
Banner and video formats are supported.

# Test Parameters
```
    var adUnits = [
           {
               code: 'div-gpt-ad-1460505748561-0', // ID of elemnt where ad will be shown
               sizes: [[300, 250], [300, 300], [300, 600], [160, 600]],  // a display size
               bids: [
                   {
                       bidder: "etarget",
                       params: {
                           country: 1, //require // specific to your country {1:'sk',2:'cz',3:'hu',4:'ro',5:'rs',6:'bg',7:'pl',8:'hr',9:'at',11:'de',255:'en'}
                           refid: '12345' // require // you can create/find this ID in Our portal administration on https://sk.etarget-media.com/partner/
                       }
                   }
               ]
           }
       ];
```
