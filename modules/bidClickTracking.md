# Bid click tracking (banner and native, mobile and desktop)

The optional `bidClickTracking` module observes real user link clicks in **accessible inline banner creatives**, on mobile and desktop. For `ad` markup rendered through the dynamic display renderer, Prebid listens inside the rendered same-origin `srcdoc` iframe for trusted clicks on links and sends a `bidClick` event through the existing creative messaging channel. It does not alter navigation or insert overlays.

Include `bidClickTracking` in the build and opt in:

```js
pbjs.setConfig({
  bidClickTracking: {
    enabled: true,
    desktopFallback: false,
    fireTrackers: false,
    dedupeNativeClicks: true
  }
});

pbjs.onEvent('bidClick', ({ adId, adUnitCode, bidder, method }) => {
  console.log('Observed click:', adId, adUnitCode, bidder, method);
});
```

## Coverage and limitations

- Works on mobile and desktop when the display renderer can access the inline creative iframe's document. Cross-origin nested frames, `adUrl`, sandboxed opaque-origin creatives, and custom renderers generally cannot be observed without bidder support.
- Only trusted `click` events on `<a href>` or `<area href>` elements count. Non-navigational gestures and taps on ad controls are excluded. This is a signal about a link interaction, not proof that a navigation completed.
- Detection is opt-in. `creative.html` does not need to change; Prebid bundles the dynamic renderer.
- For desktop-only cross-origin cases, publishers may also opt in to the less reliable hover + iframe-focus heuristic with `desktopFallback: true`. This emits `bidClickInferred`, not `bidClick`, and is limited to fine-pointer hover devices. Refresh and disabling the module remove its observers.
- Neither approach covers every banner ad. Instrumentation inside an inaccessible iframe requires bidder cooperation.

## Optional tracker requests

`fireTrackers: true` enables requests to the ad server's resolved HTTPS `clickUrl` supplied by the render creative, including GAM's `%%CLICK_URL_UNESC%%` macro. It is **off by default**. The module suppresses automatic tracker requests when `${CLICKTHROUGH}` is already present in the bid markup, and refuses unresolved or non-HTTPS URLs.

**Caution:** GAM's click macro is intended to support click-through redirect navigation; triggering it as a pixel request has not been validated for GAM counting or invalid-click treatment. Verify ad-server behavior before enabling tracker requests in production. For initial adoption, use event-only mode. Ad URLs, in-creative scripts, and redirects can have their own independent click tracking, so double counting remains possible.

## Native ads

Native creative clicks already use a separate click-through URL (`native.ortb.link.url`) and optional bidder click tracker URLs (`native.ortb.link.clicktrackers` or asset-specific `assets[].link.clicktrackers`). **This module never prepends trackers to the landing URL or fires the native landing URL as a pixel.** GAM click macros in native templates continue to work independently.

When enabled, a native `action: 'click'` message emits the same `bidClick` event with `method: 'nativeClick'` and an optional `assetId`. It then fires the existing bidder click trackers for that asset immediately with keepalive GET requests. By default, only the first click per bid is reported and tracked. Set `dedupeNativeClicks: false` to retain repeated-click behavior. When the module is disabled, existing native click handling remains active; its tracker requests still benefit from immediate keepalive delivery.

Native and banner click events are available to standard analytics adapters, unless explicitly filtered through `includeEvents` or `excludeEvents`. For `bidClick`, inspect `args.method` to distinguish `creativeClick` from `nativeClick`; `bidClickInferred` remains a distinct less-reliable event.
