# Overview
Module Name: MallTV Bidder Adapter Module 
Type: Bidder Adapter 
Maintainer: drilon@gjirafa.com

# Description
MallTV Bidder Adapter for Prebid.js.

# Test Parameters
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 300]]
            }
        },
        bids: [
            {
                 bidder: 'malltv',
                 params: {
                    propertyId: '105135',
                    placementId: '846835'
                }
            }
        ]
    },
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 300]]
            }
        },
        bids: [
            {
                 bidder: 'malltv',
                 params: {
                    propertyId: '105135',
                    placementId: '846835',
                    contents: [ //optional
                        { 
                            type: 'video',
                            id: '123'
                        }
                    ]
                }
            }
        ]
    }
];
