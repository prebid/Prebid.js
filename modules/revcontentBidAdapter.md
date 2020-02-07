# Overview

Module Name: Revcontent Adapater
Maintainer: aziz@revcontent.com

# Description

Revcontent Adpater

# Test Parameters
```
    /*
    Supported sizes:
    ----------------
    300x250 - Medium rectangle
    728x90 - Leaderboard
    300x600 - Half page or large skyscraper
    */
    var size = {width: 300, height: 250};

    var adUnits = [{
        code: '/19968336/header-bid-tag-1',
        sizes: sizes,
        mediaTypes: {
            native: {
                native: {
                    image: {
                        required: false,
                        sizes: sizes[0]
                    },
                    title: {
                        required: false,
                        len: 140
                    },
                    clickUrl: {
                        required: false
                    },
                    sponsoredBy: {
                        id: 5,
                        name: 'data',
                        type: 1
                    }
                }
            }
        },
        bids: [{
            bidder: 'revcontent',
            params: {
                size: size,

                /* -> Modify this section <- */
                apiKey: '8a33sdfsdfdsfsdfssss544f8sdfsdfsdfd3b1c',  // Required
                userId: 69565,                                      // Required
                widgetId: 599995,                                   // Optional
                domain: 'test.com',                                 // Optional - Default referral hostname
                endpoint: 'trends.revcontent.com'                   // Optional - Debug - Set different endpoint
                bidfloor: 0.1,                                      // Optional - BidFloor - Default 0.1
                /*
                Optional - Set different template. Template variables: 
                           {clickUrl} -> Target Url
                           {image} -> Image URL
                           {title} -> Ad Title
                */
                template: '<a href="{clickUrl}" rel="nofollow sponsored"  target="_blank" style="    border: 1px solid #eee;    width: 298px;    height: 248px;    display: block;"><div style="background-image:url({image});width: 300px;height: 165px;background-repeat: none;background-size: cover;"><div style="position: absolute;top: 160px;left:12px"><h1 style="color: #000;font-family: Arial, sans-serif;font-size: 19px; position: relative; width: 290px;">{title}</h1> <div style="border:1px solid #000;text-align:center;width:94%;font-family:Verdana;font-size:12px;color:#000">SEE MORE</div></div></div></a>'
            }
        }]
    }];
```
