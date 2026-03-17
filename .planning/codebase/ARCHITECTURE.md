# Architecture: Prebid.js

## System Overview

Prebid.js is a client-side header bidding management library that enables publishers to manage multiple demand sources (SSPs/exchanges) in a single auction.

## Architectural Pattern

### Module-Based Architecture
- **Core library** - Auction management, bid processing, configuration
- **Bid adapters** - Pluggable modules for each demand source
- **Analytics adapters** - Pluggable tracking modules
- **User ID modules** - Identity resolution plugins
- **RTD providers** - Real-time data enrichment plugins

### Design Philosophy
- **Non-intrusive** - Wraps existing ad server setup
- **Asynchronous** - Non-blocking page load
- **Configurable** - JSON-based configuration
- **Extensible** - Plugin architecture for adapters

## Core Components

### Auction Manager (`src/auctionManager.js`)
Orchestrates the bidding process:
- Creates auction instances
- Manages bid requests
- Collects bid responses
- Determines winning bids

### Auction (`src/auction.js`)
Single auction lifecycle:
1. Initialize with ad units
2. Request bids from adapters
3. Collect responses with timeout
4. Run auction logic (highest bid wins)
5. Send bids to ad server

### Bidder Adapter (`src/adapters/bidderFactory.js`)
Adapter pattern implementation:
- `callBids()` - Initiate bid request
- `buildRequests()` - Create HTTP requests
- `interpretResponse()` - Parse bid responses
- `getUserSyncs()` - User sync pixels

### Adapter Manager (`src/adapterManager.js`)
Coordinates adapter execution:
- Loads registered adapters
- Dispatches bid requests
- Aggregates responses
- Handles timeouts

### Prebid Global (`src/prebid.js`)
Public API exposed to publishers:
- `pbjs.que` - Command queue
- `pbjs.requestBids()` - Start auction
- `pbjs.setConfig()` - Configure behavior
- `pbjs.addAdUnits()` - Define placements

## Data Flow

### Bid Request Flow
```
Publisher Page
    ↓
pbjs.requestBids({ adUnits })
    ↓
Auction Manager
    ↓
Adapter Manager
    ↓
Bid Adapters (parallel)
    ↓
HTTP Requests to SSPs
    ↓
Bid Responses
    ↓
Auction Manager
    ↓
Select Winning Bids
    ↓
Send to Ad Server (GAM)
```

### Response Processing
```
SSP Response
    ↓
Adapter.interpretResponse()
    ↓
Bid Object Normalization
    ↓
Validation (size, price, creative)
    ↓
Auction Index
    ↓
Targeting Keys Set
    ↓
Ad Server Targeting
```

## Layer Architecture

### Layer 1: Public API
- `src/prebid.js` - Global pbjs object
- `src/pbjsORTB.js` - OpenRTB handling
- Command queue pattern for async safety

### Layer 2: Auction Core
- `src/auctionManager.js` - Auction factory
- `src/auction.js` - Auction instance
- `src/bidderSettings.js` - Per-bidder config
- `src/timeoutQueue.js` - Timeout management

### Layer 3: Adapter Layer
- `src/adapterManager.js` - Adapter coordinator
- `src/adapters/bidderFactory.js` - Adapter base
- `modules/*.js` - Concrete adapters

### Layer 4: Transport
- `src/ajax.js` - HTTP request abstraction
- `src/adloader.js` - Script loader
- `src/video.js` - Video support

### Layer 5: Utilities
- `src/utils.js` - Common utilities
- `src/refererDetection.js` - Page context
- `src/cookieSync.js` - User sync
- `src/secureCreatives.js` - Creative rendering

## Key Abstractions

### Bid Object
```javascript
{
  adUnitCode: 'div-gpt-ad-123',
  bidder: 'rubicon',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  params: { accountId: '123', siteId: '456', zoneId: '789' },
  bidId: 'unique-bid-id',
  bidderRequestId: 'request-id',
  auctionId: 'auction-id'
}
```

### Bid Response
```javascript
{
  requestId: 'bid-id',
  cpm: 2.50,
  width: 300,
  height: 250,
  creativeId: 'creative-123',
  dealId: 'deal-456',
  currency: 'USD',
  netRevenue: true,
  ttl: 300,
  ad: '<html>...</html>',
  meta: {
    advertiserDomains: ['example.com'],
    mediaType: 'banner'
  }
}
```

### Ad Unit
```javascript
{
  code: 'div-gpt-ad-123',
  mediaTypes: {
    banner: { sizes: [[300, 250], [728, 90]] },
    video: { context: 'instream', playerSize: [640, 480] }
  },
  bids: [
    { bidder: 'rubicon', params: {...} },
    { bidder: 'appnexus', params: {...} }
  ]
}
```

## Entry Points

### Primary Entry
```javascript
// Publisher implementation
pbjs.que.push(() => {
  pbjs.setConfig({ ... });
  pbjs.addAdUnits([...]);
  pbjs.requestBids({
    timeout: 3000,
    bidsBackHandler: (bidResponses) => {
      pbjs.setTargetingForGPT();
    }
  });
});
```

### Module Registration
```javascript
// Adapter auto-registration via import
import 'prebid.js/modules/rubiconBidAdapter';
// Adapter registers itself with adapterManager
```

### Build Entry
```javascript
// gulpfile.js entry
gulp build --modules=rubicon,appnexus,openx
// Creates bundle with selected adapters only
```

## Design Patterns

### Module Pattern
- IIFE (Immediately Invoked Function Expression)
- Private state via closure
- Public API via returned object

### Adapter Pattern
- Factory function creates adapter instances
- Standard interface for all adapters
- Polymorphic behavior across bidders

### Command Queue
- `pbjs.que.push()` - Queue commands
- Processed asynchronously when library loads
- Prevents race conditions

### Promise Pattern
- Greedy promise implementation (optional)
- Non-blocking auction execution
- Timeout handling

### Observer Pattern
- Events emitted during auction lifecycle
- Analytics adapters subscribe to events
- Hook system for extensions

## Configuration System

### Hierarchical Config
```javascript
pbjs.setConfig({
  // Global config
  debug: true,
  timeout: 3000,
  
  // Bidder-specific
  bidderSettings: {
    rubicon: {
      storageAllowed: true,
      bidCpmAdjustment: (cpm) => cpm * 0.9
    }
  }
});
```

### Runtime Config
- `setConfig()` - Global settings
- `setBidderConfig()` - Per-bidder settings
- `mergeConfig()` - Deep merge updates

## Async Handling

### Timeout Management
- Configurable timeout per auction
- Partial bids accepted until timeout
- Timeout queue tracks pending requests

### Promise Chain
- Sequential processing where needed
- Parallel bid requests
- Race conditions handled via auction ID

## Security Model

### Origin Security
- Same-origin policy compliance
- CORS for cross-origin requests
- Secure creative rendering

### Data Privacy
- GDPR consent management
- CCPA compliance
- User sync consent checks

### Code Isolation
- Modules run in shared global context
- No sandbox isolation (performance)
- Trusted code assumption

## Performance Optimizations

### Greedy Promise
- Optional greedy promise implementation
- Immediate callback execution when resolved
- Reduces microtask queue pressure

### Code Splitting
- Modular build output
- Only include needed adapters
- Lazy loading of debugging tools

### Request Batching
- Multiple bid requests batched
- Reduced HTTP overhead
- Connection reuse

## Testing Architecture

### Unit Tests
- Mocha + Chai + Sinon
- Per-module test files
- Mock XHR for network isolation

### Integration Tests
- End-to-end auction flow
- Real bidder integration
- BrowserStack cross-browser

### Coverage Requirements
- 80% minimum code coverage
- Enforced via CI/CD
- Istanbul coverage reports

## Extensibility Points

### Adapter Development
- Implement bidder interface
- Register with adapterManager
- Test with mock responses

### Analytics Integration
- Subscribe to auction events
- Track bid won/lost
- Custom reporting dashboards

### User ID Modules
- Integrate with ID providers
- Store/retrieve user identifiers
- Share across adapters

### RTD Providers
- Enrich bid requests with data
- Real-time audience segmentation
- Contextual targeting signals

---
*Generated: Codebase mapping for Prebid.js*
