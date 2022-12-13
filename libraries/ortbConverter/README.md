# Prebid.js - ORTB conversion library

This library provides methods to convert Prebid.js bid request objects to ORTB requests, 
and ORTB responses to Prebid.js bid response objects. 

## Usage

The simplest way to use this from an adapter is:

```javascript
import {ortbConverter} from '../../libraries/ortbConverter/converter.js'

const converter = ortbConverter({     
    context: {
        // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them 
        netRevenue: true,    // or false if your adapter should set bidResponse.netRevenue = false
        ttl: 30              // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)  
    }
});

registerBidder({
    // ... rest of your spec goes here ...    
    buildRequests(bidRequests, bidderRequest) {
        const data = converter.toORTB({bidRequests, bidderRequest})
        // you may need to adjust `data` to suit your needs - see "customization" below
        return [{
            method: METHOD,
            url: ENDPOINT_URL,
            data
        }]
    },
    interpretResponse(response, request) {
        const bids = converter.fromORTB({response: response.body, request: request.data}).bids;
        // likewise, you may need to adjust the bid response objects
        return bids;
    },
})
```

Without any customization, the library will generate complete ORTB requests, but ignores your [bid params](#params). 
If your endpoint sets `response.seatbid[].bid[].mtype` (part of the ORTB 2.6 spec), it will also parse the response into complete bidResponse objects. See [setting response mediaTypes](#response-mediaTypes) if that is not the case.

### Module-specific conversions

Prebid.js features that require a module also require it for their corresponding ORTB conversion logic. For example, `imp.bidfloor` is only populated if the `priceFloors` module is active; `request.cur` needs the `currency` module, and so on. Notably, this means that to get those fields populated from your unit tests, you must import those modules first; see [this suite](https://github.com/prebid/Prebid.js/blob/master/test/spec/modules/openxOrtbBidAdapter_spec.js) for an example.

## Customization

### Modifying return values directly

You are free to modify the objects returned by both `toORTB` and `fromORTB`:

```javascript
const data = converter.toORTB({bidRequests, bidderRequest});
deepSetValue(data.imp[0], 'ext.myCustomParam', bidRequests[0].params.myCustomParam);
```

However, there are two restrictions (to avoid them, use the [other customization options](#fine-customization)):

 - you may not change the `imp[].id` returned by `toORTB`; they ared used internally to match responses to their requests.
     ```javascript
     const data = converter.toORTB({bidRequests, bidderRequest});
     data.imp[0].id = 'custom-imp-id' // do not do this - it will cause an error later in `fromORTB`
     ```
   See also [overriding `imp.id`](#imp-id).
 - the `request` argument passed to `fromORTB` must be the same object returned by `toORTB`.
    ```javascript
    let data = converter.toORTB({bidRequests, bidderRequest});
   
    data = mergeDeep(                                              // the original object is lost
      {ext: {myCustomParam: bidRequests[0].params.myCustomParam}}, // `fromORTB` will later throw an error
      data
    ); 
    
    // do this instead:                                                                                     
    mergeDeep(                                                     
      data, 
      {ext: {myCustomParam: bidRequests[0].params.myCustomParam}}, 
      data
    )   
    ```

<a id="fine-customization" />
### Fine grained customization - imp, request, bidResponse, response

When invoked, `toORTB({bidRequests, bidderRequest})` first loops through each request in `bidRequests`, converting them into ORTB `imp` objects.
It then packages them into a single ORTB request, adding other parameters that are not imp-specific (such as for example `request.tmax`).

Likewise, `fromORTB({request, response})` first loops through each `response.seatbid[].bid[]`, converting them into Prebid bidResponses; it then packages them into 
a single return value.

You can customize each of these steps using the `ortbConverter` arguments `imp`, `request`, `bidResponse` and `response`:

### <a id="imp" />Customizing imps: `imp(buildImp, bidRequest, context)`

Invoked once for each input `bidRequest`; should return the ORTB `imp` object to include in the request.
The arguments are:

- `buildImp`: a function taking `(bidRequest, context)` and returning an ORTB `imp` object;
- `bidRequest`: the bid request object to convert;
- `context`: a [context object](#context) that contains at least:
   - `bidderRequest`: the `bidderRequest` argument passed to `toORTB`.
   
#### <a id="params" />Example: attaching custom bid params

```javascript
const converter = ortbConverter({
   imp(buildImp, bidRequest, context) {
       const imp = buildImp(bidRequest, context);
       deepSetValue(imp, 'ext.params', bidRequest.params);
       return imp;
   }
})
```

#### <a id="imp-id" /> Example: overriding imp.id

```javascript
const converter = ortbConverter({
   imp(buildImp, bidRequest, context) {
       const imp = buildImp(bidRequest, context);
       imp.id = randomIdentifierStr();
       return imp;
   }
})
```

### <a id="request" /> Customizing the request: `request(buildRequest, imps, bidderRequest, context)`

Invoked once after all bidRequests have been converted into `imp`s; should return the complete ORTB request. The return value
of this function is also the return value of `toORTB`.
The arguments are:

- `buildRequest`: a function taking `(imps, bidderRequest, context)` and returning an ORTB request object;
- `imps` an array of ORTB `imp` objects that should be included in the request;
- `bidderRequest`: the `bidderRequest` argument passed to `toORTB`;
- `context`: a [context object](#context) that contains at least:
    - `bidRequests`: the `bidRequests` argument passed to `toORTB`.

#### Example: setting additional request properties

```javascript
const converter = ortbConverter({
   request(buildRequest, imps, bidderRequest, context) {
      const request = buildRequest(imps, bidderRequest, context);
      deepSetValue(request, 'ext.adapterVersion', '0.0.1'); 
      return request;
   }
})
```

### <a id="bidResponse" /> Customizing bid responses: `bidResponse(buildBidResponse, bid, context)`

Invoked once for each `seatbid[].bid[]` in the response; should return the corresponding Prebid.js bid response object.
The arguments are:
- `buildBidResponse`: a function taking `(bid, context)` and returning a Prebid.js bid response object;
- `bid`: an ORTB `seatbid[].bid[]` object;
- `context`: a [context object](#context) that contains at least:
    - `seatbid`: the ORTB `seatbid[]` object that encloses `bid`;
    - `imp`: the ORTB request's `imp` object that matches `bid.impid`;
    - `bidRequest`: the Prebid.js bid request object that was used to generate `context.imp`;
    - `ortbRequest`: the `request` argument passed to `fromORTB`;
    - `ortbResponse`: the `response` argument passed to `fromORTB`.

#### Example: setting a custom outstream renderer

```javascript
const converter = ortbConverter({
    bidResponse(buildBidResponse, bid, context) {
        const bidResponse = buildBidResponse(bid, context);
        const {bidRequest} = context;
        if (bidResponse.mediaType === VIDEO && bidRequest.mediaTypes.video.context === 'outstream') {
            bidResponse.renderer = Renderer.install({
                url: RENDERER_URL,
                id: bidRequest.bidId,  
                adUnitCode: bidRequest.adUnitCode
            });
        }
        return bidResponse;
    }
})
```

#### <a id="response-mediaTypes" /> Example: setting response mediaType

In ORTB 2.5, bid responses do not specify their mediatype, which is something Prebid.js requires. You can provide it as
`context.mediaType`:

```javascript
const converter = ortbConverter({
    bidResponse(buildBidResponse, bid, context) {
        context.mediaType =  deepAccess(bid, 'ext.mediaType'); 
        return buildBidResponse(bid, context)
    }
})
```

If you know that a particular ORTB request/response pair deals with exclusively one mediaType, you may also pass it directly in the [context parameter](#context). 
Note that - compared to the above - this has additional effects, because `context.mediaType` is also considered during `imp` generation - see [special context properties](#special-context).

```javascript
converter.toORTB({
    bidRequests: bidRequests.filter(isVideoBid),
    bidderRequest,
    context: {mediaType: 'video'} // make everything in this request/response deal with video only
})
```

Note that this will _not_ work as intended:

```javascript

const converter = ortbConverter({
    bidResponse(buildBidResponse, bid, context) {
        const bidResponse = buildBidResponse(bid, context); // this throws; buildBidResponse needs to know the 
                                                            // mediaType to properly populate bidResponse.ad, 
                                                            // bidResponse.native etc
        bidResponse.mediaType = deepAccess(bid, 'ext.mediaType'); // too late, use context.mediaType
        return bidResponse;
    }
});

```

### <a id="response" /> Customizing the response: `response(buildResponse, bidResponses, ortbResponse, context)`

Invoked once, after all `seatbid[].bid[]` objects have been converted to corresponding bid responses. The value returned 
by this function is also the value returned by `fromORTB`.
The arguments are:

- `buildResponse`: a function that takes `(bidResponses, ortbResponse, context)` and returns `{bids: bidResponses}`. In the future, this may contain additional response data not necessarily tied to any bid (for example fledge auction configuration).
- `bidResponses`: array of Prebid.js bid response objects
- `ortbResponse`: the `response` argument passed to `fromORTB`
- `context`: a [context object](#context) that contains at least:
    - `ortbRequest`: the `request` argument passed to `fromORTB`;
    - `bidderRequest`: the `bidderRequest` argument passed to `toORTB`;
    - `bidRequests`: the `bidRequests` argument passed to `toORTB`.

#### Example: logging server-side errors

```javascript
const converter = ortbConverter({
    response(buildResponse, bidResponses, ortbResponse, context) {
        (deepAccess(ortbResponse, 'ext.errors') || []).forEach((e) => logWarn('Server error', e));
        return buildResponse(bidResponses, ortbResponse, context);
    }
})
```

### Even finer grained customization - processor overrides

Each of the four conversion steps described above - imp, request, bidResponse and response - is further broken down into
smaller units of work (called _processors_). For example, when the currency module is included, it adds a _request processor_ 
that sets `request.cur`; the priceFloors module adds an _imp processor_ that sets `imp.bidfloor` and `imp.bidfloorcur`, and so on.

Each processor can be overridden or disabled through the `overrides` argument:

#### Example: disabling currency
```javascript
const converter = ortbConverter({
    overrides: {
        request: {
            currency: false
        }
    }
})
```

The above is similar in effect to:

```javascript
const converter = ortbConverter({
    request(buildRequest, imps, bidderRequest, context) {
        const request = buildRequest(imps, bidderRequest, context);
        delete request.cur;
        return request;
    }
})
```

With the main difference being that setting `currency: false` will disable currency logic entirely, while the `request`
version will still set `request.cur`, then delete it. If the currency processor is ever updated to deal with more than just `request.cur`, the `request`
function will also need to be updated accordingly.

#### Example: taking video parameters from `bidRequest.params.video`

Processors can also be overridden:

```javascript
const converter = ortbConverter({
    overrides: {
        imp: {
            video(orig, imp, bidRequest, context) {
                // `orig` is the video imp processor, which looks at bidRequest.mediaTypes[VIDEO] 
                // to populate imp.video
                // alter its input `bidRequest` to also pick up parameters from `bidRequest.params`
                let videoParams = bidRequest.mediaTypes[VIDEO];
                if (videoParams) {
                    videoParams = Object.assign({}, videoParams, bidRequest.params.video);
                    bidRequest = {...bidRequest, mediaTypes: {[VIDEO]: videoParams}}
                }
                orig(imp, bidRequest, context);
            } 
        }
    }
});
```

#### Processor override functions

Processor overrides are similar to the override options described above, except that they take the object to process as argument:

- `imp` processor overrides take `(orig, imp, bidRequest, context)`, where:
   - `orig` is the processor function being overridden, which itself takes `(imp, bidRequest, context)`;
   - `imp` is the (partial) imp object to modify;
   - `bidRequest` and `context` are the same arguments passed to [imp](#imp).
- `request` processor overrides take `(orig, ortbRequest, bidderRequest, context)`, where:
   - `orig` is the processor function being overridden, and takes `(ortbRequest, bidderRequest, context)`;
   - `ortbRequest` is the partial request to modify;
   - `bidderRequest` and `context` are the same arguments passed to [request](#reuqest).
- `bidResponse` processor overrides take `(orig, bidResponse, bid, context)`, where: 
   - `orig` is the processor function being overridden, and takes `(bidResponse, bid, context)`;
   - `bidResponse` is the partial bid response to modify;
   - `bid` and `context` are the same arguments passed to [bidResponse](#bidResponse)
- `response` processor overrides take `(orig, response, ortbResponse, context)`, where:
   - `orig` is the processor function being overriden, and takes `(response, ortbResponse, context)`;
   - `response` is the partial response to modify;
   - `ortbRespones` and `context` are the same arguments passed to [response](#response).

### <a id="context" /> The `context` argument

All customization functions take a `context` argument. This is a plain JS object that is shared between `request` and its corresponding `response`; and between `imp` and its corresponding `bidResponse`:

```javascript
const converter = ortbConverter({
    imp(buildImp, bidRequest, context) {
        // `context` here will be later passed to `bidResponse` (if one matches the imp generated here)
        context.someData = somethingInterestingAbout(bidRequest);
        return buildImp(bidRequest, context);
    },
    bidResponse(buildBidResponse, bid, context) {
        const bidResponse = buildBidResponse(bid, context);
        doSomethingWith(context.someData);
        return bidResponse;
    }
})
```

`ortbConverter` automatically populates `context` with some values of interest, such as `bidRequest`, `bidderRequest`, etc - as detailed above. In addition, you may pass additional context properties through:

- the `context` argument of `ortbConverter`: e.g. `ortbConverter({context: {ttl: 30}})`. This will set `context.ttl = 30` globally for the converter.
- the `context` argument of `toORTB`: e.g. `converter.toORTB({bidRequests, bidderRequest, context: {ttl: 30}})`. This will set `context.ttl = 30` only for this request.

### <a id="special-context"/> Special `context` properties

For ease of use, the conversion logic gives special meaning to some context properties:

 - `currency`: a currency string (e.g. `'EUR'`). If specified, overrides the currency to use for computing price floors and `request.cur`. If omitted, both default to `getConfig('currency.adServerCurrency')`.
 - `mediaType`: a bid mediaType (`'banner'`, `'video'`, or `'native'`). If specified:
    - disables `imp` generation for other media types (i.e., if `context.mediaType === 'banner'`, only `imp.banner` will be populated; `imp.video` and `imp.native` will not, even if the bid request specifies them);
    - is passed as the `mediaType` option to `bidRequest.getFloor` when computing price floors;
    - sets `bidResponse.mediaType`.
 - `nativeRequest`: a plain object that serves as the base value for `imp.native.request` (and is relevant only for native bid requests).
      If not specified, the only property that is guaranteed to be populated is `assets`, since Prebid does not require anything else to define a native adUnit. You can use `context.nativeRequest` to provide other properties; for example, you may want to signal support for native impression trackers by setting it to `{eventtrackers: [{event: 1, methods: [1, 2]}]}` (see also the [ORTB Native spec](https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf)).
 - `netRevenue`: the value to set as `bidResponse.netRevenue`. This is a required property of bid responses that does not have a clear ORTB counterpart.
 - `ttl`: the default value to use for `bidResponse.ttl` (if the ORTB response does not provide one in `seatbid[].bid[].exp`).
   
## Prebid Server extensions

If your endpoint is a Prebid Server instance, you may take advantage of the `pbsExtension` companion library, which adds a number of processors that can populate and parse PBS-specific extensions (typically prefixed `ext.prebid`); these include bidder params (with `transformBidParams`), bidder aliases, targeting keys, and others. 

```javascript
import {pbsExtensions} from '../../libraries/pbsExtensions/pbsExtensions.js'

const pbsConverter = ortbConverter({
    processors: pbsExtensions
})
```
