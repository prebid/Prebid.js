The purpose of this Real Time Data Provider is to allow publishers to target against their JW Player media without 
having to integrate with the Player Bidding product. This prebid module makes JW Player's video ad targeting information accessible 
to Bid Adapters.

#Usage for Publishers:

Compile the JW Player RTD Provider into your Prebid build:

`gulp build --modules=jwplayerRtdProvider`

Publishers must register JW Player as a real time data provider by setting up a Prebid Config conformant to the 
following structure:

```javascript
const jwplayerDataProvider = {
  name: "jwplayer"
};

pbjs.setConfig({
    ...,
    realTimeData: {
      dataProviders: [
          jwplayerDataProvider
      ]
    }
});
```
Lastly, include the content's media ID and/or the player's ID in the matching AdUnit:

```javascript
const adUnit = {
  code: '/19968336/prebid_native_example_1',
  ...
  jwTargeting: {
    waitForIt: true,
    playerID: 'abcd',
    mediaID: '1234'
  }
};

pbjs.que.push(function() {
    pbjs.addAdUnits([adUnit]);
    pbjs.requestBids({
        ...
    });
});
``` 
##Prefetching
In order to prefetch targeting information for certain media, include the media IDs in the `jwplayerDataProvider` var:

```javascript
const jwplayerDataProvider = {
  name: "jwplayer",
  params: {
    mediaIDs: ['abc', 'def', 'ghi', 'jkl']
  }
};
```

To ensure that the prefetched targeting information is added to your bid, we strongly suggest setting 
`jwTargeting.waitForIt` to `true`. If the prefetch is still in progress at the time of the bid request, the auction will
be delayed until the targeting information specific to the requested adUnits has been obtained.

```javascript
jwTargeting: {
    waitForIt: true,
    ...
}
```

You must also set a value to `auctionDelay` in the config's `realTimeData` object 

```javascript
realTimeData = {
  auctionDelay: 1000,
  ...
};
```

#Usage for Bid Adapters:

Implement the `buildRequests` function. When it is called, the `bidRequests` param will be an array of bids.
Each bid for which targeting information was found will conform to the following object structure:

```javascript
{
    adUnitCode: 'xyz',
    bidId: 'abc',
    ...,
    jwTargeting: {
      segments: ['123', '456'],
      content: {
        id: 'jw_abc123'
      }
    }
}
```

where:
- `segments` is an array of jwpseg targeting segments, of type string.
- `content` is an object containing metadata for the media. It may contain the following information: 
  - `id` is a unique identifier for the specific media asset.
  
**Example:**

To view an example:
 
- in your cli run:

`gulp serve --modules=jwplayerRtdProvider`

- in your browser, navigate to:

`http://localhost:9999/integrationExamples/gpt/jwplayerRtdProvider_example.html`

**Note:** the mediaIds in the example are placeholder values; replace them with your existing IDs.
