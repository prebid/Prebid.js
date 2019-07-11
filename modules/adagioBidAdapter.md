# Overview

Module Name: Adagio Bid Adapter
Module Type: Adagio Adapter
Maintainer: dev@adagio.io

## Description

Connects to Adagio demand source to fetch bids.

## Test Parameters

```javascript
    var adUnits = [
        {
          code: 'ad-unit_code',
          sizes: [[300, 250], [300, 600]],
          bids: [
            {
              bidder: 'adagio', // Required
              params: {
                siteId: '0', // Required - Site ID from Adagio.
                placementId: '4', // Required - Placement ID from Adagio. Refers to the placement of an ad unit in a page.
                pagetypeId: '343', // Required - Page type ID from Adagio.
                categories: ['IAB12', 'IAB12-2'], // IAB categories of the page.
              }
            }
          ]
        }
    ];

    pbjs.addAdUnits(adUnits);

    pbjs.bidderSettings = {
      adagio: {
        alwaysUseBid: true,
        adserverTargeting: [
          {
            key: "placement",
            val: function (bidResponse) {
              return bidResponse.placementId;
            }
          },
          {
            key: "pagetype",
            val: function (bidResponse) {
              return bidResponse.pagetypeId;
            }
          },
          {
            key: "categories",
            val: function (bidResponse) {
              return bidResponse.categories.join(",");
            }
          }
        ]
      }
    }

```
