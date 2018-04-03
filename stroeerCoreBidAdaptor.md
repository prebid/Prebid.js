# Stroeer Prebid Adapter

## Ad Unit Configuration

All examples in this document will use the values from this prebid setup:

```javascript
var adUnits = [{ 
    code: 'div-gpt-ad-1460505748561-0',
    sizes: [[728, 90],[987, 123],[770, 250],[800, 250]],
    bids: [{
        bidder: 'stroeerCore',
        params: {
          sid: "83891"
        }    
    }, {
        bidder: 'appnexus',
        params: {
          'placementId': '4799418'
        }      
    }]
},{
    code: 'div-gpt-ad-1460505661639-0',
    sizes: [[770, 250]],
    bids: [{
      bidder: 'stroeerCore',
      params: {
        sid: "85929"
      }    
    }]
}];
```
### Config Notes

* Slot id (`sid`) is required. The adapter will ignore bid requests from prebid if `sid` is not provided. This must be in the decoded form. For example, "1234" as opposed to "MTM0ODA=". 
* The server ignores dimensions that are not supported by the slot or by the platform (such as 987x123). These unsupported dimension
are specified here because other parties, such as appnexus, may support them.

## Request

The adapter asynchronously make a request to the endpoint using AJAX (XHR/XmlHttpRequest). POST method of AJAX is used to deliver a payload in JSON format detailed below. 

The endpoint url is ```http(s)://hb.adscale.de/dsh```. DSH is an abbreviation for "display slot handler".

### Example Request Payload

```json
{
  "id":"1f64a736e4a41b",
  "bids":[
    {
      "bid":"229bae1b931c51",
      "sid":"83891",
      "siz":[[728, 90],[987, 123],[770, 250],[800, 250]]
    },
    {
      "bid":"3228f0561dc68c",
      "sid":"85929",
      "siz":[[770, 250]],
      "viz":true
    }
  ],
  "ssl":true,
  "mpa":true,
  "timeout":700
}
```

### Request Payload Specification

#### Top Level

| name | type | description |
| ---- | ---- | ----------- |
| id | string | Unique id of the request, provided by prebid.|
| bids  | bid array | Array of `Bid` objects representing the bids (or impressions) offered. At least 1 bid.|
| ssl  | bool | Flag to indicate whether the page is secure (`true`) or not (`false`).|
| mpa  | bool | An abbreviation for "main page accessible". It is a flag to indicate whether JavaScript, at the point of making the request, has access to the top-level window. `true` if request from top-level window or friendly iframe that can access top-level window, otherwise `false`.|
| viz  | bool | Whether the placement element is above the fold (`true`) or not (`false`). The placement element has an id that matches the `code` specified in the adUnit configuration. If the element is not found in the DOM then this field is not provided. 
|timeout|integer|The maximum amount of time (in milliseconds) that prebid will wait for the response. A response taking longer than this time will be ignored. This value here depends on the timeout configured in prebid.|


#### `Bid` Object

| name | type   | description |
| ---- | ------ | ----------- |
| bid  | string | Unique id of the bid, provided by prebid.|
| sid  | string | Slot id. This is the decoded version of the slot id (a number). For example, "1234" as opposed to "MTM0ODA=".|
| siz  | dimension array | Array of sizes the placement supports. A dimension is represented by a two-element array. First element is the width and the second element is the height.


### Notes

* ```timeout``` value may no longer be precise when the server receives the request because it does not consider the network latency and browser's connection handling. Browsers may delay requests until more resources
 are freed up (i.e. connections). The more the browser waits the less accurate this value becomes. This will be more apparent on big websites.

## Response

### Example Response Payload

#### Two bid responses
```json
{
  "bids":[
    {
      "bidId":"229bae1b931c51",
      "cpm":4.0,
      "width":728,
      "height":90,
      "ad":"<script>renderMyAd('ad1');</script>"
    },
    {
      "bidId":"3228f0561dc68c",
      "cpm":0.45,
      "width":770,
      "height":250,
      "ad":"<div>ad2</div>"    
    }
  ]
}
```

#### Zero bid response

```json
{
  "bids":[]
}
```


### Response Payload Specification


#### Top Level
| name | type | description |
| ---- | ---- | ----------- |
| bids | bid response array| Array of `BidResponse` objects. Each BidResponse object is associated with one of the Bids from the request. Only 0 or 1 BidResponse is expected per Bid.|

#### `BidResponse` Object

| name  | type   | description |
| ----  | ------ | ----------- |
| bidId | string | The bid id to identify the Bid this response is for.|
| cpm   | float  | Bid price expressed as CPM (TKP).|
| width | integer| The width (in pixels) of the creative. Used by prebid to set width of iframe.|
| height| integer| The height (in pixels) of the creative. Used by prebid to set height of iframe.|
| ad    | string | Tag snippet that gets inserted into the iframe if the bid wins. This tag is responsible for rendering the advert.|


### Notes
* The `bidId` on the response is used to lookup the corresponding bid request (using the `bid` field on the request).
* When observing prebid results in developer tools (i.e., via `pbjs.getBidResponses();`), `adId` is exactly the same as `bidId`, just a different name.
 
### Other Responses

#### Browser 307 Redirect 

When the server detects a new user (a request without user id cookie) then a cookie support check is attempted before delivering the bid response
payload described above. The cookie support check consists of a normal browser redirect (307) with the Location header
set to the same url as the current request except it has the new user id attached as a query parameter. The user id cookie is also
set on the response. The cookie and query parameter share the same name (``uu``) and value. On the final request made by the redirect, if the cookie exists then the server will know
the user supports third-party cookies. 

#### JavaScript Redirect

This type of response serves as a workaround for IE 10/11 and Safari iOS (ipad/iPhone).

**IE 10/11 Problem**

Microsoft IE 10/11 do not resend the request payload on a browser 307 redirect. This results in:
* Never delivering an
advert to users with third-party cookies disabled
* Not delivering an advert on first visit for new users with third-party cookies enabled

**Safari iOS Problem**

All Safari browsers (mobile and desktop) do not send the payload on subsequent requests after the pre-flight. To get around this we force all browsers
to do a simple CORS request. This achieved by setting the content-type to text/plain (not json/application).

See [https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS#Simple_requests]

However, Safari iOS browsers always do a pre-flight CORS regardless of the content-type. Therefore the payload is never sent. This results in:
* Never delivering an advert when a cross-origin HTTP request is performed (on first visit and when the result of previous CORS request has expired)

**Solution to solve both problems**

The solution is to signal the adapter to resend the request again when an empty payload is detected on the server side. In this case the server will respond with the following payload:

```json
{
  "redirect":"http://hb.adscale.de/dsh"
}
```

The adapter will ensure this redirect is only performed once, per bid request, to avoid an infinite request loop. This is a safeguard for the unexpected.

#### Failure

When an error occurs on the server side, the adapter will receive an empty response with an http status code of 500.

## User Connect

The adapter performs a "user connect" once per page after the first response. It inserts an async script that points to ```//js.adscale.de/userconnect.js```. This
script makes a request to our server to receive a list of connections that need to be performed (based on website configuration, etc). Connections that are supported are user matching, nuggad targeting and adex.

