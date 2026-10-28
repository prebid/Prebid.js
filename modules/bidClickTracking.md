# Desktop inferred click tracking

The optional `bidClickTracking` module infers desktop display-ad clicks when the pointer is over the rendered ad slot and focus moves into one of its iframes. This is a **best-effort signal**, not a guaranteed measurement of user clicks. It does not inspect cross-origin creative contents.

Include `bidClickTracking` in the Prebid build and opt in:

```js
pbjs.setConfig({
  bidClickTracking: {
    enabled: true,
    fireTrackers: false
  }
});
pbjs.onEvent('bidClickInferred', ({ adId, adUnitCode, bidder, method }) => {
  console.log(adId, adUnitCode, bidder, method);
});
```

The event is emitted only for banner bids that successfully render, on desktop devices exposing fine pointers and hover. The detector requires the publisher document's focused element to be an iframe inside the hovered slot. Clicks on mobile/touch devices, clicks outside that slot, keyboard interactions, and some browser focus transitions are intentionally not counted. Conversely, other focus transitions can occasionally be mistaken for clicks. Tracking is removed when the slot is requested again, or the module is disabled.

## Optional tracker requests

To enable tracking requests, explicitly set `fireTrackers: true`. This sends a GET-like pixel request to the resolved HTTPS `clickUrl` supplied by the ad-server creative, such as the existing `integrationExamples/gpt/x-domain/creative.html`, which passes GAM's `%%CLICK_URL_UNESC%%` macro. No request is sent for unresolved macros, non-HTTPS URLs, or ads with the `${CLICKTHROUGH}` macro in their markup.

**Important:** An ad-server click redirect is not necessarily a tracking pixel. In particular, GAM may reject requests that do not represent supported click-through navigation. Do not enable `fireTrackers` for production GAM reporting until its counting and invalid-click behavior have been validated. The initial, safer use of this module is analytics through `bidClickInferred`. Ads rendered out of their designated slots, external `adUrl` markup, and custom renderers may require additional integration and can create discrepancies or duplicate counting.
