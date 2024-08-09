### Tapad ID

Tapad's ID module provides access to a universal identifier that publishers, ad tech platforms and advertisers can use for data collection and collation without reliance on third-party cookies.
Tapad's ID module is free to use and promotes collaboration across the industry by facilitating interoperability between DSPs, SSPs and publishers.

To register as an authorized user of the Tapad ID module, or for more information, documentation and access to Tapad’s Terms and Conditions please contact  [prebid@tapad.com](mailto:prebid@tapad.com).

Tapad’s Privacy landing page containing links to region-specific Privacy Notices may be found here: [https://tapad.com/privacy.html](https://tapad.com/privacy.html).

Add it to your Prebid.js package with:


`gulp build --modules=userId,tapadIdSystem`

#### Tapad ID Configuration

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | `"tapadId"` | `"tapadId"` |
| params | Required | Object | Details for Tapad initialization. | |
| params.company_id | Required | Number | Tapad Company Id provided by Tapad | 1234567890 |

#### Tapad ID Example

```js
pbjs.setConfig({
    userSync: {
        userIds: [
            {
                name: "tapadId",
                params: {
                    companyId: 1234567890
                },
                storage: {
                    type: "cookie",
                    name: "tapad_id",
                    expires: 1
                }
            }
        ]
    }
});
```
