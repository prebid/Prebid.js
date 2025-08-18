# Scope3 Real-Time Data Module

## Overview

The Scope3 RTD module provides carbon footprint scoring and sustainability metrics for programmatic advertising. It analyzes bid requests in real-time and enriches them with environmental impact data, helping publishers and advertisers make more sustainable advertising decisions.

### Features

- **Carbon Footprint Scoring**: Provides carbon scores for overall auctions and individual bidders
- **Bidder Recommendations**: Identifies environmentally-friendly bidders based on carbon emissions
- **Publisher Targeting**: Sets key-value pairs for GAM targeting based on carbon scores
- **Advertiser Data**: Enriches OpenRTB bid requests with sustainability metrics
- **Intelligent Caching**: Reduces API calls by caching responses for similar requests
- **Flexible Configuration**: Supports various targeting and filtering options

## Configuration

### Basic Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 1000,
    dataProviders: [{
      name: 'scope3',
      params: {
        publisherId: 'YOUR_PUBLISHER_ID',  // Required - your Scope3 publisher identifier
        apiKey: 'YOUR_API_KEY',  // Required for authentication (temporary)
        endpoint: 'https://rtdp.scope3.com/prebid',  // Optional, defaults to production endpoint
        timeout: 1000,  // Optional, milliseconds (default: 1000)
        publisherTargeting: true,  // Optional, enable GAM targeting (default: true)
        advertiserTargeting: true,  // Optional, enrich bid requests (default: true)
        keyPrefix: 'scope3',  // Optional, prefix for targeting keys (default: 'scope3')
        bidders: [],  // Optional, list of bidders to enrich (empty = all bidders)
        cacheEnabled: true,  // Optional, enable response caching (default: true)
        debugMode: false  // Optional, enable debug logging (default: false)
      }
    }]
  }
});
```

### Advanced Configuration Examples

#### Specific Bidders Only
```javascript
params: {
  publisherId: 'YOUR_PUBLISHER_ID',
  apiKey: 'YOUR_API_KEY',
  bidders: ['rubicon', 'appnexus', 'amazon'],  // Only enrich these bidders
  advertiserTargeting: true,
  publisherTargeting: false  // Disable GAM targeting
}
```

#### Custom Targeting Keys
```javascript
params: {
  publisherId: 'YOUR_PUBLISHER_ID',
  apiKey: 'YOUR_API_KEY',
  keyPrefix: 'carbon',  // Use 'carbon_score', 'carbon_tier', etc.
  publisherTargeting: true
}
```

#### Development/Testing
```javascript
params: {
  publisherId: 'YOUR_PUBLISHER_ID',
  apiKey: 'YOUR_API_KEY',
  endpoint: 'https://staging.rtdp.scope3.com/prebid',
  timeout: 2000,
  debugMode: true,  // Enable verbose logging
  cacheEnabled: false  // Disable caching for testing
}
```

## Data Flow

### 1. Request Phase
The module extracts OpenRTB 2.x data from the bid request including:
- Site information (domain, page URL)
- Device data
- User information (if available)
- Ad unit configurations
- Bidder list

### 2. API Communication
Sends a POST request to the Scope3 API with:
```json
{
  "publisherId": "YOUR_PUBLISHER_ID",
  "ortb2": {
    "site": { /* site data */ },
    "device": { /* device data */ },
    "user": { /* user data */ },
    "imp": [ /* impressions */ ]
  },
  "adUnits": [ /* ad unit details */ ],
  "timestamp": 1234567890,
  "source": "prebid-rtd"
}
```

### 3. Response Processing
Receives carbon scoring data:
```json
{
  "scores": {
    "overall": 0.5,
    "byBidder": {
      "bidderA": 0.3,
      "bidderB": 0.7
    }
  },
  "recommendations": {
    "bidderA": { "carbonScore": 0.3, "recommended": true },
    "bidderB": { "carbonScore": 0.7, "recommended": false }
  },
  "adUnitScores": {
    "ad-unit-1": 0.4
  },
  "metadata": {
    "calculationId": "calc-123",
    "timestamp": 1234567890
  }
}
```

### 4. Data Enrichment

#### Publisher Targeting (GAM)
Sets the following key-value pairs:
- `scope3_score`: Carbon score as percentage (0-100)
- `scope3_tier`: Carbon tier classification (`low`, `medium`, `high`)
- `scope3_rec`: Array of recommended bidders

#### Advertiser Targeting (OpenRTB)
Enriches bid requests with sustainability data:

**Global ORTB2:**
```javascript
ortb2: {
  site: {
    ext: {
      data: {
        scope3: {
          carbonScore: 0.5,
          calculationId: "calc-123",
          timestamp: 1234567890
        }
      }
    }
  }
}
```

**Bidder-specific ORTB2:**
```javascript
ortb2Fragments: {
  bidder: {
    bidderA: {
      site: {
        ext: {
          data: {
            scope3: {
              carbonScore: 0.3,
              recommended: true,
              calculationId: "calc-123"
            }
          }
        }
      }
    }
  }
}
```

## Integration Examples

### Google Ad Manager Line Item Targeting

Create line items targeting based on carbon scores:

```
Low Carbon Tier:
scope3_tier = low

Medium Carbon Tier:
scope3_tier = medium

High Carbon Tier:
scope3_tier = high

Specific Score Range:
scope3_score >= 0 AND scope3_score <= 30

Recommended Bidders Only:
scope3_rec contains "rubicon" OR scope3_rec contains "appnexus"
```

### Bidder Integration

Bidders can access Scope3 data in their adapters:

```javascript
// In a bid adapter
buildRequests: function(validBidRequests, bidderRequest) {
  const scope3Data = bidderRequest.ortb2?.site?.ext?.data?.scope3;
  
  if (scope3Data) {
    // Use carbon score for bid adjustments
    const carbonScore = scope3Data.carbonScore;
    const isRecommended = scope3Data.recommended;
    
    // Include in bid request to SSP
    payload.sustainability = {
      carbonScore: carbonScore,
      calculationId: scope3Data.calculationId
    };
  }
}
```

## Performance Considerations

### Caching
- Responses are cached for 30 seconds by default
- Cache key is based on site, device, and impression count
- Reduces redundant API calls for similar requests
- Cache size is limited to 100 entries with LRU eviction

### Timeout Handling
- Default timeout: 1000ms
- Module continues auction if API fails or times out
- No delay added if data is cached

### API Limits
- Check with Scope3 for rate limiting policies
- Use caching to minimize API calls
- Consider increasing timeout for high-latency connections

## Privacy and Compliance

- No personal data is sent to Scope3
- Only contextual and technical data is transmitted
- Module respects user consent signals
- All data transmission uses HTTPS

## Troubleshooting

### Enable Debug Mode
```javascript
params: {
  publisherId: 'YOUR_PUBLISHER_ID',
  apiKey: 'YOUR_API_KEY',
  debugMode: true
}
```

### Common Issues

1. **No enrichment occurring**
   - Check API key is valid
   - Verify endpoint is accessible
   - Check browser console for errors
   - Ensure timeout is sufficient

2. **Targeting keys not appearing**
   - Verify `publisherTargeting: true`
   - Check GAM setup for key-value targeting
   - Ensure scores are being returned from API

3. **Specific bidders not enriched**
   - Check bidder names match exactly
   - Verify bidder is in the `bidders` array (if specified)
   - Confirm bidder data is returned from API

## Testing

### Unit Tests
Run the module tests:
```bash
gulp test --file test/spec/modules/scope3RtdProvider_spec.js
```

### Integration Testing
1. Enable debug mode
2. Load a test page with Prebid
3. Check browser console for Scope3 RTD logs
4. Verify targeting keys in ad server calls
5. Inspect bid requests for enriched data

## Support

For technical support and API access:
- Documentation: https://docs.scope3.com
- API Status: https://status.scope3.com
- Support: support@scope3.com

## Migration Notes

### Transitioning to Production Endpoint
When the `https://rtdp.scope3.com/prebid` endpoint becomes available:

1. Update configuration to remove API key:
```javascript
params: {
  publisherId: 'YOUR_PUBLISHER_ID',
  endpoint: 'https://rtdp.scope3.com/prebid',
  // apiKey no longer needed
}
```

2. The module will automatically detect the missing API key and skip authentication headers.

### API Key Security
**IMPORTANT**: Never commit API keys to version control. Use environment-specific configuration:

```javascript
// Load from environment variable or secure configuration service
const scope3ApiKey = getSecureConfig('SCOPE3_API_KEY');

pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'scope3',
      params: {
        publisherId: 'YOUR_PUBLISHER_ID',
        apiKey: scope3ApiKey
      }
    }]
  }
});
```