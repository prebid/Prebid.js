# Overview

# NOTE: ZEUS PRIME HAS BEEN DEPRECATED!
# THIS MODULE WILL BE REMOVED IN PREBID 8.

Module Name: Zeus Prime RTD Provider
Module Type: Rtd Provider
Maintainer: support@zeustechnology.com

## Description

The Zeus Prime RTD Provider provides integration of Zeus Prime onto sites with Prebid. This module will request information from Zeus Prime servers to add the page level targeting required for Prime into the customer's ad setup.

Zeus Prime runs as soon as the code is initialized, so it can retrieve the information required from the Zeus Prime server to create the targeting key-values. Zeus Prime will provide two page level key-values: `zeus_<yourGamId>` and `zeus_insights`. Zeus Prime provides contextual information about a pages content, and does not provide user information that could present privacy implications.

For more information and help with setting up Zeus Prime, see the [onboarding documentation site](https://onboarding.zeustechnology.com).

## Usage

To use Zeus Prime, add `zeusPrimeRtdProvider` into your Prebid build: 

```
gulp build --modules=rtdModule,zeusPrimeRtdProvider
```

> Note that the global RTD module, `rtdModule`, is required for the Zeus Prime RTD module.

Once the code is included, configure Zeus Prime in your Prebid configuration: 

```javascript
pbjs.setConfig({
  ...,
  realTimeData: {
    dataProviders: [{
      name: 'zeusPrime',
      waitForIt: false,
      params: {
        gamId: '<yourGamId>'
      }
    }]
  },
  ...
})
```

## Parameters

The parameters below describe the configuration object used to configure Zeus Prime. 

| Name                   | Type     | Description                                                                                   | Default |
|------------------------|----------|-----------------------------------------------------------------------------------------------|---------|
| name                   | String   | This will always be `zeusPrime`                                                               | -       |
| waitForIt              | Boolean  | Should be false since Zeus Prime runs on initial load and not during the bidding cycle.       | `false` |
| params                 | Object   |                                                                                               | -       |
| params.gamId           | String   | The gamId or Google Ad Manager Network Code to access your Google Ad Manager instance.        | -       |

### `gamId` Parameter

Zeus Prime requires the gamId parameter, or the Google Ad Manager Network Code, to reference your account. See the [Google documentation](https://support.google.com/admanager/answer/7674889?hl=en) to find out where you can retrieve the Network Code.

## Troubleshooting 

For troubleshooting steps and guides to assist with verifying your Zeus Prime installation, see our [installation documentation](https://onboarding.zeustechnology.com/docs/installation).