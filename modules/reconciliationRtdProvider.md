The purpose of this Real Time Data Provider is to allow publishers to match impressions accross the supply chain.

**Reconciliation SDK**
The purpose of Reconciliation SDK module is to collect supply chain structure information and vendor-specific impression IDs from suppliers participating in ad creative delivery and report it to the Reconciliation Service, allowing publishers, advertisers and other supply chain participants to match and reconcile ad server, SSP, DSP and veritifation system log file records. Reconciliation SDK was created as part of TAG DLT initiative ( https://www.tagtoday.net/pressreleases/dlt_9_7_2020 ).

**Usage for Publishers:**

Compile the Reconciliation Provider into your Prebid build:

`gulp build --modules=reconciliationRtdProvider`

Add Reconciliation real time data provider configuration by setting up a Prebid Config:

```javascript
const reconciliationDataProvider = {
    name: "reconciliation",
    params: {
        publisherMemberId: "test_prebid_publisher", // required
        allowAccess: true, //optional
    }
};

pbjs.setConfig({
    ...,
    realTimeData: {
      dataProviders: [
          reconciliationDataProvider
      ]
    }
});
```

where:
- `publisherMemberId` (required) - ID associated with the publisher
- `access` (optional) true/false - Whether ad markup will recieve Ad Unit Id's via Reconciliation Tag
  
**Example:**

To view an example:
 
- in your cli run:

`gulp serve --modules=reconciliationRtdProvider,appnexusBidAdapter`

Your could also change 'appnexusBidAdapter' to another one.

- in your browser, navigate to:

`http://localhost:9999/integrationExamples/gpt/reconciliationRtdProvider_example.html`
