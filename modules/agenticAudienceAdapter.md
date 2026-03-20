# Agentic Audience Adapter

## Overview

| | |
|:---|:---|
| Module Name | Agentic Audience Adapter |
| Module Type | RTD Provider |
| Module Code | agenticAudienceAdapter |

## Description

This RTD module injects Agentic Audiences (vector-based) signals into the OpenRTB bid request. Agentic Audiences is an open standard by [IABTechLab](https://github.com/IABTechLab/agentic-audiences) for exchanging semantic embeddings—identity, contextual, and reinforcement signals—in a privacy-preserving, interoperable format.

The module reads agentic audience data from browser storage (localStorage or cookie) and adds it to `user.data` as segment extensions for downstream bidders.

## Usage

### Build

```
gulp build --modules="rtdModule,agenticAudienceAdapter,..."
```

> Note that the global RTD module, `rtdModule`, is a prerequisite.

### Configuration

Configure the module as part of `realTimeData.dataProviders`:

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [{
      name: 'agenticAudience',
      waitForIt: true,
      params: {
        providers: {
          liveRamp: {
            storageKey: '_lr_agentic_audience_'
          }
        }
      }
    }]
  }
});
```

### Parameters

| Name | Type | Description |
|:-----|:-----|:------------|
| name | String | RTD submodule name. Always `'agenticAudience'` |
| waitForIt | Boolean | Set to true to delay auction until module responds |
| params.providers | Object | Provider-specific config. Each key (e.g. `liveRamp`) defines a provider with its own storage. |
| params.providers.{provider}.storageKey | String | Storage key for that provider (e.g. `_lr_agentic_audience_` for LiveRamp). |

## Storage

The module reads agentic audience data from browser storage (localStorage or cookie). It first reads from the default key `_agentic_audience_`, then from each provider's `storageKey` defined under `params.providers`.

**Encoding:** Data stored in cookie or localStorage **must be base64-encoded**. The module decodes the stored value and parses it as JSON. The decoded JSON (unencoded data) is what gets injected into the bid request and sent over the wire to bidders—not the base64 string.

**Format:** The decoded JSON must contain an `entries` array. Each entry must include:

| Field | Type | Description |
|:------|:-----|:------------|
| ver | string | Specification version |
| vector | number[] | Vector embedding (float array) |
| model | string | Model identifier (e.g. `sbert-mini-ctx-001`) |
| dimension | number | Vector dimension |
| type | number[] | Embedding type(s): identity, contextual, reinforcement |

These fields align with the [Agentic Audiences OpenRTB Segment extension](https://github.com/IABTechLab/agentic-audiences).

## Example OpenRTB user object

The module injects agentic audience entries into `user.data`. Entries from the default storage key and all configured providers (e.g. LiveRamp, Optable) are merged into a single `segment` array under one Data object.

### Single provider (LiveRamp only)

```json
{
  "user": {
    "data": [
      {
        "name": "agentic-audiences.org",
        "segment": [
          {
            "ver": "1.0",
            "vector": [0.1, -0.2, 0.3],
            "model": "sbert-mini-ctx-001",
            "dimension": 3,
            "type": [1, 2]
          }
        ]
      }
    ]
  }
}
```

### Multiple providers (LiveRamp and Optable)

When configured with both LiveRamp and Optable, entries from both storage keys are combined into one `segment` array:

```json
{
  "user": {
    "data": [
      {
        "name": "agentic-audiences.org",
        "segment": [
          {
            "ver": "1.0",
            "vector": [0.1, -0.2, 0.3],
            "model": "sbert-mini-ctx-001",
            "dimension": 3,
            "type": [1]
          },
          {
            "ver": "1.0",
            "vector": [0.5, 0.6, -0.1],
            "model": "optable-embed-v1",
            "dimension": 3,
            "type": [2]
          }
        ]
      }
    ]
  }
}
```

Configuration for the multi-provider example:

```javascript
params: {
  providers: {
    liveRamp: { storageKey: '_lr_agentic_audience_' },
    optable: { storageKey: '_optable_agentic_audience_' }
  }
}
```

## References

- [IABTechLab Agentic Audiences](https://github.com/IABTechLab/agentic-audiences)
- [Agentic Audiences in OpenRTB](https://github.com/IABTechLab/agentic-audiences) (Segment extension proposal)
