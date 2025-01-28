```
Module Name: IntentIQ Id System
Module Type: Id System
Maintainer: julian@intentiq.com, dmytro.piskun@intentiq.com
usp_supported: true
gpp_sids: usnat
```

# Intent IQ Universal ID module

By leveraging the Intent IQ identity graph, our module helps publishers, SSPs, and DSPs overcome the challenges of monetizing cookie-less inventory and preparing for a future without 3rd-party cookies. Our solution implements 1st-party data clustering and provides Intent IQ person IDs with over 90% coverage and unmatched accuracy in supported countries while remaining privacy-friendly and CCPA compliant. This results in increased CPMs, higher fill rates, and, ultimately, lifting overall revenue

# All you need is a few basic steps to start using our solution.

## Registration

Navigate to [our portal ](https://www.intentiq.com/) and contact our team for partner ID.
check our [documentation](https://pbmodule.documents.intentiq.com/) to get more information about our solution and how utilze it's full potential

## Integration

```
gulp build –modules=intentIqIdSystem
```

We recommend including the Intent IQ Analytics adapter module for improved visibility

## Configuration

### Parameters

Please find below list of paramters that could be used in configuring Intent IQ Universal ID module

| Param under userSync.userIds[] | Scope    | Type     | Description                                                                                                                         | Example                                         |
| ------------------------------ | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| name                           | Required | String   | The name of this module: "intentIqId"                                                                                               | `"intentIqId"`                                  |
| params                         | Required | Object   | Details for IntentIqId initialization.                                                                                              |                                                 |
| params.partner                 | Required | Number   | This is the partner ID value obtained from registering with IntentIQ.                                                               | `1177538`                                       |
| params.pcid                    | Optional | String   | This is the partner cookie ID, it is a dynamic value attached to the request.                                                       | `"g3hC52b"`                                     |
| params.pai                     | Optional | String   | This is the partner customer ID / advertiser ID, it is a dynamic value attached to the request.                                     | `"advertiser1"`                                 |
| params.callback                | Required | Function | This is a callback which is trigered with data and AB group                                                                         | `(data, group) => console.log({ data, group })` |
| params.timeoutInMillis         | Optional | Number   | This is the timeout in milliseconds, which defines the maximum duration before the callback is triggered. The default value is 500. | `450`                                           |
| params.browserBlackList        | Optional |  String  | This is the name of a browser that can be added to a blacklist.                                                                     | `"chrome"`                                      |

### Configuration example

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: "intentIqId",
            params: {
                partner: 123456,     // valid partner id
                timeoutInMillis: 500,
                browserBlackList: "chrome",
                callback: (data, group) => window.pbjs.requestBids()
            },
            storage: {
                type: "html5",
                name: "intentIqId",    // set localstorage with this name
                expires: 0,
                refreshInSeconds: 0
            }
        }]
    }
});
```
