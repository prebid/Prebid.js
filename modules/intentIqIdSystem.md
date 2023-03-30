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

| Param under userSync.userIds[] | Scope    | Type   | Description                                                                                                                                                                                                  | Example         |
| ------------------------------ | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| name                           | Required | String | The name of this module: "intentIqId"                                                                                                                                                                        | `"intentIqId"`  |
| params                         | Required | Object | Details for IntentIqId initialization.                                                                                                                                                                       |                 |
| params.partner                 | Required | Number | This is the partner ID value obtained from registering with IntentIQ.                                                                                                                                        | `1177538`       |
| params.percentage              | Required | Number | This a percentage value for our A/B testing group distribution. The values supposed to be in range of 0 to 100. We suggest to set it to 95 percent for optimal balance ofbetween prefromance and preceision. | `95`            |
| params.pcid                    | Optional | String | This is the partner cookie ID, it is a dynamic value attached to the request.                                                                                                                                | `"g3hC52b"`     |
| params.pai                     | Optional | String | This is the partner customer ID / advertiser ID, it is a dynamic value attached to the request.                                                                                                              | `"advertiser1"` |

### Configuration example

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [
      {
        name: "intentIqId",
        params: {
          partner: 123456, // valid partner id
          percentage: 95,
        },
        storage: {
          type: "html5",
          name: "intentIqId", // set localstorage with this name
          expires: 60,
          refreshInSeconds: 4 * 3600, // refresh ID every 4 hours to ensure it's fresh
        },
      },
    ],
    syncDelay: 3000,
  },
});
```

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: "intentIqId",
            params: {
                partner: 123456     // valid partner id
                pcid: PCID_VARIABLE,   // string value, dynamically loaded into a variable before setting the configuration
                pai: PAI_VARIABLE ,  // string value, dynamically loaded into a variable before setting the configuration
                percentage: 95
            },
            storage: {
                type: "html5",
                name: "intentIqId",    // set localstorage with this name
                expires: 60
            }
        }],
        syncDelay: 3000
    }
});
```

