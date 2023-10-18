# Overview

Module Name: MyGaru Rtd Provider
Module Type: Rtd Provider
Maintainer: mygaru.com

# Description

The MyGaru RTD module is a solution for providing ciphered one-time-use onion token from "mygaru.com" provider, which grants permission to access telecom user data once.

MyGary RTD module injects token into bid request as an uid in the userId and userEids object.

Contact MyGaru manager for further DSP/SSP integration information.

# Configuration

```javascript

const mygaruProvider = {
    name: 'mygaru',
    params: {
      // no params required
    }
}
pbjs.setConfig({realTimeData: { dataProviders: [ mygaruProvider ]}})

```

# Testing

`gulp test --modules=rtdModule,mygaruRtdProvider`

## Serve

`gulp serve-fast --modules=rtdModule,mygaruRtdProvider,appnexusBidAdapter`

- in your browser, navigate to:

`http://localhost:9999/integrationExamples/gpt/mygaruRtdProvider_example.html`
