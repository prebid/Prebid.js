# Overview

```
Module Name: Orbitsoft Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@orbitsoft.com
```

# Description

Module that connects to Orbitsoft's demand sources. The “sizes” option is not supported, and the size of the ad depends on the placement settings. You can use an optional “style” parameter to set the appearance only for text ad. Specify the “requestUrl” param to your Orbitsoft ad server header bidding endpoint.  

# Test Parameters
```
    var adUnits = [
           {
               code: 'orbitsoft-div',
               bids: [
                   {
                       bidder: "orbitsoft",
                       params: {
                           placementId: '132',
                           requestUrl: 'https://orbitsoft.com/php/ads/hb.php',
                           style: {
                               title: {
                                   family: 'Tahoma',
                                   size: 'medium',
                                   weight: 'normal',
                                   style: 'normal',
                                   color: '0053F9'
                               },
                               description: {
                                   family: 'Tahoma',
                                   size: 'medium',
                                   weight: 'normal',
                                   style: 'normal',
                                   color: '0053F9'
                               },
                               url: {
                                   family: 'Tahoma',
                                   size: 'medium',
                                   weight: 'normal',
                                   style: 'normal',
                                   color: '0053F9'
                               },
                               colors: {
                                   background: 'ffffff',
                                   border: 'E0E0E0',
                                   link: '5B99FE'
                               }
                           },
                           customParams: {
                                macro_name: "macro_value"
                           }
                       }
                   }
               ]
           }
       ];
```