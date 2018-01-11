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
                           slaveId: 'adoceanmyaozpniqismex',
                           masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
                           emiter: 'myao.adocean.pl'
                       }
                   }
               ]
           }
       ];
```
