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
                organizationId: '0', // Required - Organization ID from Adagio.
                site: 'SITE-NAME', // Required - Site Name from Adagio.
                adUnitElementId: 'dfp_banniere-atf', // Required - AdUnit element id. Refers to the adunit id in a page (ex: document.getElementById(adUnitElementId))

                // The following params are limited to 30 characters,
                // and can only contain the following characters:
                // - alphanumeric (A-Z+a-z+0-9, case-insensitive)
                // - dashes `-`
                // - underscores `_`
                // Also, each param can have at most 50 unique active values (case-insensitive).
                placement: 'ATF', // Required - Placement from Adagio. Refers to the placement of an ad unit in a page.
                pagetype: 'ARTICLE', // Required - Page type from Adagio.
                category: 'NEWS', // Recommended - Category from Adagio.
                subcategory: 'SPORT', // Optional - Sub-Category from Adagio.
                environment: 'SITE-MOBILE', // Optional - Environment from Adagio.
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
            key: "site",
            val: function (bidResponse) {
              return bidResponse.site;
            }
          },{
            key: "placement",
            val: function (bidResponse) {
              return bidResponse.placement;
            }
          },
          {
            key: "pagetype",
            val: function (bidResponse) {
              return bidResponse.pagetype;
            }
          },
          {
            key: "category",
            val: function (bidResponse) {
              return bidResponse.category;
            }
          },
          {
            key: "subcategory",
            val: function (bidResponse) {
              return bidResponse.subcategory;
            }
          },
          {
            key: "environment",
            val: function (bidResponse) {
              return bidResponse.environment;
            }
          }
        ]
      }
    }

```