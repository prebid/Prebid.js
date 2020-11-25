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
        code: 'dfp_banniere_atf',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        bids: [{
          bidder: 'adagio', // Required
          params: {
            organizationId: '0', // Required - Organization ID provided by Adagio.
            site: 'news-of-the-day', // Required - Site Name provided by Adagio.
            placement: 'ban_atf', // Required. Refers to the placement of an adunit in a page. Must not contain any information about the type of device. Other example: `mpu_btf'.
            adUnitElementId: 'dfp_banniere_atf', // Required - AdUnit element id. Refers to the adunit id in a page. Usually equals to the adunit code above.

            // The following params are limited to 30 characters,
            // and can only contain the following characters:
            // - alphanumeric (A-Z+a-z+0-9, case-insensitive)
            // - dashes `-`
            // - underscores `_`
            // Also, each param can have at most 50 unique active values (case-insensitive).
            pagetype: 'article', // Highly recommended. The pagetype describes what kind of content will be present in the page.
            environment: 'mobile', // Recommended. Environment where the page is displayed.
            category: 'sport', // Recommended. Category of the content displayed in the page.
            subcategory: 'handball', // Optional. Subcategory of the content displayed in the page.
            postBid: false // Optional. Use it in case of Post-bid integration only.
          }
        }]
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
          },
          {
            key: "environment",
            val: function (bidResponse) {
              return bidResponse.environment;
            }
          },
          {
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
          }
        ]
      }
    }

```
