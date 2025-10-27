# LMPID

The Loblaw Media Private ID (LMPID) is the Loblaw Advance identity solution deployed by its media partners. LMPID leverages encrypted user registration information to provide a privacy-conscious, secure, and reliable identifier to power Loblaw Advance's digital advertising ecosystem.

## LMPID Registration

If you're a media company looking to partner with Loblaw Advance, please reach out to us through our [Contact page](https://www.loblawadvance.ca/contact-us)

## LMPID Configuration

First, make sure to add the LMPID submodule to your Prebid.js package with:

```
gulp build --modules=lmpIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'lmpid'
    }]
  }
});
```
