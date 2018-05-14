# Overview
Module Name: Gjirafa Bidder Adapter Module 
Type: Bidder Adapter 
Maintainer: agonq@gjirafa.com

# Description
Gjirafa Bidder Adapter for Prebid.js.

# Test Parameters
var adUnits = [
{
    code: 'test-div',
    sizes: [[728, 90]],  // leaderboard
    bids: [
        {
             bidder: 'gjirafa',
             params: {
				placementId: '71-3'
             }
        }
    ]
},{
    code: 'test-div',
    sizes: [[300, 250]],   // mobile rectangle
    bids: [
        {
             bidder: 'gjirafa',
             params: {
				minCPM: 0.0001,
				minCPC: 0.001,
				explicit: true
             }
        }
    ]
}
];