
#### `appId` [Optional]
This parameter is a legacy one, and describes the relation between a website, and LiveIntent's media business entities.
This field does not have the default value. If it is not set, the appId calculation can be done server side, on the collector.
Example:
```javascript
{
  appId: "a-00xx"
}
```
#### `distributorId` [Optional]
This parameter is an identifier for distributors.
It does not have a default value and must be set in case of distributors scripts.
If `distributorId` is provided, the `appId` configuration parameter must not be set.
Example:
```javascript
{
  distributorId: "did-00xx"
}
```
#### `wrapperName` [Optional]
This parameter should be used when this module is required/imported in within another tracker. Often times, we'd like to separate the events received from a specific library encapsulating LiveConnect. If that is the case, it's recommended to set this parameter accordingly.
Example
```javascript
{
  wrapperName:"prebid"
}
```
#### `storageStrategy` [Optional, HasDefault]
This parameter defines whether the first party identifiers that LiveConnect creates and updates are stored in a cookie jar, or in local storage. If nothing is set, default behaviour would be `cookie`.
Example for storing the identifiers in a cookie jar:
```javascript
{
  storageStrategy: 'cookie'
}
```
or if putting the identifier in local storage is an option:
```javascript
{
  storageStrategy: 'ls'
}
```
There's also an option for the module to never create any first party identifiers, and that can be achieved by setting this parameter as follows:
```javascript
{
  storageStrategy: 'none'
}
```
By setting this flag, LiveConnect will never write anything into any storage, but will still attempt to read from it.

There's also an option for the module to never read or create any first or third party identifiers. That can be achieved by setting this parameter as follows:
```javascript
{
  storageStrategy: 'disabled'
}
```
LiveConnect uses this strategy if it is required by the provided privacy settings. Currently, if `config.gdprApplies` is true (`config.gdprConsent` is not evaluated for that setting yet), `disabled` strategy will be used. In that case a potentially explicitly configured storage strategy will be overwritten with `disabled`.

#### `collectorUrl` [Optional, HasDefault]
The parameter defines where the signal pixels are pointing to. The params and paths will be defined subsequently.
If the parameter is not set, LiveConnect will by default emit the signal towards `https://rp.liadm.com`.
The collectorUrl can be any service that can understand the query parameter structure LiveConnect emits.


Example:
```javascript
{
  collectorUrl:"https://rp.liadm.com"
}
```
#### `usPrivacyString` [Optional]
The IAB (https://iabtechlab.com/standards/ccpa/) privacy string that will be sent along with each request.

Example:
```javascript
{
  usPrivacyString:"1YYY"
}
```

#### `gdprApplies` [Optional]
The IAB (https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20Consent%20string%20and%20vendor%20list%20formats%20v2.md) flag that notifies us whether GDPR policies apply.

Example:
```javascript
{
  gdprApplies: true
}
```

#### `gdprConsent` [Optional]
The IAB (https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20Consent%20string%20and%20vendor%20list%20formats%20v2.md) consent string.

Example:
```javascript
{
  gdprConsent: 'base64url-encoded TC string with segments'
}
```

#### `expirationDays` [Optional, HasDefault]
The expiration time of an identifier created and updated by LiveConnect.
By default, 730 days.

Example:
```javascript
{
  expirationDays:729
}
```
#### `identifiersToResolve` [Optional]
The names of identifiers which can be found in local storage or in the cookie jar. Those key-value pairs will be sent along with the request. Think of as a way to do first party cookie syncs, because you'll be able to receive multiple first party identifiers in the same request.

Example:
```javascript
{
  identifiersToResolve:["tdid","some-fpc"]
}
```
#### `trackerName` [Optional, HasDefault]
You might want multiple trackerNames on the page, so this can be the used to separate multiple use cases. By default, LC will use the version of this module.
The default value will be taken from `package.json` if it's not set.
Example:
```javascript
{
  trackerName:"v1.0.1"
}
```

#### `identityResolutionConfig` [Optional, HasDefault]
LiveConnect module comes with a functionality to resolve all the identifiers set in the `identifiersToResolve`, additionally to the first party ones created by LiveConnect (in case `storageStrategy` is anything else than `none`, and an actual identifier has been stored).
This configuration setting consists of the following

##### `identityResolutionConfig.url` [Optional, HasDefault]
By default, `https://idx.liadm.com/idex`.
This parameter should be used in case you might have a specific CNAME per customer, so you can change settings between websites accordingly.
Example:
```javascript
{
  identityResolutionConfig: {
    url: 'https://publisher.liveintent.com/idex'
  }
}
```

##### `identityResolutionConfig.expirationHours` [Optional, HasDefault]
By default, 1 hour.
This configuration parameter determines the expiration of a result stored in previous `liveConnect.resolve (...)` calls. The result is stored in a cookie.
Example:
```javascript
{
  identityResolutionConfig: {
    expirationHours: 4
  }
}
```
sets the cookie expiration time to 4 hours, which means that in a given browser, the LiveIntent stable id will be reused for 4 hours until it's refreshed.

##### `identityResolutionConfig.ajaxTimeout` [Optional, HasDefault]
By default, 5000 milliseconds.
This configuration parameter sets the maximum duration of a call to the IdentityResolution endpoint, after which the callback passed to the `resolve` function will be invoked.
Example:
```javascript
{
  identityResolutionConfig: {
    ajaxTimeout: 3000
  }
}
```
sets the timeout to 3000 millis.

##### `identityResolutionConfig.source` [Optional, HasDefault]
By default, `unknown`.
This parameter can be used to differentiate the source of the calls to the IdentityResolution endpoint, in case your IdentityResolution endpoint is capturing multiple wrappers containing LiveConnect.
Example:
```javascript
{
  identityResolutionConfig: {
    source: 'prebid'
  }
}
```

##### `identityResolutionConfig.publisherId` [Optional, HasDefault]
By default, `any`.
This parameter can be used to track the specific publisher/website that's making use of the stable id returned by the IdentityResolution endpoint.
Example:
```javascript
{
  identityResolutionConfig: {
    publisherId: 1234
  }
}
```

##### `identityResolutionConfig.requestedAttributes` [Optional, HasDefault]
Attributes that should be resolved by the identity resolution endpoint.
Example:
```javascript
{
  identityResolutionConfig: {
    requestedAttributes: ['nonId', 'uid2']
  }
}
```

##### `contextSelectors` [Optional]
The context selectors to collect from the current page.
Example:
```javascript
{
  contextSelectors: "h1,h2,p"
}
```

##### `contextElementsLength` [Optional]
The maximum string length for the collected elements, truncated at this length when it exceeds.
Example:
```javascript
{
  contextElementsLength: 6000
}
```

##### `globalVarName` [Optional]

This parameter allows to define the name for the Live Connect instance that is attached to the window object, by default: `liQ`.
For example `globalVarName: "liQ2"` will make the instance name `window.liQ2` instead of `window.liQ`.

Example:
```javascript
{
  globalVarName: "liQ2"
}
```
