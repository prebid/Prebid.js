# Testing: Prebid.js

## Test Framework

### Primary Stack
- **Mocha** (^10.8.2) - Test framework
- **Chai** (^4.2.0) - Assertion library (expect/assert)
- **Sinon** (^20.0.0) - Mocks, stubs, spies
- **Karma** (^6.4.4) - Test runner
- **Istanbul** - Code coverage

### Test Runner
```bash
# Run all tests
gulp test

# Run with watch mode
gulp test --watch

# Run single test file
gulp test --file "test/spec/modules/rubiconBidAdapter_spec.js" --nolint

# Run with coverage
gulp test --coverage

# View coverage
gulp view-coverage
```

## Test Structure

### Describe Blocks
```javascript
import { expect } from 'chai';
import adapter from 'src/adapters/rubiconBidAdapter';

describe('Rubicon Bid Adapter', function () {
  describe('isBidRequestValid', function () {
    // Tests for validation function
  });
  
  describe('buildRequests', function () {
    // Tests for request building
  });
  
  describe('interpretResponse', function () {
    // Tests for response parsing
  });
});
```

### It Blocks
Each `it` tests one behavior:
```javascript
it('should return true when params are valid', function () {
  // Test implementation
});
```

### Hooks
```javascript
describe('Adapter', function () {
  let server;
  
  beforeEach(function () {
    server = sinon.fakeServer.create();
  });
  
  afterEach(function () {
    server.restore();
  });
  
  // Tests...
});
```

## Test Patterns

### Arrange-Act-Assert
```javascript
it('should build request with correct params', function () {
  // Arrange
  const bidRequest = {
    params: { accountId: '123', siteId: '456' },
    sizes: [[300, 250]]
  };
  
  // Act
  const requests = adapter.buildRequests([bidRequest]);
  
  // Assert
  expect(requests).to.have.length(1);
  expect(requests[0].url).to.include('123');
});
```

### Mocking XHR
```javascript
import { xhr } from '../mocks/xhr.js';

it('should make HTTP request', function () {
  // Use global xhr mock, don't create your own
  const requests = adapter.buildRequests(bidRequests);
  
  expect(requests[0].method).to.equal('POST');
});
```

### Stubbing
```javascript
it('should call ajax with correct params', function () {
  const ajaxStub = sinon.stub(adapter, 'callBids');
  
  adapter.buildRequests(bidRequests);
  
  expect(ajaxStub.calledOnce).to.be.true;
  
  ajaxStub.restore();
});
```

### Spies
```javascript
it('should log error on failure', function () {
  const logErrorSpy = sinon.spy(utils, 'logError');
  
  adapter.handleErrorResponse();
  
  expect(logErrorSpy.calledOnce).to.be.true;
  
  logErrorSpy.restore();
});
```

## Test Coverage

### Coverage Requirements
- **Minimum 80%** - Required for PR merge
- **Enforced via CI** - Automated checks
- **Reports in** `build/coverage/lcov/`

### Coverage Commands
```bash
# Generate coverage
gulp test --coverage

# View HTML report
open build/coverage/lcov/lcov-report/index.html
```

### Coverage Report Structure
```
build/coverage/lcov-report/
├── index.html              # Summary
├── src/                    # Core coverage
│   ├── auctionManager.js
│   └── adapterManager.js
└── modules/                # Adapter coverage
    ├── rubiconBidAdapter.js
    └── ...
```

## Test Files

### Location Pattern
Tests mirror source structure:
```
test/spec/
├── src/                    # Core tests
│   ├── auctionManager_spec.js
│   ├── adapterManager_spec.js
│   └── utils_spec.js
├── modules/                # Adapter tests
│   ├── rubiconBidAdapter_spec.js
│   ├── appnexusBidAdapter_spec.js
│   └── ...
└── libraries/              # Library tests
    └── ...
```

### File Naming
- **Suffix**: `*_spec.js`
- **Match source**: Same name as source file + `_spec`

### Test Imports
```javascript
// Import module under test
import adapter from 'src/adapters/rubiconBidAdapter';

// Import assertions
import { expect } from 'chai';

// Import utilities
import { deepClone } from 'src/utils.js';
```

## Mocking Patterns

### XHR Mock
Use global mock from `test/mocks/xhr.js`:
```javascript
import { xhr } from '../mocks/xhr.js';

// Don't use sinon.useFakeXMLHttpRequest()
// Use the shared mock instead
```

### Server Mock
```javascript
let server;

beforeEach(function () {
  server = sinon.fakeServer.create();
  server.respondWith('POST', '/endpoint', [
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ bids: [] })
  ]);
});

afterEach(function () {
  server.restore();
});
```

### Function Stub
```javascript
sinon.stub(adapter, 'buildRequests').callsFake(() => {
  return mockRequests;
});
```

### Object Mock
```javascript
const mockBid = {
  bidder: 'rubicon',
  params: { accountId: '123' },
  sizes: [[300, 250]]
};
```

## Async Testing

### Promise Tests
```javascript
it('should resolve promise', function (done) {
  adapter.fetchBids()
    .then((bids) => {
      expect(bids).to.have.length(1);
      done();
    })
    .catch(done);
});
```

### Async/Await
```javascript
it('should fetch bids', async function () {
  const bids = await adapter.fetchBids();
  expect(bids).to.have.length(1);
});
```

### Timeout Tests
```javascript
it('should timeout after 3 seconds', function () {
  this.timeout(4000);
  
  return adapter.fetchBids()
    .then(() => {
      throw new Error('Should have timed out');
    })
    .catch((err) => {
      expect(err.message).to.include('timeout');
    });
});
```

## Integration Tests

### E2E Tests
```bash
# Local e2e testing
gulp e2e-test --local

# BrowserStack testing (requires credentials)
gulp e2e-test --host=test.localhost
```

### Example Pages
```
integrationExamples/gpt/hello_world.html
```
Manual testing via example implementations.

## Test Utilities

### Helpers
```javascript
import { mockBid } from 'test/helpers/index.js';

const bid = mockBid({
  bidder: 'rubicon',
  params: { accountId: '123' }
});
```

### Fixtures
```javascript
const mockResponse = {
  body: {
    bids: [{
      cpm: 2.50,
      width: 300,
      height: 250,
      creativeId: '123'
    }]
  }
};
```

## Browser Testing

### Browser Support
- Chrome
- Firefox
- Safari
- Edge
- Opera
- IE11 (legacy)

### BrowserStack
Automated cross-browser testing:
```bash
export BROWSERSTACK_USERNAME='your-username'
export BROWSERSTACK_ACCESS_KEY='your-key'

gulp e2e-test --host=test.localhost
```

### Headless Testing
```bash
# Chrome headless
gulp test --browsers=ChromeHeadless

# Firefox headless
gulp test --browsers=FirefoxHeadless
```

## Test Best Practices

### DO
- Test public interface only
- Use Arrange-Act-Assert pattern
- Keep tests independent
- Mock external dependencies
- Test edge cases
- Name tests descriptively

### DON'T
- Test implementation details
- Share state between tests
- Skip cleanup in afterEach
- Use real network calls
- Test multiple behaviors in one it
- Ignore async errors

## Test Examples

### Adapter Test
```javascript
import { expect } from 'chai';
import rubiconAdapter from 'modules/rubiconBidAdapter.js';

describe('Rubicon Bid Adapter', function () {
  let adapter;
  
  beforeEach(function () {
    adapter = rubiconAdapter();
  });
  
  describe('isBidRequestValid', function () {
    it('should validate with accountId', function () {
      const bid = { params: { accountId: '123' } };
      expect(adapter.isBidRequestValid(bid)).to.be.true;
    });
    
    it('should reject without accountId', function () {
      const bid = { params: {} };
      expect(adapter.isBidRequestValid(bid)).to.be.false;
    });
  });
  
  describe('buildRequests', function () {
    it('should create POST request', function () {
      const requests = adapter.buildRequests(bidRequests);
      expect(requests[0].method).to.equal('POST');
    });
  });
  
  describe('interpretResponse', function () {
    it('should parse bid response', function () {
      const bids = adapter.interpretResponse(mockResponse);
      expect(bids).to.have.length(1);
      expect(bids[0].cpm).to.equal(2.50);
    });
  });
});
```

### Core Module Test
```javascript
import { expect } from 'chai';
import { auctionManager } from 'src/auctionManager.js';

describe('Auction Manager', function () {
  describe('createAuction', function () {
    it('should create auction with adUnits', function () {
      const auction = auctionManager.createAuction({
        adUnits: [{ code: 'div1', bids: [...] }]
      });
      
      expect(auction).to.exist;
      expect(auction.getAdUnits()).to.have.length(1);
    });
  });
});
```

## Debugging Tests

### Debug Mode
```bash
# Keep browser open
gulp test --watch --browsers=Chrome

# Debug at localhost:9876/debug.html
```

### Console Output
```javascript
// Use console.log in tests for debugging
it('should work', function () {
  console.log('Debug:', value);
  expect(value).to.be.true;
});
```

### Breakpoints
Set breakpoints in source files when running with `--watch`.

## CI/CD Integration

### GitHub Actions
Tests run on every PR:
- Lint check
- Unit tests
- Coverage check (80% minimum)

### Coveralls
Coverage reports uploaded to Coveralls:
```
https://coveralls.io/github/prebid/Prebid.js
```

## Test Maintenance

### Updating Tests
When modifying source:
1. Update corresponding tests
2. Maintain coverage >80%
3. Run `gulp test --file <spec_file>`

### Flaky Tests
- Fix immediately (blocks CI)
- Check for async issues
- Verify cleanup in afterEach
- Ensure no shared state

---
*Generated: Codebase mapping for Prebid.js*
