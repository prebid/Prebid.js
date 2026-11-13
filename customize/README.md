# Build options customization

Prebid.js build options can be customized at bundle time by providing a loader or plugin that replaces the generated build options module.
Supported integrations include the webpack loader and the Rollup-compatible plugin (Rollup, Vite, Rolldown).
Both paths share the same virtual module protocol (details after the examples).

## Webpack loader

Use the webpack loader exported from `prebid.js/customize/webpackLoader`.

```javascript
// webpack.conf.js
module.exports = {
  module: {
    rules: [
      {
        loader: 'prebid.js/customize/webpackLoader',
        options: {
          globalVarName: 'myCustomGlobal',
          defineGlobal: true,
          distUrlBase: 'https://cdn.example.com/prebid/chunks/'
        }
      },
    ]
  }
}
```

## Rollup-compatible plugin (Rollup, Vite, Rolldown)

Use the Rollup-compatible plugin exported from `prebid.js/customize/rollupPlugin`.

```javascript
// rollup.config.js
import prebidBuildOptions from 'prebid.js/customize/rollupPlugin'

export default {
  plugins: [
    prebidBuildOptions({
      globalVarName: 'myCustomGlobal',
      defineGlobal: true,
      distUrlBase: 'https://cdn.example.com/prebid/chunks/'
    })
  ]
}
```

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import prebidBuildOptions from 'prebid.js/customize/rollupPlugin'

export default defineConfig({
  plugins: [
    prebidBuildOptions({
      globalVarName: 'myCustomGlobal'
    })
  ]
})
```

## How the customization works

The customization works by intercepting the generated module at `dist/src/buildOptions.mjs` and returning a virtual module that exports the merged options:

```javascript
export default {
  pbGlobal: "pbjs",
  defineGlobal: true,
  distUrlBase: "https://cdn.jsdelivr.net/npm/prebid.js/dist/chunks/"
}
```

## Shared virtual module helper

If you need to integrate with another bundler, reuse the helper exported from `prebid.js/customize/virtualBuildOptions`:

- `getBuildOptionsVirtualModuleId()` returns the target module id to intercept
- `renderBuildOptionsVirtualModule(options)` returns the `export default ...` payload