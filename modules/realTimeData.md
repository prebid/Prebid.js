## Real Time Data Configuration Example 

Example showing config using `browsi` sub module
```
    pbjs.setConfig({
        "realTimeData": {
            "name": "browsi",
            "primary_only": false,
            "params": {
                "url": "testUrl.com",
                "siteKey": "testKey",
                "pubKey": "testPub",
                "keyName":"bv"
            }
        }
    });
```    

Example showing real time data object received form `browsi` sub module
```
{
  "slotPlacementId":{
      "key":"value",
      "key2":"value"
  },
  "slotBPlacementId":{
      "dataKey":"dataValue",
  }
}
```   
