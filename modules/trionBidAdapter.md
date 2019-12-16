# Overview

**Module Name**: Trion Interactive Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: mgroh@trioninteractive.com  
**Publisher Contact**: publishers@trioninteractive.com 

# Description

This module connects to Trion's demand sources. It supports display, outstream, and rich media formats.  
Trion will provide ``pubId`` and ``sectionId`` that are specific to your ad type.  
Please reach out to ``publishers@trioninteractive.com`` to set up a trion account and above ids.  
Use bidder code ```trion``` for all Trion traffic.

# Test Parameters
```
    var adUnits = [
           {
               code: 'ad-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: 'trion',
                       params: {
                           pubId: '12345',
                           sectionId: '1',
                           re : 'http://clicktrackingurl.com?re='// optional
                       }
                   }
               ]
           }
       ];
```