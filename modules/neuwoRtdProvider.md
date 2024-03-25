# Overview

Module Name: Neuwo Rtd Provider
Module Type: Rtd Provider
Maintainer: neuwo.ai

# Description

The Neuwo AI RTD module is an advanced AI solution for real-time data processing in the field of contextual targeting and advertising. With its cutting-edge algorithms, it allows advertisers to target their audiences with the highest level of precision based on context, while also delivering a seamless user experience.

The module provides advertiser with valuable insights and real-time contextual bidding capabilities. Whether you're a seasoned advertising professional or just starting out, Neuwo AI RTD module is the ultimate tool for contextual targeting and advertising.

The benefit of Neuwo AI RTD module is that it provides an alternative solution for advertisers to target their audiences and deliver relevant advertisements, as the widespread use of cookies for tracking and targeting is becoming increasingly limited.

The RTD module uses cutting-edge algorithms to process real-time data, allowing advertisers to target their audiences based on contextual information, such as segments, IAB Tiers and brand safety. The RTD module is designed to be flexible and scalable, making it an ideal solution for advertisers looking to stay ahead of the curve in the post-cookie era.

Generate your token at: [https://neuwo.ai/generatetoken/]

# Configuration

```javascript

const neuwoDataProvider = {
    name: 'NeuwoRTDModule',
    params: {
        publicToken: '<public token here>',
        apiUrl: '<replace this with your Neuwo API url>'
    }
}
pbjs.setConfig({realTimeData: { dataProviders: [ neuwoDataProvider ]}})

```

# Testing

`gulp test --modules=rtdModule,neuwoRtdProvider`

## Add development tools if necessary

- Install node for npm
- run in prebid.js source folder:
`npm ci`
`npm i -g gulp-cli`

## Serve

`gulp serve --modules=rtdModule,neuwoRtdProvider,appnexusBidAdapter`

- in your browser, navigate to:

`http://localhost:9999/integrationExamples/gpt/neuwoRtdProvider_example.html`
