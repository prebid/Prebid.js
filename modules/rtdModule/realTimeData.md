## Real Time Data Configuration Example 

Example showing config using `browsi` sub module
```
    pbjs.setConfig({
        "realTimeData": {
            "auctionDelay": 1000,
            dataProviders[{
                "name": "browsi",
                "params": {
                    "url": "testUrl.com",
                    "siteKey": "testKey",
                    "pubKey": "testPub",
                    "keyName":"bv"
                }  
            }]
        }
    });
```    

Example showing real time data object received form `browsi` real time data provider
```
{
  "adUnitCode":{
      "key":"value",
      "key2":"value"
  },
  "adUnitCode2":{
      "dataKey":"dataValue",
  }
}
```   
