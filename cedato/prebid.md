## Prebid

Latest bundle:
prebid 5.9

### Patches Prebid core
+ Patched to allow vastXML to pass video validation. 
+ Patched to allow configuration reset.

### Patches in adapters
+ krushmedia - support to playerSize double array
+ richaudience - support to playerSize double array


### Build
```sh
npm run bundle:cedato
npm run bundle:zippor
```


### Enabled modules
+ Consent Management - GDPR
+ Consent Management - US Privacy
+ Supply Chain Object
+ removed __ User ID: ID5 ID __
+ removed __ User ID: PubCommon ID __
+ removed __ User ID: Unified ID __


### Enabled Adapters
See corresponding ```modules.json```
