# Overview
```
Module Name: Optimera Real Time Date Module
Module Type: RTD Module
Maintainer: mcallari@optimera.nyc
```

# Description

Optimera Real Time Data Module. Provides targeting for ad requests from data collected by the Optimera Measurement script on your site. Please contact [Optimera](http://optimera.nyc/) for information. This is a port of the Optimera Bidder Adapter.

# Configurations

Compile the Optimera RTD Provider into your Prebid build:

`gulp build --modules=optimeraRtdProvider`

Configuration example for using RTD module with `optimera` provider
```javascript
  pbjs.setConfig({
    realTimeData: {
      dataProviders: [
        {
          name: 'optimeraRTD',
          waitForIt: true,
          params: {
            clientID: '9999',
            optimeraKeyName: 'optimera',
            device: 'de'
          }
        }
      ]
    }
```  

#Params

Contact Optimera to get assistance with the params.

|  param name | type  |Scope | Description |
| :------------ | :------------ | :------- | :------- |
| clientID  | string  | required | Optimera Client ID |
| optimeraKeyName  | string  | optional |  GAM key name for Optimera. If migrating from the Optimera bidder adapter this will default to hb_deal_optimera and can be ommitted from the configuration. |
| device  | string  | optional | Device type code for mobile, tablet, or desktop. Either mo, tb, de |
