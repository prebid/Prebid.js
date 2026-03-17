# Technology Stack: Prebid.js

## Overview

Prebid.js is a client-side header bidding management library for programmatic advertising, written in JavaScript/TypeScript.

## Core Technologies

### Language & Runtime
- **JavaScript ES6+** with Babel transpilation
- **TypeScript** for type definitions (`.d.ts` files)
- **Node.js** >=20.0.0 required
- Targets browsers: `> 0.25%, not IE 11, not dead, not op_mini all`

### Build System
- **Gulp** (^5.0.1) - Primary build orchestration
- **Webpack** (^5.103.0) - Module bundling
- **Babel** (^7.28.4) - Transpilation with presets:
  - `@babel/preset-env`
  - `@babel/preset-typescript`
- **gulp-babel** - Gulp Babel integration

### Testing Stack
- **Mocha** (^10.8.2) - Test framework
- **Chai** (^4.2.0) - Assertion library
- **Sinon** (^20.0.0) - Mocks, stubs, spies
- **Karma** (^6.4.4) - Test runner
- **Istanbul** - Code coverage
- **WebDriverIO** (^9.18.4) - E2E testing

### Code Quality
- **ESLint** (^9.31.0) - Linting with custom config
- **JSCPD** - Copy/paste detection
- **TypeScript** (^5.8.2) - Type checking

## Key Dependencies

### Runtime Dependencies
```javascript
{
  "@babel/core": "^7.28.4",
  "@babel/preset-env": "^7.28.5",
  "@babel/preset-typescript": "^7.28.5",
  "@babel/runtime": "^7.28.3",
  "core-js": "^3.45.1",
  "crypto-js": "^4.2.0",
  "dlv": "^1.1.3",
  "dset": "^3.1.4",
  "express": "^4.15.4",
  "fun-hooks": "^1.1.0",
  "gulp-babel": "^8.0.0",
  "gulp-wrap": "^0.15.0",
  "iab-adcom": "^1.0.6",
  "iab-native": "^1.0.0",
  "iab-openrtb": "^1.0.1",
  "klona": "^2.0.6",
  "live-connect-js": "^7.2.0"
}
```

### IAB Standards
- **iab-adcom** - Ad Commodity object
- **iab-openrtb** - OpenRTB protocol
- **iab-native** - Native advertising standard

### Utilities
- **lodash** (^4.17.21) - Utility functions
- **crypto-js** - Cryptographic functions
- **klona** - Deep cloning
- **dlv/dset** - Nested object get/set

## Build Commands

```bash
# Full build
gulp build

# Build with specific modules
gulp build --modules=rubiconBidAdapter,appnexusBidAdapter

# Build for development with tests
gulp serve-and-test --file <spec_file.js>

# Lint only
gulp lint

# Run all tests
gulp test

# Test single file
gulp test --file "test/spec/modules/pubmaticBidAdapter_spec.js" --nolint

# Generate coverage
gulp test-coverage
```

## Build Features

### Feature Flags
Build can exclude features with `--disable`:
- `VIDEO` - Video bid support
- `NATIVE` - Native bid support
- `UID2_CSTG` - UID2 token generation
- `GREEDY` - Greedy promise optimization
- `LOG_NON_ERROR` - Non-error logging
- `LOG_ERROR` - Error logging

### ES5 Compatibility
```bash
gulp build-bundle-dev --modules=<list> --ES5
```
Targets: IE11+, Chrome 50+, Firefox 50+, Safari 10+

## Output Structure

```
build/
├── dev/          # Development builds with sourcemaps
├── dist/         # Production bundles
└── coverage/     # Test coverage reports
```

## Module System

Prebid.js uses a modular architecture where:
- Core library in `src/`
- Bid adapters in `modules/*.js`
- Each adapter is an independent module
- Modules auto-register via import side effects

```javascript
import pbjs from 'prebid.js';
import 'prebid.js/modules/rubiconBidAdapter';
pbjs.processQueue();
```

## Configuration

### Package Exports
```javascript
{
  ".": "./dist/src/src/prebid.public.js",
  "./modules/*.js": "./dist/src/public/*.js",
  "./types.d.ts": "./dist/src/src/types/summary/types.d.ts",
  "./global.d.ts": "./dist/src/src/types/summary/global.d.ts"
}
```

### Customization
Webpack loader supports runtime customization:
- `globalVarName` - Global variable (default: "pbjs")
- `defineGlobal` - Export global (default: true)
- `distUrlBase` - Dynamic module CDN base

## Version

**Current:** 11.2.0-pre (pre-release)

---
*Generated: Codebase mapping for Prebid.js*
