# Conventions: Prebid.js

## Code Style

### JavaScript Standards
- **ES6+** syntax with Babel transpilation
- **No semicolons** - Semicolon-free style
- **Single quotes** - `'string'` not `"string"`
- **2 spaces** - Indentation
- **No tabs** - Spaces only
- **Max 120 chars** - Line length (soft limit)

### Naming Conventions

#### Files
```
modules/rubiconBidAdapter.js      # CamelCase + suffix
src/adapters/bidderFactory.js     # Factory pattern
src/auctionManager.js             # Manager pattern
test/spec/modules/rubicon_spec.js # _spec suffix for tests
```

#### Variables
```javascript
const CONSTANTS = 'UPPER_CASE';   // Constants
let _privateVar = 'leading_underscore'; // Private
const pbjs = 'global';            // Global object
```

#### Functions
```javascript
function doSomething() {}         // camelCase
function _privateHelper() {}      // Leading underscore
const BidderFactory = function() {} // Constructor (PascalCase)
```

#### Classes
```javascript
class Auction {}                  // PascalCase
class Renderer {}                 // PascalCase
```

### Module Pattern

```javascript
import { utils } from './utils.js';

export function callBids(bidRequests) {
  // Implementation
}

export function buildRequests(validBidRequests) {
  // Implementation
}

export default {
  callBids,
  buildRequests,
  // ...
};
```

### Export Pattern
- **Named exports** for functions
- **Default export** for module object
- **Adapter registration** via side effects

## Documentation Standards

### JSDoc Requirements
All public functions require JSDoc:

```javascript
/**
 * Build server requests from bid objects
 * @param {BidRequest[]} validBidRequests
 * @param {BidderRequest} bidderRequest
 * @returns {ServerRequest[]}
 */
function buildRequests(validBidRequests, bidderRequest) {
  // ...
}
```

### Comment Style
- **Block comments** for functions
- **Inline comments** for complex logic
- **No trailing comments**
- **English only**

### Type Annotations
TypeScript types for public interfaces:

```typescript
interface BidRequest {
  bidder: string;
  params: BidderParams;
  adUnitCode: string;
  bidId: string;
}
```

## Error Handling

### Error Types
```javascript
// Specific error classes
class PrebidError extends Error {}
class TimeoutError extends PrebidError {}
class ValidationError extends PrebidError {}
```

### Error Logging
```javascript
import { logError, logWarn } from './utils.js';

try {
  // Risky operation
} catch (e) {
  logError('Operation failed', e);
}
```

### Validation Pattern
```javascript
function isBidRequestValid(bid) {
  return !!(bid.params && bid.params.accountId);
}
```

## Testing Conventions

### Test Structure
```javascript
import { expect } from 'chai';
import adapter from 'src/adapters/rubiconBidAdapter';

describe('Rubicon Bid Adapter', function () {
  describe('isBidRequestValid', function () {
    it('should validate with required params', function () {
      // Arrange
      const bid = { params: { accountId: '123' } };
      
      // Act
      const isValid = adapter.isBidRequestValid(bid);
      
      // Assert
      expect(isValid).to.be.true;
    });
  });
});
```

### Arrange-Act-Assert
All tests follow AAA pattern:
1. **Arrange** - Setup preconditions
2. **Act** - Execute unit under test
3. **Assert** - Verify outcomes

### Mocking Standards
```javascript
import { fakeServer } from 'sinon';

let server;

beforeEach(function () {
  server = fakeServer.create();
});

afterEach(function () {
  server.restore();
});
```

### XHR Mocking
Use global mock from `test/mocks/xhr.js`:
```javascript
import { xhr } from '../mocks/xhr.js';

// Don't create your own sinon.useFakeXMLHttpRequest()
```

## Code Organization

### Import Order
```javascript
// 1. Standard library imports
import { cloneDeep } from 'lodash';

// 2. Prebid core imports
import { ajax } from 'src/ajax.js';
import { config } from 'src/config.js';

// 3. Adapter imports
import { registerBidder } from 'src/adapters/bidderFactory.js';

// 4. Local imports
import { utils } from './utils.js';
```

### Function Order
```javascript
// 1. Public API functions
export function callBids() {}
export function buildRequests() {}

// 2. Private helper functions
function _helperFunction() {}

// 3. Constants
const DEFAULT_TIMEOUT = 3000;
```

### File Size Guidelines
- **Adapters**: 500-1000 lines max
- **Core modules**: Split if >1000 lines
- **Test files**: Match source structure

## Async Patterns

### Promise Usage
```javascript
// Prefer async/await
async function fetchBids() {
  const response = await ajax(url);
  return response;
}

// Chain promises when needed
fetchBids()
  .then(processBids)
  .catch(handleError);
```

### Timeout Handling
```javascript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new TimeoutError()), timeout);
});

Promise.race([bidPromise, timeoutPromise]);
```

## Configuration Patterns

### Config Access
```javascript
import { config } from 'src/config.js';

// Read config
const debug = config.getConfig('debug');

// Set config
config.setConfig({ debug: true });

// Bidder-specific config
config.setBidderConfig('rubicon', { key: 'value' });
```

### Bidder Settings
```javascript
bidderSettings: {
  rubicon: {
    storageAllowed: true,
    bidCpmAdjustment: (cpm) => cpm * 0.9,
    suppressEmptyUrls: true
  }
}
```

## Build Conventions

### Module Registration
```javascript
import { registerBidder } from 'src/adapters/bidderFactory.js';

const bidder = {
  code: 'rubicon',
  supportedMediaTypes: ['banner', 'video'],
  isBidRequestValid: (bid) => {...},
  buildRequests: (bids) => {...},
  interpretResponse: (response) => {...}
};

registerBidder(bidder);
```

### Feature Flags
```javascript
// Check if feature enabled
if (FEATURES.VIDEO) {
  // Video-specific code
}

// Build excludes disabled features
gulp build --disable VIDEO
```

## Security Conventions

### Input Validation
```javascript
// Always validate bidder params
function isBidRequestValid(bid) {
  return !!(
    bid.params &&
    typeof bid.params.accountId === 'string' &&
    bid.params.accountId.length > 0
  );
}
```

### URL Sanitization
```javascript
import { parseUrl } from 'src/url.js';

const parsed = parseUrl(url);
if (parsed.protocol !== 'https:') {
  logWarn('Non-HTTPS URL detected');
}
```

### Creative Handling
```javascript
// Secure creative rendering
import { secureCreatives } from 'src/secureCreatives.js';

secureCreatives.render(ad, creativeId);
```

## Performance Conventions

### Avoid Blocking
```javascript
// Don't block main thread
setTimeout(() => {
  // Heavy computation
}, 0);

// Use requestIdleCallback for non-critical work
requestIdleCallback(() => {
  // Low-priority task
});
```

### Memory Management
```javascript
// Clean up references
function cleanup() {
  largeDataStructure = null;
}

// Avoid memory leaks in closures
adapter.dispose = function() {
  eventListeners.forEach(removeEventListener);
};
```

### Caching Patterns
```javascript
const cache = new WeakMap();

function getCachedData(obj) {
  if (!cache.has(obj)) {
    cache.set(obj, computeExpensiveValue(obj));
  }
  return cache.get(obj);
}
```

## Logging Conventions

### Log Levels
```javascript
import { logInfo, logWarn, logError, logMessage } from 'src/utils.js';

logInfo('Auction started');      // Info level
logWarn('Bid timeout');          // Warning
logError('Request failed', err); // Error
logMessage('Debug info');        // Debug
```

### Conditional Logging
```javascript
if (config.getConfig('debug')) {
  logMessage('Debug mode enabled');
}
```

## Git Conventions

### Commit Messages
```
feat: Add new video adapter
fix: Resolve timeout issue in rubicon adapter
docs: Update README with examples
test: Add coverage for edge cases
refactor: Extract bid builder function
```

### Branch Naming
```
feature/video-adapter
fix/timeout-issue
release/11.2.0
```

### PR Requirements
- 80% code coverage minimum
- All tests passing
- Lint passing
- Conventional commits

## Deprecation Pattern

```javascript
/**
 * @deprecated Use newFunction() instead
 */
function oldFunction() {
  logWarn('oldFunction is deprecated, use newFunction');
  return newFunction();
}
```

## Browser Compatibility

### Feature Detection
```javascript
if (typeof window.Promise !== 'undefined') {
  // Use native Promise
} else {
  // Fallback
}
```

### Polyfills
```javascript
import 'core-js/features/array/includes';
import 'core-js/features/promise';
```

## Code Review Checklist

- [ ] JSDoc on public functions
- [ ] Types for public interfaces
- [ ] Test coverage >80%
- [ ] No console.log (use logError/logWarn)
- [ ] Error handling in place
- [ ] Input validation
- [ ] Follows naming conventions
- [ ] No hardcoded values (use constants)
- [ ] Lint passes
- [ ] No secrets/credentials

---
*Generated: Codebase mapping for Prebid.js*
