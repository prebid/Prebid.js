# Overview

Module Name: Neuwo Rtd Provider
Module Type: Rtd Provider
Maintainer: neuwo.ai

# Description

Real-time data provider for Neuwo AI. Contact neuwo.ai [https://neuwo.ai/contact-us] for more information.

# Configuration

```javascript

const neuwoDataProvider = {
    name: 'NeuwoRTDModule',
    params: {
        publicToken: '<public token here>'
    }
}
pbjs.setConfig({realTimeData: { dataProviders: [ neuwoDataProvider ]}})

```

# Testing

## Add development tools if necessary

- Install node for npm
- run in prebid.js source folder:
`npm ci`
`npm i -g gulp-cli`

## Serve

`gulp serve --modules=rtdModule,neuwoRtdProvider,appnexusBidAdapter`

- in your browser, navigate to:

`http://localhost:9999/integrationExamples/gpt/neuwoRtdProvider_example.html`
