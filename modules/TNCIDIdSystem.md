# TNCID UserID Module

### Prebid Configuration

First, make sure to add the TNCID submodule to your Prebid.js package with:

```
gulp build --modules=TNCIDIdSystem,userId
```

You can configure this submodule in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [
      {
        name: 'TNCID',
      },
    ],
  },
});
```
