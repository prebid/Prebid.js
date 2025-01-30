## Utiq User ID Submodule

Utiq MTP ID Module.

### Utiq installation ###

In order to use utiq in your prebid setup, you must first integrate utiq solution on your website as per https://docs.utiq.com/
If you are interested in using Utiq on your website, please contact Utiq on https://utiq.com/contact/

### Prebid integration ### 

First, make sure to add the utiq MTP submodule to your Prebid.js package with:

```
gulp build --modules=userId,adfBidAdapter,ixBidAdapter,prebidServerBidAdapter,utiqMtpIdSystem
```

## Parameter Descriptions

| Params under userSync.userIds[] | Type             | Description                                                                                                  | Example                          |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| name                            | String           | The name of the module                                                                                       | `"utiqMtpId"`                         |
