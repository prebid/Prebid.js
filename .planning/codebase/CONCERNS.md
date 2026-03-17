# Concerns: Prebid.js

## Technical Debt

### Known Issues

#### Legacy Code
- **utils.js** (~500+ lines) - Monolithic utility module, needs refactoring into smaller, focused modules
- **auctionManager.js** - Complex auction logic, could benefit from clearer separation of concerns
- Some adapters still use callback patterns instead of Promises

#### Test Coverage Gaps
- Some edge cases in auction timeout handling not fully covered
- Integration between modules sometimes lacks integration tests
- E2E test coverage could be improved for complex auction scenarios

#### Documentation
- JSDoc coverage inconsistent across modules
- Some adapter parameters not fully documented
- Internal APIs lack type definitions

## Performance Concerns

### Main Thread Blocking
- **Greedy promise** optimization helps but not always enabled
- Large auction payloads can block main thread
- Multiple adapter initializations run synchronously

### Bundle Size
- Full build includes all adapters (~500KB+ minified)
- Module splitting helps but requires careful configuration
- Core library has grown over time (technical debt accumulation)

### Memory Management
- Event listeners not always cleaned up properly
- Large bid response objects held in memory
- WeakMap usage inconsistent

## Security Concerns

### Third-Party Code
- **Trust assumption** - All adapters run with full page access
- No sandbox isolation for bidder code
- Malicious adapter could steal user data

### Data Exposure
- User identifiers shared across adapters
- Bidder params may contain sensitive data
- No encryption for stored data

### CORS/Security Headers
- Relies on publisher CSP configuration
- No built-in security headers
- Cross-origin requests depend on bidder implementation

## Privacy & Compliance

### GDPR/TCF
- TCF v2.0 support requires proper CMP integration
- Consent string parsing complex and error-prone
- Storage consent checks not always enforced

### CCPA/US Privacy
- US Privacy string handling varies by adapter
- Opt-out mechanisms depend on publisher implementation
- IAB US Privacy framework complex to implement correctly

### Data Retention
- No built-in data expiration policies
- localStorage data persists indefinitely
- User sync cookies may exceed retention limits

## Browser Compatibility

### Legacy Browser Support
- IE11 support dropped in 6.x but legacy code remains
- Polyfills increase bundle size
- Modern features require fallbacks

### Feature Detection
- Inconsistent feature detection across modules
- Some code assumes modern browser APIs
- Polyfill requirements not always clear

## Architecture Concerns

### Monolithic Core
- `src/utils.js` is a catch-all module
- Auction manager handles too many responsibilities
- Hard to extract features without breaking dependencies

### Adapter Quality Variance
- Adapter quality depends on contributor expertise
- No enforced adapter testing standards
- Some adapters lack proper error handling

### Module Coupling
- Adapters import directly from core (tight coupling)
- Hard to test adapters in isolation
- Core changes may break adapters silently

## Scalability Concerns

### High-Traffic Publishers
- Auction timeout increases with more adapters
- Memory usage grows with bid volume
- No built-in rate limiting

### Module Proliferation
- 200+ adapters hard to maintain
- No deprecation process for unused adapters
- Metadata management becomes complex

## Testing Concerns

### Test Flakiness
- Async timing issues in auction tests
- BrowserStack tests occasionally flaky
- Network mocks may not match real behavior

### Coverage Gaps
- Some adapters <80% coverage (grandfathered)
- Integration tests limited
- Error path coverage inconsistent

### Test Maintenance
- Tests couple to implementation details
- Refactoring breaks tests unnecessarily
- Mock data may not match real responses

## Build Concerns

### Build Complexity
- Gulp + Webpack configuration complex
- Build times can be slow for full rebuild
- Feature flags increase build matrix

### Dependency Management
- Many dev dependencies (100+)
- Dependency updates may break builds
- Babel/TypeScript version coordination

### Output Size
- Source maps large for debug builds
- Multiple build variants needed
- CDN distribution adds latency

## Error Handling

### Silent Failures
- Some errors logged but not thrown
- Bidder failures may go unnoticed
- Timeout handling not always consistent

### Error Reporting
- No centralized error tracking
- Debug mode required for detailed logs
- Production errors hard to diagnose

### Recovery
- Auction may continue with partial bids
- No automatic retry for failed requests
- Fallback behavior varies by adapter

## Video/Native Concerns

### Video Complexity
- VAST/VPAID handling complex
- Video player integration varies
- Outstream video implementation inconsistent

### Native Limitations
- Native asset rendering varies by adapter
- No standard native template system
- Native tracking incomplete

## Analytics Concerns

### Event Timing
- Analytics events may fire out of order
- No guaranteed event delivery
- Event payload size not bounded

### Data Accuracy
- Bid won tracking may be inaccurate
- Revenue attribution varies by adapter
- Viewability tracking not built-in

## Maintenance Concerns

### Contributor Turnover
- Adapter maintainers change over time
- Knowledge loss when contributors leave
- No formal onboarding for new contributors

### Documentation Drift
- Code changes faster than docs
- Examples may become outdated
- API docs not always in sync

### Version Management
- Semantic versioning relies on manual review
- Breaking changes not always detected
- Deprecation notices not always clear

## Operational Concerns

### Publisher Implementation
- Implementation quality varies by publisher
- No built-in implementation validation
- Debugging requires publisher cooperation

### A/B Testing
- No built-in experiment framework
- Hard to measure adapter impact
- Performance comparison manual

### Monitoring
- No production monitoring built-in
- Performance metrics not tracked
- Error rates not visible

## Recommendations

### Short-Term
1. Improve JSDoc coverage on public APIs
2. Add integration tests for core auction flow
3. Standardize error handling across adapters
4. Document deprecation process

### Medium-Term
1. Refactor utils.js into focused modules
2. Improve TypeScript type coverage
3. Add E2E test suite for critical flows
4. Create adapter quality checklist

### Long-Term
1. Consider module isolation (sandboxing)
2. Implement built-in performance monitoring
3. Create adapter deprecation process
4. Improve build tooling (faster builds)

---
*Generated: Codebase mapping for Prebid.js*
