# Adlane RTD Provider

## Overview

The Adlane Real-Time Data (RTD) Provider automatically retrieves age consent information and adds it to the bid stream, allowing for age-appropriate ad targeting. This module does not have a Global Vendor List ID (GVL ID).

## Integration

1. Compile the Adlane RTD Module into your Prebid build:

    ```bash
    gulp build --modules=adlaneRtdProvider ...
    ```

2. Use `setConfig` to instruct Prebid.js to initialize the adlaneRtdProvider module, as specified below.

## Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 1000,
    dataProviders: [
      {
        name: "adlaneRtd",
        waitForIt: true,
      }
    ]
  }
});
```

## Parameters

| Name      | Type    | Description                                   | Default |
|-----------|---------|-----------------------------------------------|---------|
| name      | String  | Must be "adlaneRtd"                           | n/a     |
| waitForIt | Boolean | Whether to wait for the module before auction | true    |

## Age Consent Data

The module attempts to retrieve age consent data from the following sources, in order:

1. AdlCmp API (if available)
2. Local storage

The age consent data is added to the bid request in the following format:

```javascript
{
    ortb2: {
        user: {
            ext: {
                age_consent: {
                        status: 'accepted', //represents the age consent status.
                        id: "123456789123456789", //unique identifier for the consent decision // Optional
                        decisionDate: "2011-10-05T14:48:00.000Z", //ISO 8601 date string (e.g.,"2011-10-05T14:48:00.000Z") // Optional, represents the date when the age consent decision was made
                        dob: "01-01-1980", //ISO 8601 date string (e.g., "01-01-1980") // Optional, represents the user's date of birth if provided
                }
            }
        }
    }
}
```
