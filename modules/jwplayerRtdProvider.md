The purpose of this Real Time Data Provider is to allow publishers to target against their JW Player media without 
having to integrate with the Player Bidding product. This prebid module makes JW Player's video ad targeting information accessible 
to Bid Adapters.

# Usage for Publishers:

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
Lastly, include the content's media ID and/or the player's ID in the matching AdUnit's `ortb2Imp.ext.data`:

```javascript
const adUnit = {
  code: '/19968336/prebid_native_example_1',
  ...,
  ortb2Imp: {
    ext: {
      data: {
        jwTargeting: {
          // Note: the following Ids are placeholders and should be replaced with your Ids.
          playerID: 'abcd',
          mediaID: '1234'
        }
      }
    }
  }
};

pbjs.que.push(function() {
    pbjs.addAdUnits([adUnit]);
    pbjs.requestBids({
        ...
    });
});
``` 
**Note**: The player ID is the ID of the HTML div element used when instantiating the player. 
You can retrieve this ID by calling `player.id`, where player is the JW Player instance variable.

**Note**: You may also include `jwTargeting` information in the prebid config's `ortb2.site.ext.data`. Information provided in the adUnit will always supersede, and information in the config will be used as a fallback.
 
## Prefetching
In order to prefetch targeting information for certain media, include the media IDs in the `jwplayerDataProvider` var and set `waitForIt` to `true`:

```javascript
const jwplayerDataProvider = {
  name: "jwplayer",
  waitForIt: true,
  params: {
    mediaIDs: ['abc', 'def', 'ghi', 'jkl']
  }
};
```

You must also set a value to `auctionDelay` in the config's `realTimeData` object 

```javascript
realTimeData = {
  auctionDelay: 100,
  ...
};
```

# Usage for Bid Adapters:

Implement the `buildRequests` function. When it is called, the `bidRequests` param will be an array of bids.
Each bid for which targeting information was found will have a ortb2 param conforming to the [oRTB v2 object structure](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf). The `ortb2` object will contain our proprietaty targeting segments in a format compliant with the [IAB's segment taxonomy structure](https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/extensions/community_extensions/segtax.md).

Example:

```javascript
{
    adUnitCode: 'xyz',
    bidId: 'abc',
    ...,
    ortb2: {
        site: {
            content: {
                id: 'jw_abc123',
                data: [{
                    name: 'jwplayer.com',
                    ext: {
                        segtax: 502,
                        cids: ['abc123']
                    },
                    segment: [{ 
                        id: '123'
                    }, { 
                        id: '456'
                    }]
                }]
            }
        }   
    }
}
```

where:
- `ortb2` is an object containing first party data
  - `site` is an object containing page specific information
    - `content` is an object containing metadata for the media. It may contain the following information: 
      - `id` is a unique identifier for the specific media asset
      - `data` is an array containing segment taxonomy objects that have the following parameters:
        - `name` is the `jwplayer.com` string indicating the provider name
        - `ext.segtax` whose `502` value is the unique identifier for JW Player's proprietary taxonomy
        - `ext.cids` is an array containing the list of extended content ids as defined in [oRTB's community extensions](https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/extensions/community_extensions/extended-content-ids.md#example---content-id-and-seller-defined-context). 
        - `segment` is an array containing the segment taxonomy values as an object where:
          - `id` is the string representation of the data segment value. 
  
**Example:**

To view an example:
 
- in your cli run:

`gulp serve --modules=jwplayerRtdProvider`

- in your browser, navigate to:

`http://localhost:9999/integrationExamples/gpt/jwplayerRtdProvider_example.html`

**Note:** the mediaIds in the example are placeholder values; replace them with your existing IDs.

# Maintainer info

Maintained by JW Player. For any questions, comments or feedback please contact Karim Mourra, karim@jwplayer.com
