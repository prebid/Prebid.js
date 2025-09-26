# Overview

**Module Name**: Sokalskiy Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: sokalskiySupport@example.com

# Description

The Sokalskiy Bidder Adapter allows publishers to connect with a custom demand source via a local auction endpoint.
This adapter currently supports banner demand and is intended for development, testing, and integration of custom bidding flows.
- Supports display (banner) media type.
- Communicates with a local auction server (our path).
- Returns standard Prebid-compliant bid responses.

# Test Parameters

var adUnits = [
//banner adUnit
  {
    code: 'div-test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'sokalskiy',
      params: {
        placementId: 'test-banner-1'
      }
    }]
  }

];

# Notes

- placementId is a required parameter in the params object.
- Expected server response is an array of bid objects with the following fields:
[
  {
    "requestId": "abc123",
    "cpm": 1.23,
    "width": 300,
    "height": 250,
    "creativeId": "cr1",
    "currency": "USD",
    "ad": "<div>banner html</div>"
  }
]
