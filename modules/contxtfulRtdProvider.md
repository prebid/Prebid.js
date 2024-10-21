# Overview

**Module Name:** Contxtful RTD Provider  
**Module Type:** RTD Provider  
**Maintainer:** [prebid@contxtful.com](mailto:prebid@contxtful.com)

# Description

The Contxtful RTD module offers a unique feature—Receptivity. Receptivity is an efficiency metric, enabling the qualification of any instant in a session in real time based on attention. The core idea is straightforward: the likelihood of an ad’s success increases when it grabs attention and is presented in the right context at the right time.

To utilize this module, you need to register for an account with [Contxtful](https://contxtful.com). For inquiries, please contact [prebid@contxtful.com](mailto:prebid@contxtful.com).

# Configuration

## Build Instructions

To incorporate this module into your `prebid.js`, compile the module using the following command:

```sh
gulp build --modules=contxtfulRtdProvider,<other modules...>
```

## Module Configuration

Configure the `contxtfulRtdProvider` by passing the required settings through the `setConfig` function in `prebid.js`.

```js
import pbjs from 'prebid.js';

pbjs.setConfig({
  "realTimeData": {
    "auctionDelay": 1000,
    "dataProviders": [
      {
        "name": "contxtful",
        "waitForIt": true,
        "params": {
          "version": "<API Version>",
          "customer": "<Contxtful Customer ID>"
        }
      }
    ]
  }
});
```

### Configuration Parameters

| Name       | Type     | Scope    | Description                               |
|------------|----------|----------|-------------------------------------------|
| `version`  | `string` | Required | Specifies the API version of Contxtful.   |
| `customer` | `string` | Required | Your unique customer identifier.          |

# Usage

The `contxtfulRtdProvider` module loads an external JavaScript file and authenticates with Contxtful APIs. The `getTargetingData` function then adds a `ReceptivityState` to each ad slot, which can have one of two values: `Receptive` or `NonReceptive`.

```json
{
  "adUnitCode1": { "ReceptivityState": "Receptive" },
  "adUnitCode2": { "ReceptivityState": "NonReceptive" }
}
```

This module also integrates seamlessly with Google Ad Manager, ensuring that the `ReceptivityState` is available as early as possible in the ad serving process.