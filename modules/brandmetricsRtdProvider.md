# Brandmetrics Real-time Data Submodule
TODO

## Usage
Compile the Brandmetrics RTD module into your Prebid build:
```
gulp build --modules=rtdModule,brandmetricsRtdProvider
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the Brandmetrics RTD module.

Enable the Brandmetrics RTD in your Prebid configuration, using the below format:

```javascript
pbjs.setConfig({
  ...,
  realTimeData: {
    auctionDelay: 500, // auction delay
    dataProviders: [{
      name: 'brandmetrics',
      waitForIt: true // should be true if there's an `auctionDelay`
    }]
  },
  ...
})
```
NOTE: A brandmetrics site- script present at the site is required at this point

# TODO