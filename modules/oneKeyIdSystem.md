# OneKey

The OneKey real-time data module in Prebid has been built so that publishers
can quickly and easily setup the OneKey Addressability Framework.
This module is used along with the oneKeyRtdProvider to pass OneKey data to your partners.
Both modules are required. This module will pass oneKeyData to your partners
while the oneKeyRtdProvider will pass the transmission requests.

Background information:
- [OneKey-Network/addressability-framework](https://github.com/OneKey-Network/addressability-framework)
- [OneKey-Network/OneKey-implementation](https://github.com/OneKey-Network/OneKey-implementation)

It can be added to you Prebid.js package with:

{: .alert.alert-info :}
gulp build –modules=userId,oneKeyIdSystem

⚠️ This module works in association with a RTD module. See [oneKeyRtdProvider](oneKeyRtdProvider.md).

#### OneKey Registration

OneKey is a community based Framework with a decentralized approach.
Go to [onekey.community](https://onekey.community/) for more details.

#### OneKey Configuration

{: .table .table-bordered .table-striped }
| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module | `"oneKeyData"` |


#### OneKey Exemple

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'oneKeyData'
        }]
    }
});
```

Bidders will receive the data in the following format:

```json
{
    "identifiers": [{
        "version": "0.1",
        "type": "paf_browser_id",
        "value": "da135b3a-7d04-44bf-a0af-c4709f10420b",
        "source": {
            "domain": "crto-poc-1.onekey.network",
            "timestamp": 1648836556881,
            "signature": "+NF27bBvPM54z103YPExXuS834+ggAQe6JV0jPeGo764vRYiiBl5OmEXlnB7UZgxNe3KBU7rN2jk0SkI4uL0bg=="
        }
    }],
    "preferences": {
        "version": "0.1",
        "data": {
            "use_browsing_for_personalization": true
        },
        "source": {
            "domain": "cmp.pafdemopublisher.com",
            "timestamp": 1648836566468,
            "signature": "ipbYhU8IbSFm2tCqAVYI2d5w4DnGF7Xa2AaiZScx2nmBPLfMmIT/FkBYGitR8Mi791DHtcy5MXr4+bs1aeZFqw=="
        }
    }
}
```

If the bidder elects to use pbjs.getUserIdsAsEids() then the format will be:

```json
"user": {
    "ext": {
        "eids": [{
            "source": "paf",
            "uids": [{
                "id": "da135b3a-7d04-44bf-a0af-c4709f10420b",
                "atype": 1,
                "ext": {
                    "version": "0.1",
                    "type": "paf_browser_id",
                    "source": {
                        "domain": "crto-poc-1.onekey.network",
                        "timestamp": 1648836556881,
                        "signature": "+NF27bBvPM54z103YPExXuS834+ggAQe6JV0jPeGo764vRYiiBl5OmEXlnB7UZgxNe3KBU7rN2jk0SkI4uL0bg=="
                    }
                }
            }],
            "ext": {
                "preferences": {
                    "version": "0.1",
                    "data": {
                        "use_browsing_for_personalization": true
                    },
                    "source": {
                        "domain": "cmp.pafdemopublisher.com",
                        "timestamp": 1648836566468,
                        "signature": "ipbYhU8IbSFm2tCqAVYI2d5w4DnGF7Xa2AaiZScx2nmBPLfMmIT/FkBYGitR8Mi791DHtcy5MXr4+bs1aeZFqw=="
                    }
                }
            }
        }]
    }
}
```