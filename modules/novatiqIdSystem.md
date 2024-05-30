# Novatiq Hyper ID

The Novatiq proprietary dynamic Hyper ID is a unique, non sequential and single use identifier for marketing activation. Our in network solution matches verification requests to telco network IDs safely and securely inside telecom infrastructure. The Novatiq Hyper ID can be used for identity validation and as a secured 1st party data delivery mechanism.

## Novatiq Hyper ID Configuration

Enable by adding the Novatiq submodule to your Prebid.js package with:

```
gulp build --modules=novatiqIdSystem,userId
```

Module activation and configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'novatiq',
      params: {
        // change to the Partner Number you received from Novatiq
        sourceid '1a3'            
        }
      }
    }],
    // 50ms maximum auction delay, applies to all userId modules
    auctionDelay: 50             
  }
});
```

### Parameters for the Novatiq Module
| Param  | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | Module identification: `"novatiq"` | `"novatiq"` |
| params | Required | Object | Configuration specifications for the Novatiq module. | |
| params.sourceid | Required | String | The Novatiq Partner Number obtained via Novatiq | `1a3` |
| params.useSharedId | Optional | Boolean | Use the sharedID module if it's activated. | `true` |
| params.sharedIdName | Optional | String | Same as the SharedID "name" parameter <br /> Defaults to "_pubcid" | `"demo_pubcid"` |
| params.useCallbacks | Optional | Boolean | Use callbacks for custom integrations | `false` |
| params.urlParams | Optional | Object | Sync URl configuration for custom integrations | |
| params.urlParams.novatiqId | Optional | String | The name of the parameter used to indicate the novatiq ID uuid | `snowflake` |
| params.urlParams.useStandardUuid | Optional | Boolean | Use a standard UUID format, or the Novatiq UUID format | `false` |
| params.urlParams.useSspId | Optional | Boolean | Send the sspid (sourceid) along with the sync request | `false` |
| params.urlParams.useSspHost | Optional | Boolean | Send the ssphost along with the sync request | `false` |

# Novatiq Hyper ID with Prebid SharedID support
You can make use of the Prebid.js SharedId module as follows. 

## Novatiq Hyper ID Configuration

Enable by adding the Novatiq and SharedId submodule to your Prebid.js package with:

```
gulp build --modules=novatiqIdSystem,userId,pubCommonId
```

Module activation and configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [
      {
        name: "pubCommonId",
        storage: {
          type: "cookie",   
          // optional: will default to _pubcid if left blank
          name: "demo_pubcid",     
          
          // expires in 1 years
          expires: 365             
        },
        bidders: [ 'adtarget' ]
      },                                            
      {
      name: 'novatiq',
      params: {
        // change to the Partner Number you received from Novatiq
        sourceid '1a3',

        // Use the sharedID module
        useSharedId: true,

        // optional: will default to _pubcid if left blank. 
        // If not left blank must match "name" in the the module above
        sharedIdName: 'demo_pubcid'   
        }
      }
    }],
    // 50ms maximum auction delay, applies to all userId modules
    auctionDelay: 50             
  }
});
```

If you have any questions, please reach out to us at prebid@novatiq.com.
