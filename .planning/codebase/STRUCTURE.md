# Structure: Prebid.js

## Directory Layout

```
prebid_new/
├── src/                          # Core library source
│   ├── adapters/                 # Adapter base classes
│   │   └── bidderFactory.js      # Adapter factory
│   ├── activities/               # Activity control modules
│   ├── adserver/                 # Ad server integrations
│   ├── ajax/                     # HTTP request utilities
│   ├── auction/                  # Auction core logic
│   ├── fpd/                      # First-party data modules
│   ├── libraries/                # Shared utility libraries
│   ├── mediaTypes/               # Media type handlers
│   ├── native/                   # Native ad support
│   ├── renderer/                 # Creative rendering
│   ├── targeting/                # Ad server targeting
│   ├── userSync/                 # User sync management
│   ├── utils/                    # Utility functions
│   ├── video/                    # Video ad support
│   ├── prebid.js                 # Main entry point
│   ├── adapterManager.js         # Adapter coordinator
│   ├── auctionManager.js         # Auction factory
│   └── utils.js                  # Core utilities
├── modules/                      # Bid adapters & extensions
│   ├── rubiconBidAdapter.js      # Rubicon adapter
│   ├── appnexusBidAdapter.js     # AppNexus adapter
│   ├── openxBidAdapter.js        # OpenX adapter
│   ├── uid2IdSystem.js           # UID2 identity
│   ├── weboramaRtdProvider.js    # Weborama RTD
│   └── ...                       # 100+ more adapters
├── libraries/                    # Shared libraries
│   ├── greedy/                   # Greedy promise implementation
│   ├── ortbConverter/            # OpenRTB converter
│   └── ...                       # Reusable components
├── test/                         # Test suite
│   ├── spec/                     # Unit tests
│   │   ├── modules/              # Adapter tests
│   │   ├── src/                  # Core tests
│   │   └── libraries/            # Library tests
│   ├── mocks/                    # Test mocks
│   │   └── xhr.js                # XHR mock
│   └── helpers/                  # Test utilities
├── integrationExamples/          # Example implementations
│   ├── gpt/                      # Google Publisher Tag examples
│   │   └── hello_world.html      # Basic integration
│   └── ...                       # More examples
├── build/                        # Build output (generated)
│   ├── dev/                      # Development builds
│   ├── dist/                     # Distribution builds
│   └── coverage/                 # Coverage reports
├── .planning/                    # GSD planning docs
│   └── codebase/                 # This codebase map
├── customize/                    # Build customization
│   └── webpackLoader.js          # Webpack config loader
├── .opencode/                    # Opencode configuration
│   └── get-shit-done/            # GSD workflows
└── node_modules/                 # Dependencies
```

## Key Locations

### Core Source
- **`src/prebid.js`** - Main pbjs global object, public API
- **`src/auctionManager.js`** - Auction creation and management
- **`src/adapterManager.js`** - Adapter registration and dispatch
- **`src/adapters/bidderFactory.js`** - Adapter factory pattern
- **`src/utils.js`** - Core utility functions (500+ lines)

### Adapter Location
All bid adapters live in `modules/`:
```
modules/
├── rubiconBidAdapter.js
├── appnexusBidAdapter.js
├── openxBidAdapter.js
├── pubmaticBidAdapter.js
├── medianetBidAdapter.js
└── ... (100+ adapters)
```

### Test Files
Tests mirror source structure:
```
test/spec/
├── src/
│   ├── auctionManager_spec.js
│   ├── adapterManager_spec.js
│   └── utils_spec.js
├── modules/
│   ├── rubiconBidAdapter_spec.js
│   ├── appnexusBidAdapter_spec.js
│   └── ...
└── libraries/
    └── ...
```

### Build Configuration
- **`gulpfile.js`** - Main build tasks
- **`webpack.conf.js`** - Webpack configuration
- **`karma.conf.maker.js`** - Test runner config
- **`eslint.config.js`** - Linting rules
- **`babelConfig.js`** - Babel presets

### Package Configuration
- **`package.json`** - Dependencies, scripts, exports
- **`.npmrc`** - NPM configuration
- **`.nvmrc`** - Node version (20.x)

## File Organization Patterns

### Adapter Files
Each adapter is a single file:
```
modules/
└── rubiconBidAdapter.js    # ~500-1000 lines
    ├── spec.js             # Test file (parallel)
    └── metadata.json       # Auto-generated metadata
```

### Core Modules
Core source split by concern:
```
src/
├── auction*.js             # Auction logic
├── adapter*.js             # Adapter management
├── bid*.js                 # Bid handling
├── userSync.js             # User sync
├── targeting.js            # Ad server targeting
└── utils.js                # Utilities
```

### Libraries
Reusable components:
```
libraries/
├── greedy/
│   └── greedyPromise.js    # Optimized promises
├── ortbConverter/
│   └── converter.js        # OpenRTB conversion
└── ...
```

## Naming Conventions

### Files
- **CamelCase** for source: `bidderFactory.js`
- **PascalCase** for classes: `Renderer.js`
- **Suffix pattern**: `*Adapter.js`, `*Provider.js`, `*System.js`

### Modules
- **Bid adapters**: `xBidAdapter.js`
- **Analytics**: `xAnalyticsAdapter.js`
- **User ID**: `xIdSystem.js`
- **RTD**: `xRtdProvider.js`

### Tests
- **Suffix**: `*_spec.js`
- **Mirror source**: Same name + `_spec`

### Variables
- **Constants**: `UPPER_CASE`
- **Private**: `_leadingUnderscore`
- **Globals**: `pbjs` (configurable via build)

## Module Types

### Bid Adapters
```
modules/
├── rubiconBidAdapter.js    # Display/video adapter
├── videobyteBidAdapter.js  # Video-only adapter
└── nativeBidAdapter.js     # Native-only adapter
```

### Analytics Adapters
```
modules/
├── gaAnalyticsAdapter.js   # Google Analytics
├── roxotAnalyticsAdapter.js
└── atsAnalyticsAdapter.js
```

### User ID Systems
```
modules/
├── uid2IdSystem.js         # Unified ID 2
├── kinessoIdSystem.js      # Kinesso ID
└── pairIdSystem.js         # Pair ID
```

### RTD Providers
```
modules/
├── weboramaRtdProvider.js  # Weborama enrichment
├── iasRtdProvider.js       # IAS brand safety
└── mobianRtdProvider.js    # Mobian brand safety
```

## Configuration Files

### TypeScript Config
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "declaration": true,
    "emitDeclarationOnly": true
  }
}
```

### Babel Config
```javascript
{
  "presets": [
    ["@babel/preset-env", { "targets": { ... } }],
    "@babel/preset-typescript"
  ]
}
```

### ESLint Config
Custom config in `eslint.config.js`:
- Chai-friendly rules
- JSDoc requirements
- Import ordering
- Prebid-specific patterns

## Build Outputs

### Development Build
```
build/dev/
├── prebid.js           # Full source (unminified)
├── prebid.js.map       # Source map
├── prebid-core.js      # Core only
└── prebid-core.js.map
```

### Production Build
```
build/dist/
├── prebid.js           # Minified bundle
├── prebid.js.map       # Source map
└── chunks/             # Lazy-loaded modules
```

### Coverage Reports
```
build/coverage/
└── lcov/
    └── lcov-report/
        ├── index.html
        ├── src/
        └── modules/
```

## Metadata Structure

### Module Metadata
Auto-generated in `metadata/modules/`:
```
metadata/modules/
├── rubiconBidAdapter.json
├── appnexusBidAdapter.json
└── ...
```

Contains:
- Module type (bidder/analytics/etc)
- GVL ID (for TCF)
- Aliases
- Media types supported

## Integration Examples

### GPT Examples
```
integrationExamples/gpt/
├── hello_world.html    # Basic integration
├── amp.html            # AMP example
└── ...                 # More patterns
```

### Video Examples
```
integrationExamples/video/
├── outstream.html
└── instream.html
```

## Git Structure

### Tracked
- `src/` - Core source
- `modules/` - Adapters
- `test/` - Tests
- `integrationExamples/` - Examples
- `gulpfile.js` - Build config
- `package.json` - Dependencies

### Ignored
- `build/` - Generated output
- `node_modules/` - Dependencies
- `.planning/` - Planning docs (optional)
- `*.log` - Build logs

## Size Metrics

### File Counts
- **Source**: ~50 files in `src/`
- **Adapters**: 200+ files in `modules/`
- **Tests**: 300+ spec files
- **Libraries**: 20+ shared libs

### LOC Estimates
- **Core**: ~10,000 lines
- **Adapters**: ~50,000 lines (total)
- **Tests**: ~40,000 lines
- **Total**: ~100,000+ lines

---
*Generated: Codebase mapping for Prebid.js*
