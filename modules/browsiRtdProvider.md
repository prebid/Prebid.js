# Overview

The Browsi RTD module provides viewability predictions for ad slots on the page.
To use this module, you’ll need to work with [Browsi](https://gobrowsi.com/) to get an account and receive instructions on how to set up your pages and ad server.

# Configurations

Compile the Browsi RTD Provider into your Prebid build:

`gulp build --modules=browsiRtdProvider`


Configuration example for using RTD module with `browsi` provider
```javascript
    pbjs.setConfig({
        "realTimeData": {
            "auctionDelay": 1000,
            dataProviders:[{
                "name": "browsi",
                "waitForIt": "true"
                "params": {
                    "url": "yield-manager.browsiprod.com",
                    "siteKey": "browsidemo",
                    "pubKey": "browsidemo"
                    "keyName":"bv"
                }  
            }]
        }
    });
```  

#Params

Contact Browsi to get required params

|  param name | type  |Scope | Description |
| :------------ | :------------ | :------- | :------- |
| url  | string  | required | Browsi server URL |
| siteKey  | string  | required | Site key |
| pubKey  | string  | required | Publisher key |
| keyName  | string  | optional | Ad unit targeting key |


#Output
`getTargetingData` function will return expected viewability prediction in the following structure:
```json
{
  "adUnitCode":{
      "browsiViewability":"0.6"
  },
  "adUnitCode2":{
      "browsiViewability":"0.9"
  }
}
``` 
