## Dynamic creative renderers

The contents of this directory are compiled separately from the rest of Prebid, and intended to be dynamically injected 
into creative frames:

- `crossDomain.js` (compiled into `build/creative/creative.js`, also exposed in `integrationExamples/gpt/x-domain/creative.html`)
   is the logic that should be statically set up in the creative. 
- At build time, each folder under 'renderers' is compiled into a source string made available from a corresponding
`creative-renderer-*` library. These libraries are committed in source so that they are available to NPM consumers. 
- At render time, Prebid passes the appropriate renderer's source string to the remote creative, which then runs it.

The goal is to have a creative script that is as simple, lightweight, and unchanging as possible, but still allow the possibility
of complex or frequently updated rendering logic. Compared to the approach taken by [PUC](https://github.com/prebid/prebid-universal-creative), this:

- should perform marginally better: the creative only runs logic that is pertinent (for example, it sees native logic only on native bids);
- avoids the problem of synchronizing deployments when the rendering logic is updated (see https://github.com/prebid/prebid-universal-creative/issues/187), since it's bundled together with the rest of Prebid;
- is easier to embed directly in the creative (saving a network call), since the static "shell" is designed to change as infrequently as possible;
- allows the same rendering logic to be used both in remote (cross-domain) and local (`pbjs.renderAd`) frames, since it's directly available to Prebid; 
- requires Prebid.js - meaning it does not support AMP/App/Mobile (but it's still possible for something like PUC to run the same dynamic renderers
  when it receives them from Prebid, and fall back to separate AMP/App/Mobile logic otherwise).

### Renderer interface

A creative renderer (not related to other types of renderers in the codebase) is a script that exposes a global `window.render` function:

```javascript
window.render = function(data, {mkFrame, sendMessage}, win) { ... }
```

where:

 - `data` is rendering data about the winning bid, and varies depending on the bid type - see `getRenderingData` in `adRendering.js`;
 - `mkFrame(document, attributes)` is a utility that creates a frame with the given attributes and convenient defaults (no border, margin, and scrolling);
 - `sendMessage(messageType, payload)` is the mechanism by which the renderer/creative can communicate back with Prebid - see `creativeMessageHandler` in `adRendering.js`;
 - `win` is the window to render into; note that this is not the same window that runs the renderer.
 
The function may return a promise; if it does and the promise rejects, or if the function throws, an AD_RENDER_FAILED event is emitted in Prebid. Otherwise an AD_RENDER_SUCCEEDED is fired 
when the promise resolves (or when `render` returns anything other than a promise).

### Renderer development

Since renderers are compiled into source, they use production settings even during development builds. You can toggle this with 
the `--creative-dev` CLI option (e.g., `gulp serve-fast --creative-dev`), which disables the minifier and generates source maps; if you do, take care 
to not commit the resulting `creative-renderer-*` libraries (or run a normal build before you do).
