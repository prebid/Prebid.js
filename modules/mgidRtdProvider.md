# Overview

```
Module Name: Mgid RTD Provider
Module Type: RTD Provider
Maintainer: prebid@mgid.com
```

# Description

Mgid RTD module allows you to enrich bid data with contextual and audience signals, based on IAB taxonomies.

## Configuration

This module is configured as part of the `realTimeData.dataProviders` object.

{: .table .table-bordered .table-striped }
| Name       | Scope    | Description                            | Example       | Type     |
|------------|----------|----------------------------------------|---------------|----------|
| `name `     | required | Real time data module name | `'mgid'`   | `string` |
| `params`      | required |  | | `Object` |
| `params.clientSiteId`      | required | The client site id provided by Mgid. | `'123456'` | `string` |
| `params.timeout`      | optional | Maximum amount of milliseconds allowed for module to finish working | `1000` | `number` |

#### Example

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'mgid',
            params: {
              clientSiteId: '123456'
            }
        }]
    }
});
```

## Integration
To install the module, follow these instructions:

#### Step 1: Prepare the base Prebid file

- Option 1: Use Prebid [Download](/download.html) page to build the prebid package. Ensure that you do check *Mgid Realtime Module* module

- Option 2: From the command line, run `gulp build --modules=mgidRtdProvider,...`

#### Step 2: Set configuration

Enable Mgid Real Time Module using `pbjs.setConfig`. Example is provided in Configuration section.
