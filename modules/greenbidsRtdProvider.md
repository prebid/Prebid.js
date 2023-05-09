# Overview

```
Module Name: Greenbids RTD Provider
Module Type: RTD Provider
Maintainer: jb@greenbids.ai
```

# Description

The Greenbids RTD adapter allows to dynamically filter calls to SSP to reduce outgoing call to the programmatics chain, reducing ad serving carbon impact

## Configuration

This module is configured as part of the `realTimeData.dataProviders` object.

{: .table .table-bordered .table-striped }
| Name       | Scope    | Description                            | Example       | Type     |
|------------|----------|----------------------------------------|---------------|----------|
| `name `     | required | Real time data module name | `'greenbidsRtdProvider'`   | `string` |
| `waitForIt `     | required (mandatory true value) | Tells prebid auction to wait for the result of this module | `'true'`   | `boolean` |
| `params`      | required |  | | `Object` |
| `params.pbuid`      | required | The client site id provided by Greenbids. | `'TEST_FROM_GREENBIDS'` | `string` |
| `params.targetTPR`      | optional (default 0.95) | Target True positive rate for the throttling model | `0.99` | `[0-1]` |
| `params.timeout`      | optional (default 200) | Maximum amount of milliseconds allowed for module to finish working (has to be <= to the realTimeData.auctionDelay property) | `200` | `number` |

#### Example

```javascript
const greenbidsDataProvider = {
  name: 'greenbidsRtdProvider',
  waitForIt: true,
  params: {
    pbuid: 'TEST_FROM_GREENBIDS',
    timeout: 200
  }
};

pbjs.setConfig({
  realTimeData: {
    auctionDelay: 200,
    dataProviders: [greenbidsDataProvider]
  }
});
```

## Integration
To install the module, follow these instructions:

#### Step 1: Contact Greenbids to get a pbuid and account

#### Step 2: Integrate the Greenbids Analytics Adapter 

Greenbids RTD module works hand in hand with Greenbids Analytics module
See prebid Analytics modules -> Greenbids Analytics module

#### Step 3: Prepare the base Prebid file

- Option 1: Use Prebid [Download](/download.html) page to build the prebid package. Ensure that you do check *Greenbids RTD Provider* module

- Option 2: From the command line, run `gulp build --modules=greenbidsRtdProvider,...`

#### Step 4: Set configuration

Enable Greenbids Real Time Module using `pbjs.setConfig`. Example is provided in Configuration section.
