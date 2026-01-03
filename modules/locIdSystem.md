# LocID User ID Submodule

The LocID User ID submodule provides ORTB2-first identity solutions for display advertising with deterministic holdout for lift measurement. **Version 2.0** is first-party only with no remote calls.

## Overview

LocID offers two identity generation strategies:
- **Publisher**: Use existing LocID values provided by the publisher  
- **Device**: Generate and persist first-party device IDs (default)

The module follows privacy-safe practices with no PII collection, no fingerprinting, respects consent frameworks, and includes deterministic A/B testing with exposure logging.

## Key Features (v2.0)

✅ **ORTB2-first**: Injects identity signals into `ortb2.user.ext.data`  
✅ **First-party only**: No remote endpoints or third-party calls  
✅ **Deterministic holdout**: 90/10 split for lift measurement  
✅ **Exposure logging**: Best-effort beacon/fetch logging for analytics  
✅ **Non-blocking**: Error handling ensures auctions never fail  
✅ **Consent-safe**: Full GDPR, CCPA, and GPP support

## Module Configuration

### Basic Configuration

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'device', // 'publisher' or 'device' (default)
        // Holdout configuration (optional)
        holdoutOverride: undefined, // 'forceControl', 'forceTreatment', or undefined for 90/10 split
        // Exposure logging (optional)
        loggingEndpoint: 'https://your-analytics-endpoint.com/log'
      },
      storage: {
        type: 'localStorage', // 'localStorage', 'cookie', or 'localStorage&cookie'
        name: '_locid',
        expires: 30, // days
        refreshInSeconds: 86400 // 24 hours
      }
    }]
  }
});
```

### Publisher Source Configuration

Use when you have existing LocID values to provide directly:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'publisher'
      },
      value: 'your-existing-locid-value'
      // No storage needed for publisher source
    }]
  }
});
```

### Device Source Configuration

Generates and persists first-party device identifiers:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'device'
      },
      storage: {
        type: 'localStorage&cookie', // Fallback from localStorage to cookie
        name: '_locid',
        expires: 30,
        refreshInSeconds: 86400 // Refresh daily
      }
    }]
  }
});
```

## ORTB2 Data Output

LocID automatically injects the following into `ortb2.user.ext.data`:

```javascript
{
  "locid_confidence": 1.0,           // ID confidence (constant 1.0 in v2.0)
  "locid_stability_days": 15,        // Days since ID was first stored  
  "locid_audiences": []              // Audience segments (empty in v2.0)
}
```

**Holdout Behavior:**
- 90% of users (treatment): Get ORTB2 data injection + exposure logging
- 10% of users (control): Get no ORTB2 data + control logging
- Deterministic assignment based on `hash(locid) mod 10`

## Storage Configuration

### Storage Types
- `localStorage`: HTML5 localStorage only
- `cookie`: HTTP cookies only  
- `localStorage&cookie`: Try localStorage first, fallback to cookies
- `cookie&localStorage`: Try cookies first, fallback to localStorage

### Storage Parameters
- `name`: Storage key name (default: `_locid`)
- `expires`: Expiration in days (default: 30)
- `refreshInSeconds`: Time before refresh in seconds (default: 86400)

## Exposure Logging for Lift Measurement

LocID logs exposure data for A/B testing analysis when `loggingEndpoint` is configured:

```javascript
// Example log payload sent via navigator.sendBeacon()
{
  "auction_id": "abc123",
  "is_holdout": false,
  "locid_present": true,
  "signals_emitted": 3,
  "signal_names": ["locid_confidence", "locid_stability_days", "locid_audiences"],
  "timestamp": 1640995200000
}
```

**Fallback Strategy:**
1. `navigator.sendBeacon()` (preferred)
2. `fetch()` with `keepalive: true` 
3. Skip logging (never blocks)

## GAM Integration

### PPID (Publisher Provided ID) Integration

Configure LocID to output GAM-compatible PPID format:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'device',
        gam: {
          enabled: true,
          mode: 'ppid',
          key: 'locid',
          maxLen: 150
        }
      },
      storage: { /* storage config */ }
    }]
  }
});
```

Then wire into GAM in your page:

```javascript
// Wait for LocID to be available
pbjs.getUserIds((userIds) => {
  if (userIds.locId && userIds._gam && userIds._gam.ppid) {
    googletag.cmd.push(() => {
      googletag.pubads().setPublisherProvidedId({
        source: 'locid.com',
        value: userIds._gam.ppid
      });
    });
  }
});

// Or check before ad requests
googletag.cmd.push(() => {
  const userIds = pbjs.getUserIds();
  if (userIds.locId && userIds._gam && userIds._gam.ppid) {
    googletag.pubads().setPublisherProvidedId({
      source: 'locid.com', 
      value: userIds._gam.ppid
    });
  }
  // Define ad slots and display ads
});
```

### Encrypted Signals Integration (Future)

Configure for GAM encrypted signals:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'device',
        gam: {
          enabled: true,
          mode: 'encryptedSignal',
          key: 'locid_encrypted'
        }
      },
      storage: { /* storage config */ }
    }]
  }
});
```

Publisher integration snippet:

```javascript
// Wait for LocID encrypted signal
pbjs.getUserIds((userIds) => {
  if (userIds.locId && userIds._gam && userIds._gam.encryptedSignal) {
    googletag.cmd.push(() => {
      googletag.pubads().setEncryptedSignalProviders([{
        id: 'locid.com',
        signalSource: userIds._gam.encryptedSignal
      }]);
    });
  }
});
```

## Consent Handling

LocID respects privacy consent frameworks:

### GDPR/TCF
- When GDPR applies and consent is missing/denied, storage operations are skipped
- ID generation still works for `source: 'publisher'` (no storage required)
- Publisher-provided IDs can still be passed through when legally permissible

### US Privacy (CCPA)
- Detects US Privacy opt-out signal (`1Y--`)
- Skips storage operations when opt-out is detected
- ID generation continues for non-storage sources

### GPP (Global Privacy Platform)
- Monitors GPP signals for opt-out indicators
- Respects child-sensitive data consent requirements
- Integrates with Prebid's consent management

### Example with Consent Handling

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'device'
      },
      storage: {
        type: 'localStorage',
        name: '_locid',
        expires: 30
      }
    }]
  }
});

// LocID will automatically:
// 1. Check GDPR consent status
// 2. Check US Privacy opt-out
// 3. Check GPP signals
// 4. Only store IDs when consent allows
// 5. Generate IDs regardless (for immediate use)
```

## Bidder Integration

LocID automatically provides standardized userId and EID formats:

### userId Object
```javascript
{
  locId: "550e8400-e29b-41d4-a716-446655440000"
}
```

### EID Format
```javascript
{
  source: "locid.com",
  uids: [{
    id: "550e8400-e29b-41d4-a716-446655440000",
    atype: 1
  }]
}
```

## Advanced Configuration Examples

### Multi-Storage with Refresh Logic
```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'device'
      },
      storage: {
        type: 'localStorage&cookie',
        name: '_locid_primary',
        expires: 30,
        refreshInSeconds: 3600 // Refresh every hour
      }
    }]
  }
});
```

### Holdout Override for Testing
```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        source: 'device',
        holdoutOverride: 'forceTreatment', // Force into treatment for testing
        loggingEndpoint: 'https://your-analytics.com/log'
      },
      storage: {
        type: 'localStorage',
        name: '_locid_test',
        expires: 30
      }
    }]
  }
});
```

## Troubleshooting

### Enable Debug Logging
LocID uses Prebid's standard logging. Enable with:

```javascript
pbjs.setConfig({
  debug: true
});
```

Look for log messages prefixed with "LocID:" in the browser console.

### Common Issues

**Issue**: No ORTB2 data appearing
- **Check**: Verify user is not in holdout control group (check `holdoutOverride`)
- **Check**: Ensure valid consent exists (GDPR/CCPA/GPP)
- **Check**: Console for LocID error messages about ID generation

**Issue**: ID not persisting
- **Check**: Verify storage configuration is correct
- **Check**: Check browser's privacy settings allow localStorage/cookies
- **Check**: Verify consent status (GDPR/CCPA/GPP)

**Issue**: Exposure logging not working
- **Check**: Verify `loggingEndpoint` is configured correctly
- **Check**: Check browser developer tools Network tab for beacon/fetch calls
- **Check**: Ensure endpoint accepts POST requests with JSON data

**Issue**: GAM integration not working
- **Check**: Verify GAM configuration has `enabled: true`
- **Check**: Ensure GPT integration code runs after Prebid user ID resolution
- **Check**: Confirm userIds object has both `locId` and `_gam` properties

### Console Commands for Testing

```javascript
// Check current LocID value
pbjs.getUserIds();

// Force refresh user IDs
pbjs.refreshUserIds();

// Check stored values (browser dev tools)
localStorage.getItem('_locid'); // For localStorage
document.cookie; // For cookies

// Clear stored ID for testing
localStorage.removeItem('_locid');
```

## Extension Points for Future Features

The LocID module is designed with extension points for:

1. **Video Support**: EID configurations can be extended for video-specific sources
2. **CTV Integration**: Additional endpoints and storage mechanisms for Connected TV
3. **Enhanced GAM Signals**: Expanded encrypted signal formats and processing
4. **Real-time Updates**: WebSocket or Server-Sent Events for dynamic ID updates

## Module Implementation Reference

Reference implementation: **AMX ID System** (`modules/amxIdSystem.js`)

Key design patterns followed:
- Storage manager usage with proper consent checks
- Configurable endpoint calls with timeout handling  
- localStorage and cookie fallback logic
- EID format standardization
- Comprehensive error handling and logging