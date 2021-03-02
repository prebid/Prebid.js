# Overview

```
Module Name: Reforge Bidder Adapter
Module Type: Bidder Adapter
Maintainer: amit.kumar@svgmedia.in
```

# Description

Connect to reforge for bids.

This adapter requires setup and approval from the reforge team.

# Test Parameters - Use case #1 - Out-Stream with targeting example and default rendering options
```
       var uniqid = 'reqid_' + Math.random().toString(36).substr(2, 9);

       var sizes = [
           [300, 250]
       ];
       var code = '/19968336/header-bid-tag-1';
       var PREBID_TIMEOUT = 3000;
       var FAILSAFE_TIMEOUT = 3000;

       var adUnits = [
       {


           code: code,
               mediaTypes: {
                   banner: {
                       sizes: [
                           [300, 480]
                       ]
                   }
               },
               bids: [{
                   bidder: 'reforge',
                   params: {
                       id:uniqid,
                       bidfloor:0,
                       tagid:'40',
                       rtb_seat_id:'0011',
                       secret_key:'wzP8eKAVkc',
                       sitename:'Weather- The Weather Channel',
                       sitecat:  "IAB3-1,IAB3-2,IAB3-3",
                       keywords: 'keyword-a,keyword-b,keyword-c',
                       site_content_title: 'Endgame',
                       site_content_genre: 'genre1',
                       site_content_album: 'album',
                       site_content_context: 1,
                       site_content_contentrating: 'MPAA',
                       site_content_keywords: 'keyword-a,keyword-b,keyword-c',
                       site_content_language: 'en',
                       bcat: 'IAB3-3,IAB3-2,IAB3-1',
                       user_yob: 1993,
                       user_gender: 'M',
                      
                   }
               }]
             
       }
       ];