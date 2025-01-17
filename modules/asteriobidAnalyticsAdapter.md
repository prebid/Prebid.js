# Overview

Module Name: AsterioBid Analytics Adapter
Module Type: Analytics Adapter
Maintainer: admin@asteriobid.com

# Description
Analytics adapter for <a href="https://asteriobid.com/">AsterioBid</a>. Contact admin@asteriobid.com for information.

# Test Parameters

```
pbjs.enableAnalytics({
    provider: 'asteriobid',
    options: {
        bundleId: '04bcf17b-9733-4675-9f67-d475f881ab78'
    }
});

```

# Advanced Parameters

```
pbjs.enableAnalytics({
    provider: 'asteriobid',
    options: {
        bundleId: '04bcf17b-9733-4675-9f67-d475f881ab78',
        version: 'v1', // configuration version for the comparison
        adUnitDict: { // provide names of the ad units for better reporting 
            adunitid1: 'Top Banner',
            adunitid2: 'Bottom Banner'
        },
        customParam: { // provide custom parameters values that you want to collect and report
            param1: 'value1',
            param2: 'value2'
        }
    }
});

```
