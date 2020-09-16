# Overview
Module Name: Gjirafa Bidder Adapter Module 
Type: Bidder Adapter 
Maintainer: drilon@gjirafa.com

# Description
Gjirafa Bidder Adapter for Prebid.js.

# Test Parameters
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[728, 90]]
            }
        },
        bids: [
            {
                 bidder: 'gjirafa',
                 params: {
                    propertyId: '105227',
                    placementId: '846841'
                }
            }
        ]
    },
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [
            {
                 bidder: 'gjirafa',
                 params: {
                    propertyId: '105227',
                    placementId: '846848',
                    contents: [ //optional
                        { 
                            type: 'article',
                            id: '123'
                        }
                    ]
                }
            }
        ]
    }
];
