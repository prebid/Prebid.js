# Scope3 Real-Time Data Module

## Overview

The Scope3 RTD module enables real-time agentic execution for programmatic advertising. It connects Prebid.js with Scope3's Agentic Execution Engine (AEE) that analyzes complete OpenRTB bid requests and returns intelligent signals for optimizing media buying decisions.

### What It Does

This module:
1. Captures the **complete OpenRTB request** including all user IDs, geo data, device info, and site context
2. Sends it to Scope3's AEE for real-time analysis
3. Receives back targeting instructions: which line items to include/exclude this impression from
4. Applies these signals as targeting keys for the ad server

The AEE returns opaque codes (e.g., "x82s") that instruct GAM which line items should or shouldn't serve. These are NOT audience segments - they're proprietary signals for line item targeting decisions.

### Features

- **Complete OpenRTB Capture**: Sends full OpenRTB 2.x specification data including all extensions
- **AEE Signal Integration**: Receives include/exclude segments and macro data
- **Configurable Targeting Keys**: Customize the ad server keys for each signal type
- **Intelligent Caching**: Reduces latency by caching responses for similar contexts
- **Privacy Compliant**: Works with all consent frameworks and user IDs

## Configuration

### Basic Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 1000,
    dataProviders: [{
      name: 'scope3',
      params: {
        orgId: 'YOUR_ORG_ID',  // Required - your Scope3 organization identifier
        
        // Optional - customize targeting keys (defaults shown)
        includeKey: 's3i',      // Key for include segments
        excludeKey: 's3x',      // Key for exclude segments  
        macroKey: 's3m',        // Key for macro blob
        
        // Optional - other settings
        endpoint: 'https://prebid.scope3.com/prebid',  // API endpoint (default)
        timeout: 1000,          // Milliseconds (default: 1000)
        publisherTargeting: true,   // Set GAM targeting keys (default: true)
        advertiserTargeting: true,  // Enrich bid requests (default: true)
        bidders: [],            // Specific bidders to get data for (empty = all bidders in auction)
        cacheEnabled: true,     // Enable response caching (default: true)
        debugMode: false        // Enable debug logging (default: false)
      }
    }]
  }
});
```

### Advanced Configuration Examples

#### Custom Targeting Keys
Use your own naming convention for targeting keys:
```javascript
params: {
  orgId: 'YOUR_ORG_ID',
  includeKey: 'aee_include',
  excludeKey: 'aee_exclude',
  macroKey: 'aee_data'
}
```

#### Specific Bidders Only
Apply AEE signals only to certain bidders:
```javascript
params: {
  orgId: 'YOUR_ORG_ID',
  bidders: ['rubicon', 'appnexus', 'amazon'],
  advertiserTargeting: true,
  publisherTargeting: true
}
```

#### Development/Testing
```javascript
params: {
  orgId: 'YOUR_ORG_ID',
  timeout: 2000,
  debugMode: true,
  cacheEnabled: false  // Disable caching for testing
}
```

## Data Flow

### 1. Complete OpenRTB Capture
The module captures ALL available OpenRTB data:
- **Site**: page URL, domain, referrer, keywords, content, categories
- **Device**: user agent, geo location, IP, device type, screen size
- **User**: ID, buyer UIDs, year of birth, gender, keywords, data segments, **all extended IDs (eids)**
- **Impressions**: ad unit details, media types, floor prices, custom data
- **Regulations**: GDPR, COPPA, consent strings
- **App**: if in-app, all app details

### 2. Request to AEE
Sends the complete OpenRTB request with list of bidders:
```json
{
  "orgId": "YOUR_ORG_ID",
  "ortb2": {
    "site": { 
      "page": "https://example.com/page",
      "domain": "example.com",
      "cat": ["IAB1-1"],
      "keywords": "news,sports"
    },
    "device": { 
      "ua": "Mozilla/5.0...",
      "geo": {
        "country": "USA",
        "region": "CA",
        "city": "San Francisco"
      },
      "ip": "192.0.2.1"
    },
    "user": {
      "id": "user123",
      "eids": [
        {
          "source": "liveramp.com",
          "uids": [{"id": "XY123456"}]
        },
        {
          "source": "id5-sync.com", 
          "uids": [{"id": "ID5*abc"}]
        }
      ],
      "data": [...]
    },
    "imp": [...],
    "regs": { "gdpr": 1, "us_privacy": "1YNN" }
  },
  "bidders": ["rubicon", "appnexus", "amazon", "pubmatic"],
  "timestamp": 1234567890,
  "source": "prebid-rtd"
}
```

### 3. AEE Response
Receives targeting instructions with opaque codes (e.g., 'x82s', 'a91k') that tell GAM which line items to include/exclude. These are NOT audience segments or IAB taxonomy:
```json
{
  "aee_signals": {
    "include": ["x82s", "a91k", "p2m7"],
    "exclude": ["c4x9", "f7r2"],
    "macro": "ctx9h3v8s5",
    "bidders": {
      "rubicon": {
        "segments": ["r4x2", "r9s1"],
        "deals": ["RUBICON_DEAL_123", "RUBICON_DEAL_456"]
      },
      "appnexus": {
        "segments": ["apn_high_value", "apn_auto_intent"],
        "deals": ["APX_PREMIUM_DEAL"]
      },
      "amazon": {
        "segments": ["amz_prime_member"],
        "deals": []
      }
    }
  }
}
```

### 4. Signal Application

#### Publisher Targeting (GAM)
Sets the configured targeting keys (GAM automatically converts to lowercase):
- `s3i` (or your includeKey): ["x82s", "a91k", "p2m7"] - line items to include
- `s3x` (or your excludeKey): ["c4x9", "f7r2"] - line items to exclude
- `s3m` (or your macroKey): "ctx9h3v8s5" - opaque context data

#### Advertiser Data (OpenRTB)
Enriches bid requests with AEE signals:
```javascript
ortb2: {
  site: {
    ext: {
      data: {
        scope3_aee: {
          include: ["x82s", "a91k", "p2m7"],
          exclude: ["c4x9", "f7r2"],
          macro: "ctx9h3v8s5"
        }
      }
    }
  }
}
```

## Integration Examples

### Google Ad Manager Line Items

Create line items that respond to agent targeting instructions. The codes (e.g., "x82s") tell GAM "include this impression in this line item" or "exclude from this line item":

```
Include impression in this line item:
s3i contains "x82s"

Exclude impression from this line item:
s3x does not contain "f7r2"

Multiple targeting conditions:
s3i contains "a91k" AND s3x does not contain "c4x9"

Macro data for creative:
s3m is present
```

### Custom Key Configuration
If you use custom keys:
```javascript
// Configuration
params: {
  orgId: 'YOUR_ORG_ID',
  includeKey: 'targeting',
  excludeKey: 'blocking',
  macroKey: 'context'
}

// GAM Line Items would use:
targeting contains "x82s"  // Include in line item
blocking does not contain "f7r2"  // Exclude from line item
context is present  // Macro data available
```

### Bidder Adapter Integration

Bidders can access AEE signals in their adapters:

```javascript
buildRequests: function(validBidRequests, bidderRequest) {
  const aeeSignals = bidderRequest.ortb2?.site?.ext?.data?.scope3_aee;
  
  if (aeeSignals) {
    // Use include segments for targeting
    payload.targeting_segments = aeeSignals.include;
    
    // Respect exclude segments
    payload.exclude_segments = aeeSignals.exclude;
    
    // Include macro data as opaque string
    if (aeeSignals.macro) {
      payload.context_code = aeeSignals.macro;
    }
  }
}
```

## Performance Considerations

### Caching
- Responses are cached for 30 seconds by default
- Cache key includes: page, user agent, geo, user IDs, and ad units
- Reduces redundant API calls for similar contexts

### Data Completeness
The module sends ALL available OpenRTB data to maximize AEE intelligence:
- Extended user IDs (LiveRamp, ID5, UID2, etc.)
- Geo location data
- Device characteristics
- Site categorization and keywords
- User data and segments
- Regulatory consent status

### Timeout Handling
- Default timeout: 1000ms
- Auction continues if AEE doesn't respond in time
- No blocking - graceful degradation

## Privacy and Compliance

- Sends only data already available in the bid request
- Respects all consent signals (GDPR, CCPA, etc.)
- No additional user tracking or cookies
- All data transmission uses HTTPS
- Works with any identity solution

## Troubleshooting

### Enable Debug Mode
```javascript
params: {
  orgId: 'YOUR_ORG_ID',
  debugMode: true
}
```

### Common Issues

1. **No signals appearing**
   - Verify orgId is correct
   - Check endpoint is accessible
   - Ensure timeout is sufficient
   - Look for console errors in debug mode

2. **Targeting keys not in GAM**
   - Verify `publisherTargeting: true`
   - Check key names match GAM setup
   - Ensure AEE is returning signals

3. **Missing user IDs or geo data**
   - Confirm this data exists in your Prebid setup
   - Check that consent allows data usage
   - Verify identity modules are configured

## Simple Configuration

Minimal setup with defaults:

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'scope3',
      params: {
        orgId: 'YOUR_ORG_ID'  // Only required parameter
      }
    }]
  }
});
```

This will:
- Send complete OpenRTB data to Scope3's AEE
- Set targeting keys: `s3i` (include), `s3x` (exclude), `s3m` (macro)
- Enrich all bidders with AEE signals
- Cache responses for performance

## About the Agentic Execution Engine

Scope3's AEE implements the [Ad Context Protocol](https://adcontextprotocol.org) to analyze the complete context of each bid opportunity. By processing the full OpenRTB request including all user IDs, geo data, and site context, the AEE can:
- Identify optimal audience segments in real-time
- Detect and prevent unwanted targeting scenarios
- Apply complex business rules at scale
- Optimize for multiple objectives simultaneously

## Support

For technical support and AEE configuration:
- Documentation: https://docs.scope3.com
- Ad Context Protocol: https://adcontextprotocol.org
- Support: support@scope3.com