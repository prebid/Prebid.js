# Overview

Module Name: Adagio Bid Adapter
Module Type: Adagio Adapter
Maintainer: dev@adagio.io

## Description

Connects to Adagio demand source to fetch bids.

### Glossary

__publisher__: Publisher of the media in which the ad will be displayed (site/app). Unique identifier.

__site__: Exchange-specific site ID where the impression will be shown. Unique identifier

__placement__: Refers to the placement code of an ad unit in a page, see list below.

__pagetype__: Basically, the page type will describe what kind of content will be present in the page, examples: index, home, article, stats.

__categories__: An array of IAB code(s) of the category(ies) of which the page belongs, example: ['IAB12', 'IAB12-2'].

|Code | Nom               |
|-----|-------------------|
 1    | banner_top
 2    | banner_middle
 3    | banner_bottom
 4    | mpu_top
 5    | mpu_middle
 6    | mpu_bottom
 7    | in_article_top
 8    | in_article_middle
 9    | in_article_bottom

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
                publisher: '0', // Required - ID to identify the publisher
                site: '0', // Required - see glossary
                placement: '4', // Required - see glossary, e.g. "4" for a mpu_top placement
                pagetype: 'article', // Required - see glossary
                categories: ['IAB12', 'IAB12-2'], // Required - see glossary
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

```
