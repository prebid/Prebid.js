The purpose of this Real Time Data Provider is to allow publishers to use Geoedge real user monitoring solution, which supports real time blocking of bad ads (redirects, malware, offensive content, etc)

**Usage:**

Compile the  RTD Provider into your Prebid build:

`gulp build --modules=geoedgeRtdProvider`

Publishers must register Geoedge as a real time data provider by setting it up as a data provider in their realTimeData config:

```javascript
pbjs.setConfig({
    ...,
    realTimeData: {
        dataProviders: [{
            geoedge: {
                key: '123123', // Required, contact Geoedge to get your key 
                bidders: { // Optional, list of bidder to include / exclude from monitoring. Omitting this will monitor bids from all bidders
                    'bidderA': true, // monitor bids form this bidder
                    'bidderB': false // do not monitor bids form this bidder. Optional, omitting this entirely will have the same effect
                }
            }
        }]
    }
});
```

**Example:**

To view an example:
 
- in your cli run:

`gulp serve --modules=appnexusBidAdapter,geoedgeRtdProvider`

- in your browser, navigate to:

`http://localhost:9999/integrationExamples/gpt/geoedgeRtdProvider_example.html`
