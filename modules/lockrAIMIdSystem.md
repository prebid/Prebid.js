# lockr AIM

AIM is a unified container for identity and data management. The self-service platform allows you to seamlessly test and integrate alternative identity providers.

With AIM, publishers seamlessly integrate and activate alternative IDs like LiveRamp’s Authenticated Traffic Solution (ATS), Unified ID 2.0 (UID2), ID5 and more. The burden of due diligence and maintenance, coupled with the benefits of server-side calls result in the adoption of multiple alternative IDs, clean rooms like InfoSum and CDPs based on their or advertisers’ specific needs.

## lockr AIM registration

Sign Up for an Identity lockr account: Begin by creating an <a href = "https://sso.loc.kr/console/signup" target = "_blank">Identity lockr account.</a>

Setup your App: Inside Identity lockr, create an app and activate the AIM library.

Compile Prebid: Compile Prebid with the below configurations, and integrate the same.

## lockr AIM Configuration

First, make sure to add the lockr AIM submodule to your Prebid.js package with:

```
gulp build --modules=lockrAIMIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
    userSync: {
       userIds: [{
          name: 'lockrAIMId',
          params: {
             email: '<example_email>',
             appID: '<app_id>'
          }
       }]
    }
});
```

| Param | Scope | Type | Description                                                                                                                                                                                                                                                                    | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module: `"lockrAIMId"`                                                                                                                                                                                                                                             | `"lockrAIMId"` |
| params | Required | Object | Details for the configuration.                                                                                                                                                                                                                                                        | |
| params.email | Required | String | This is the email that needs to be passed to get the identity tokens for.                                                                                                                                                                                                             | `test@example.com` |
| params.aooID | Required | String | This is the app ID acquired from the identity lockr from the generated app                                                                                                                                                                                                            | `test@example.com` |


## lockr AIM Example

```javascript
pbjs.setConfig({
    userSync: {
       userIds: [{
          name: 'lockrAIMId',
          params: {
             email: 'test@example.com',
             appID: 'e84afc5f-4adf-4144-949f-1de5bd151fcc'
          }
       }]
    }
});
```

*Note*: The lockr AIM will store the tokens in the respective cookies and local storage as per the different identity providers, and the configurations done by the publisher on the identity lockr.