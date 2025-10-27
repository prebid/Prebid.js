# Overview

```
Module Name: Contxtful Bidder Adapter
Module Type: Bidder Adapter
Maintainer: contact@contxtful.com
```

# Description

The Contxtful Bidder Adapter supports all mediatypes and connects to demand sources for bids.
 
# Configuration
## Global Configuration
Contxtful uses the global configuration to store params once instead of duplicating for each ad unit.
Also, enabling user syncing greatly increases match rates and monetization. 
Be sure to call `pbjs.setConfig()` only once.

```javascript
pbjs.setConfig({
   debug: false,
   contxtful: {
      customer: '<contxtful_provided_id>', // Required
      version: '<contxtful_provided_version>', // Required
   },
   userSync: {
      filterSettings: {
        iframe: {
          bidders: ['contxtful'],
          filter: 'include'
        }
      }
   }
   // [...]
});
```

## Bidder Setting
Contxtful leverages local storage for user syncing.

```javascript
pbjs.bidderSettings = {
   contxtful: {
      storageAllowed: true
   }
}
```

# Example Ad-units configuration
```javascript
var adUnits = [
   {
      code: 'adunit1',
      mediaTypes: {
         banner: {
            sizes: [ [300, 250], [320, 50] ],
         }
      },
      bids: [{
         bidder: 'contxtful',
      }]
   },
   {
      code: 'addunit2',
         mediaTypes: {
            video: {
               playerSize: [ [640, 480] ],
               context: 'instream',
               minduration: 5,
               maxduration: 60,
            }
         },
         bids: [{
            bidder: 'contxtful',
         }]
   },
   {
      code: 'addunit3',
      mediaTypes: {
         native: {
            title: {
               required: true
            },
            body: {
               required: true
            },
            icon: {
               required: true,
               size: [64, 64]
            }
         }
      },
      bids: [{
         bidder: 'contxtful',
      }]
   }
];
```
