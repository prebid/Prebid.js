# Mobian Rtd Provider

## Overview

Module Name: Mobian Rtd Provider
Module Type: Rtd Provider
Maintainer: rich.rodriguez@themobian.com

The Mobian Real-Time Data (RTD) Module is a plug-and-play Prebid.js adapter that is designed to provide Mobian Contextual results on the publisher’s page.

## Description

RTD provider for themobian Brand Safety determinations. Publishers
should use this to get Mobian's GARM Risk evaluations for
a URL. 

## Configuration

```js
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'mobianBrandSafety',
      params: {
        // Prefix for the targeting keys (default: 'mobian')
        prefix: 'mobian',
        
        // Enable targeting keys for advertiser data
        advertiserTargeting: true,
        // Or set it as an array to pick specific targeting keys:
        // advertiserTargeting: ['genres', 'emotions', 'themes'],
        // Available values: 'apValues', 'categories', 'emotions', 'genres', 'risk', 'sentiment', 'themes', 'tones'

        // Enable targeting keys for publisher data
        publisherTargeting: true,
        // Or set it as an array to pick specific targeting keys:
        // publisherTargeting: ['tones', 'risk'],
        // Available values: 'apValues', 'categories', 'emotions', 'genres', 'risk', 'sentiment', 'themes', 'tones'
      }
    }]
  }
});
```
