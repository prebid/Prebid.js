# Zeta Global SSP Analytics Adapter

## Overview

Module Name: Zeta Global SSP Analytics Adapter\
Module Type: Analytics Adapter\
Maintainer: abermanov@zetaglobal.com

## Description

Analytics Adapter which sends auctionEnd and adRenderSucceeded events to Zeta Global SSP analytics endpoints

## How to configure
```
pbjs.enableAnalytics({
    provider: 'zeta_global_ssp',
    options: {
        sid: 111,
        tags: {
            ...
        }
    }
});
```
