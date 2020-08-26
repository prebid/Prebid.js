The purpose of this Real Time Data Provider is to allow publishers to target against their JW Player media without 
having to integrate with the VPB product. This prebid module makes JW Player's video ad targeting information accessible 
to Bid Adapters.

**Usage for Publishers:**

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

In order to prefetch targeting information for certain media, include the media IDs in the `jwplayerDataProvider` var:

```javascript
const jwplayerDataProvider = {
  name: "jwplayer",
  params: {
    mediaIDs: ['abc', 'def', 'ghi', 'jkl']
  }
};
```
Lastly, include the content's media ID and/or the player's ID in the matching AdUnit:

```javascript
const adUnit = {
  code: '/19968336/prebid_native_example_1',
  ...
  jwTargeting: {
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

**Usage for Bid Adapters:**

Implement the `buildRequests` function. When it is called, the `bidRequests` param will be an array of bids.
Each bid for which targeting information was found will conform to the following object structure:

```javascript
{
     adUnitCode: 'xyz',
     bidId: 'abc',
     ...
     realTimeData: {
          ...,
          jwTargeting: {
               segments: ['123', '456'],
               content: {
                  id: 'jw_abc123'
               }
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
