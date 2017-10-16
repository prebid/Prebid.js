# Overview

Module Name: AdOcean Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@gemius.com

# Description

Module that connects to AdOcean demand sources.
Banner formats are supported.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "adocean",
                       params: {
                           slaveId: 'adoceanmyaoujfrkmihdi',
                           masterId: 'TjoArMYvNzznfyIiD2MuWOGqz0N3gY_GbGvRX5rucGH.W7',
                           emiter: 'myao.adocean.pl'
                       }
                   }
               ]
           }
       ];
```
