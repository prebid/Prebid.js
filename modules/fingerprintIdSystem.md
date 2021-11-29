# Fingerprint User ID

Fingerprint is an advanced technique to find a unique user ID hash on the client side. 
For more information visit: 
https://fingerprintjs.com/  

## Fingerprint ID Configuration

First, make sure to add the FingerprintID submodule to your Prebid.js package with:

```
gulp build --modules=fingerprintIdSystem,userId
```

The following configuration is sufficient, No extra parameters is required:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'fingerprintId'
    }],
  }
});
