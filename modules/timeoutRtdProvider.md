 ---
 layout: page_v2
 title: Timeout Rtd Module
 description: Module for managing timeouts in real time
 page_type: module
 module_type: rtd
 module_code : example
 enable_download : true
 sidebarType : 1
 ---

## Overview
The timeout RTD module enables publishers to dynamically retrieve 
timeout rules from a timeout provider that determine the timeout based 
on certain features, or set those rules statically on the page. 
Build the timeout RTD module into the Prebid.js package with: 
```
gulp build --modules=timeoutRtdProvider,rtdModule...
```

## Configuration
The module is configured in the realTimeData.dataProviders object. The module will override 
`bidderTimeout` in the pbjs config. 

### Timeout Data Provider interface
The timeout RTD module provides an interface of dynamically fetching timeout rules from 
a data provider just before the auction begins. The endpoint url is set in the config just as in 
the example below, and the timeout data will be used when making bid requests.
 
```
pbjs.setConfig({
    ...
    "realTimeData": {
        "dataProviders": [{
            "name": 'timeout',
            "params": {
                "endpoint": {
                    "url": "http://{cdn-link}.json"
                }
            }
        }
    ]},
    
    // This value below will be modified by the timeout RTD module if it successfully 
    // fetches the timeout data.  
    "bidderTimeout": 1500, 
    ...
});
```

Sample Endpoint Response: 
```
{
    "rules": {
        "includesVideo": {
            "true": 200,
            "false": 50
          },
        "numAdUnits" : {
            "1-5": 100,
            "6-10": 200,
            "11-15": 300
        },
        "deviceType": {
            "2": 50,
            "4": 100,
            "5": 200
        },
        "connectionSpeed": {
            "slow": 200,
            "medium": 100,
            "fast": 50
        },
}
```

### Rule Handling:
The rules retrieved from the endpoint will be used to add time to the `bidderTimeout` based on certain features such as 
the user's deviceType, connection speed, etc. These rules can also be configured statically on page via a `rules` object.
Note that the timeout Module will ignore the static rules if an endpoint url is provided. The timeout rules follow the 
format:
```
{
  '<feature>': {
    '<key>': <milliseconds to be added to timeout>
  }
}
```
See bottom of page for examples.

The currently handled features are as follows:
Currently supported features:

|Name |Description | Keys | Example
| :------------ | :------------ | :------------ |:------------ |
| includesVideo | Adds time to the timeout based on whether there is a video ad unit in the auction or not | 'true'/'false'| { "true": 200, "false": 50 } | 
| numAdUnits | Adds time based on the number of ad units. Ranges in the format `'lowerbound-upperbound` are accepted. This range is inclusive | numbers or number ranges | {"1": 50, "2-5": 100, "6-10": 200} |  
| deviceType | Adds time based on device type| 2, 4, or 5| {"2": 50, "4": 100} |
| connectionSpeed | Adds time based on connection speed | slow, medium, or fast | { "slow": 200} |


Full example:  
```
pbjs.setConfig({
    ...
    "realTimeData": {
        "dataProviders": [{
            "name": 'timeout',
            "params": {
            "rules": {
                "includesVideo": {
                    "true": 200,
                    "false": 50
                  },
                "numAdUnits" : {
                    "1-5": 100,
                    "6-10": 200,
                    "11-15": 300
                },
                "deviceType": {
                    "2": 50,
                    "4": 100,
                    "5": 200
                },
                "connectionSpeed": {
                    "slow": 200,
                    "medium": 100,
                    "fast": 50
                },
            }
        }
    ]}
    ...
    // The timeout RTD module will add time to `bidderTimeout` if it successfully 
    // fetches the timeout data.  
    "bidderTimeout": 1500, 
```
