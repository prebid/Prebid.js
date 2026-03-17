# Integrations: Prebid.js

## External Services & APIs

Prebid.js integrates with various external services for header bidding, analytics, and user identity.

## Bid Adapters (SSPs/Exchanges)

### Major Integrations
Prebid.js supports hundreds of bid adapters. Notable adapters include:

**Display & Video:**
- Rubicon Bid Adapter (`rubiconBidAdapter`)
- AppNexus Bid Adapter (`appnexusBidAdapter`)
- OpenX Bid Adapter (`openxBidAdapter`)
- PubMatic Bid Adapter (`pubmaticBidAdapter`)
- Media.net Bid Adapter (`medianetBidAdapter`)
- Ozone Bid Adapter (`ozoneBidAdapter`)
- PulsePoint Bid Adapter (`pulsepointBidAdapter`)

**Premium Buyers:**
- Yahoo Ads Bid Adapter (`yahooAdsBidAdapter`)
- Xandr Bid Adapter
- Index Exchange
- Criteo Bid Adapter

**Video Specialists:**
- Video.js integration
- Video IMA (`videojs-ima`)
- VideoJS Contrib Ads

### Adapter Pattern
Each adapter implements a standard interface:
```javascript
{
  code: 'adapterCode',
  supportedMediaTypes: ['banner', 'video', 'native'],
  isBidRequestValid: (bid) => boolean,
  buildRequests: (validBidRequests, bidderRequest) => ServerRequest[],
  interpretResponse: (serverResponse, request) => Bid[],
  getUserSyncs: (syncOptions, responses) => UserSync[]
}
```

## User Identity Modules

### ID Systems
- **UID2** (`uid2IdSystem`) - Unified ID 2.0
- **Kinesso** (`kinessoIdSystem`) - Kinesso ID
- **Pair ID** (`pairIdSystem`) - Pair identity
- **Gravito** (`gravitoIdSystem`) - Gravito ID
- **FTrack** (`ftrackIdSystem`) - FTrack ID
- **Lockr AIM** (`lockrAIMIdSystem`) - Lockr identity

### Identity Providers
Integrations with identity resolution services for user matching across domains.

## Analytics Adapters

### Built-in Analytics
- **Roxot Analytics** (`roxotAnalyticsAdapter`)
- **ATS Analytics** (`atsAnalyticsAdapter`)
- **ADXC Analytics** (`adxcgAnalyticsAdapter`)
- **Piano DMP Analytics** (`pianoDmpAnalyticsAdapter`)

### Integration Points
Analytics adapters hook into:
- Auction events
- Bid won events
- Impression tracking
- Revenue attribution

## Real-Time Data (RTD) Providers

### Content Optimization
- **Weborama RTD** (`weboramaRtdProvider`)
- **IAB RTD** (`iasRtdProvider`) - Integral Ad Science
- **Brandmetrics** (`brandmetricsRtdProvider`)
- **Mobian** (`mobianRtdProvider`) - Brand safety
- **Mediafilter** (`mediafilterRtdProvider`)
- **Relevad** (`relevadRtdProvider`)
- **Rayn** (`raynRtdProvider`)
- **Oftmedia** (`oftedmediaRtdProvider`)

### Data Providers
- **Semantiq** (`semantiqRtdProvider`) - Audience segmentation
- **Chrome AI** (`chromeAiRtdProvider`) - Chrome advertising AI

## Ad Server Integrations

### Google Ad Manager (GAM)
Primary integration via:
- GPT (Google Publisher Tag)
- Prebid Server integration
- Header bidding wrapper

### Other Ad Servers
- Amazon UAM/TAM
- Xandr (formerly AppNexus)
- OpenX Ad Server

## Consent Management

### GDPR/CCPA
- **GDPR** - TCF v2.0 support
- **CCPA** - California privacy compliance
- **US Privacy** - IAB US Privacy string
- **GPP** - Global Privacy Platform

### CMP Integrations
- IAB TCF framework
- OneTrust
- Quantcast
- Sourcepoint
- Didomi

## Viewability & Brand Safety

### Viewability Providers
- **IAS** (`iasRtdProvider`) - Integral Ad Science
- **MOG** - Media Ocean Group
- **Comscore**
- **Nielsen**

### Brand Safety
- **Integral Ad Science** - Contextual targeting
- **DoubleVerify**
- **Moat** (Oracle)

## Server-Side Integration

### Prebid Server
Server-side header bidding integration:
- AMP (Accelerated Mobile Pages)
- Mobile apps
- High-volume publishers

### Bidder Servers
Direct server-to-server integrations with:
- AppNexus Server
- Rubicon Server
- Xandr Server

## Video Integrations

### Video Players
- **Video.js** (^7.21.7) - Open source video player
- **VideoJS Contrib Ads** - Ad insertion framework
- **VideoJS IMA** - Google IMA integration

### VAST/VPAID
- VAST 2.0/3.0/4.0 support
- VPAID 2.0 support
- Outstream video support

## Native Advertising

### Native Format
- IAB Native Ads support
- Sponsored content
- Content recommendation widgets

### Native Networks
- Outbrain
- Taboola
- RevContent

## Payment & Monetization

### Revenue Tracking
- **Live Connect** (`live-connect-js`) - User session tracking
- **Crypto-js** - Hash functions for ID generation

## CDN & Distribution

### Distribution Channels
- **jsDelivr** - Primary CDN
- **CDNJS** - Alternative CDN
- Self-hosted deployment

### Package Managers
- **npm** - Primary distribution
- **Yarn** - Supported

## Web Standards

### IAB Standards
- **OpenRTB** - Real-time bidding protocol
- **Ads.txt** - Authorized sellers
- **App-ads.txt** - Mobile app authorization
- **Sellers.json** - Seller transparency
- **ads-com** - Ad commodity standard

### Privacy Standards
- **TCF** - Transparency & Consent Framework
- **US Privacy** - CCPA/IAB privacy string
- **GPP** - Global Privacy Platform

## Database & Storage

### Client-Side Storage
- **localStorage** - Bidder data persistence
- **sessionStorage** - Session data
- **Cookies** - User identification
- **IndexedDB** - Large data storage (limited use)

## Authentication & Security

### Security Measures
- HTTPS enforcement
- CORS policy
- Content Security Policy (CSP) compatibility
- No server-side authentication (client-side only)

## Monitoring & Observability

### Error Tracking
- Console error logging
- Debug mode (`debugging.js`)
- Auction analytics

### Performance Monitoring
- Core Web Vitals tracking
- Lighthouse compatibility
- Page load impact measurement

## Build Integrations

### CI/CD
- **GitHub Actions** - Automated testing
- **BrowserStack** - Cross-browser testing
- **Coveralls** - Code coverage reporting

### Development Tools
- **Gulp** - Build automation
- **Webpack** - Module bundling
- **Babel** - Transpilation
- **ESLint** - Code quality

---
*Generated: Codebase mapping for Prebid.js*
