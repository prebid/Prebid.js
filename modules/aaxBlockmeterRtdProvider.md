## Overview

Module Name: AAX Blockmeter Realtime Data Module  
Module Type: Rtd Provider  
Maintainer: product@aax.media  

## Description

The module enables publishers to measure traffic coming from visitors using adblockers. 

AAX can also help publishers monetize this traffic by allowing them to serve [acceptable ads](https://acceptableads.com/about/) to these adblock visitors and recover their lost revenue. [Reach out to us](https://www.aax.media/try-blockmeter/) to know more.

## Integration

Build the AAX Blockmeter Realtime Data Module into the Prebid.js package with:

```
gulp build --modules=aaxBlockmeterRtdProvider,rtdModule
```

## Configuration

This module is configured as part of the `realTimeData.dataProviders` object.

|    Name    |  Scope   | Description                  |     Example     |  Type  |
|:----------:|:--------:|:-----------------------------|:---------------:|:------:|
|    `name`    | required | Real time data module name   | `'aaxBlockmeter'` | `string` |
|   `params`   | required |                              |                 | `Object` |
| `params.pub` | required | AAX to share pub ID, [Reach out to us](https://www.aax.media/try-blockmeter/) to know more! |   `'AAX00000'`    | `string` |
| `params.url`     | optional | AAX Blockmeter Script Url. Defaults to `'c.aaxads.com/aax.js?ver=1.2'` | `'c.aaxads.com/aax.js?ver=1.2'`   | `string` |

### Example

```javascript
pbjs.setConfig({
        "realTimeData": {
             "dataProviders": [
                {
                    "name": "aaxBlockmeter",
                    "params": {
                        "pub": "AAX00000",
                        "url": "c.aaxads.com/aax.js?ver=1.2",
                    }
                }
             ]
        }
})
```
