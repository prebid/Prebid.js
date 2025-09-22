# Overview

    Module Name: Rumble Bidder Adapter
    Module Type: Bidder Adapter
    Maintainer: adtech@rumble.com

## Description

Connects to Rumble Advertising Center (`RAC` for short) for bids.

## Configuration

### Parameters
Rumble requires multiple parameters. These parameters may be set globally or per each ad unit.

| Parameter   | Global | AdUnit | Description                                        |
|-------------|--------|--------|----------------------------------------------------|
| publisherId | x      | x      | Your RAC account publisher ID                      |
| siteId      | x      | x      | The site ID you want to send requests              |                      
| zoneId      |        | x      | An optional zone ID that you want to send requests |
| test        | x      | x      | An optional boolean flag for sending test requests |

#### Global Configuration

The global configuration is used to set parameters across all ad units instead of individually.

```javascript
pbjs.setConfig({
    rumble: {
        publisherId: 1,
        siteId: 2,
    }
})
```

#### Ad-unit configuration

All global configuration may be overridden by ad-unit configuration in addition to adding ad-unit only parameters.

```javascript
let adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]],
            }
        },
        bids: [
            {
                bidder: "rumble",
                params: {
                    publisherId: 1,
                    siteId: 1,
                    zoneId: 1, // optional
                }
            }
        ]
    }
];
```

## Test Parameters


### Sample Display Ad Unit
```javascript
let adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]],
            }
        },
        bids: [
            {
                bidder: "rumble",
                params: {
                    publisherId: 1,
                    siteId: 1,
                    zoneId: 1, // optional
                    test: true // only while testing
                }
            }
        ]
    }
]
```

### Sample Video Ad Unit
```javascript
let adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            video: {
                mimes: ['video/mp4'],
            }
        },
        bids: [
            {
                bidder: "rumble",
                params: {
                    publisherId: 1,
                    siteId: 1,
                    zoneId: 1, // optional
                    test: true // only while testing
                }
            }
        ]
    }
]
```
