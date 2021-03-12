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
            organizationId: '1002', // Required - Organization ID provided by Adagio.
            site: 'adagio-io', // Required - Site Name provided by Adagio.
            placement: 'in_article', // Required. Refers to the placement of an adunit in a page. Must not contain any information about the type of device. Other example: `mpu_btf'.
            adUnitElementId: 'article_outstream', // Required - AdUnit element id. Refers to the adunit id in a page. Usually equals to the adunit code above.

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
            postBid: false, // Optional. Use it in case of Post-bid integration only.
            useAdUnitCodeAsAdUnitElementId: false, // Optional. Use it by-pass adUnitElementId and use the adUnit code as value
            useAdUnitCodeAsPlacement: false, // Optional. Use it to by-pass placement and use the adUnit code as value
            // Optional debug mode, used to get a bid response with expected cpm.
            debug: {
              enabled: true,
              cpm: 3.00 // default to 1.00
            }
          }
        }]
      },
      {
        code: 'article_outstream',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [640, 480],
            mimes: ['video/mp4'],
            skip: 1
            // Other OpenRTB 2.5 video options…
          }
        },
        bids: [{
          bidder: 'adagio', // Required
          params: {
            organizationId: '1002', // Required - Organization ID provided by Adagio.
            site: 'adagio-io', // Required - Site Name provided by Adagio.
            placement: 'in_article', // Required. Refers to the placement of an adunit in a page. Must not contain any information about the type of device. Other example: `mpu_btf'.
            adUnitElementId: 'article_outstream', // Required - AdUnit element id. Refers to the adunit id in a page. Usually equals to the adunit code above.

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
            postBid: false, // Optional. Use it in case of Post-bid integration only.
            useAdUnitCodeAsAdUnitElementId: false, // Optional. Use it by-pass adUnitElementId and use the adUnit code as value
            useAdUnitCodeAsPlacement: false, // Optional. Use it to by-pass placement and use the adUnit code as value
            video: {
              skip: 0
              // OpenRTB 2.5 video options defined here override ones defined in mediaTypes.
            },
            // Optional debug mode, used to get a bid response with expected cpm.
            debug: {
              enabled: true,
              cpm: 3.00 // default to 1.00
            }
          }
        }]
      },
      {
        code: 'article_native',
        mediaTypes: {
          native: {
            // generic Prebid options
            title: {
                required: true,
                len: 80
            },
            // …
            // Custom Adagio data assets
            ext: {
              adagio_bvw: {
                required: false
              }
            }
          }
        },
        bids: [{
          bidder: 'adagio', // Required
          params: {
            organizationId: '1002', // Required - Organization ID provided by Adagio.
            site: 'adagio-io', // Required - Site Name provided by Adagio.
            placement: 'in_article', // Required. Refers to the placement of an adunit in a page. Must not contain any information about the type of device. Other example: `mpu_btf'.
            adUnitElementId: 'article_native', // Required - AdUnit element id. Refers to the adunit id in a page. Usually equals to the adunit code above.

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
            postBid: false, // Optional. Use it in case of Post-bid integration only.
            useAdUnitCodeAsAdUnitElementId: false, // Optional. Use it by-pass adUnitElementId and use the adUnit code as value
            useAdUnitCodeAsPlacement: false, // Optional. Use it to by-pass placement and use the adUnit code as value
            // Optional OpenRTB Native 1.2 request object. Only `context`, `plcmttype` fields are supported.
            native: {
              context: 1,
              plcmttype: 2
            },
            // Optional debug mode, used to get a bid response with expected cpm.
            debug: {
              enabled: true,
              cpm: 3.00 // default to 1.00
            }
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
