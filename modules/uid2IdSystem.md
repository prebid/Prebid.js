# UID2 User ID Submodule

## Overview

UID2 provides a Prebid.js module that supports the following:

- [Generating the UID2 token](https://unifiedid.com/docs/guides/integration-prebid#generating-the-uid2-token)
- [Refreshing the UID2 token](https://unifiedid.com/docs/guides/integration-prebid#refreshing-the-uid2-token)
- [Storing the UID2 token in the browser](https://unifiedid.com/docs/guides/integration-prebid#storing-the-uid2-token-in-the-browser)
- [Passing the UID2 token to the bid stream](https://unifiedid.com/docs/guides/integration-prebid#passing-the-uid2-token-to-the-bid-stream)

For details, see [UID2 Integration Overview for Prebid.js](https://unifiedid.com/docs/guides/integration-prebid).

**Important information:** UID2 is not designed to be used where GDPR applies. The module checks the passed-in consent data and does not operate if the `gdprApplies` flag is true.

Depending on access to [directly identifying information](https://unifiedid.com/docs/ref-info/glossary-uid#d) (DII), there are two methods to generate UID2 tokens for use with Prebid.js, as shown in the following table.

Determine which method is best for you, and then follow the applicable integration guide.

| Scenario | Integration Guide |
| :--- | :--- |
| You have access to DII on the client side and want to do front-end development only. | [UID2 Client-Side Integration Guide for Prebid.js](https://unifiedid.com/docs/guides/integration-prebid-client-side). |
| You have access to DII on the server side and can do server-side development. | [UID2 Server-Side Integration Guide for Prebid.js](https://unifiedid.com/docs/guides/integration-prebid-server-side). |

## Storage

The module stores a number of internal values. By default, all values are stored in HTML5 local storage. You can switch to cookie storage by setting `params.storage` to `cookie`. The cookie size can be significant and this is not recommended, but is provided as an option if local storage is not an option.

## Parameter Descriptions for the `usersync` Configuration Section

The following parameters apply only to the UID2 User ID Module integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID2 module. Must be `"uid2"`. | `"uid2"` |
| params.uid2ApiBase | Optional | String | Overrides the default UID2 API endpoint. | `"https://prod.uidapi.com"` _(default)_|
| params.storage | Optional | String | Specify whether to use `cookie` or `localStorage` for module-internal storage. It is recommended to not provide this and allow the module to use the default. | `"localStorage"` _(default)_ |

### Client-Side Integration

The following parameters apply to the UID2 User ID Module if you are following the [client-side integration guide](https://unifiedid.com/docs/guides/integration-prebid-client-side). Exactly one of `params.email`, `params.emailHash`, `params.phone`, and `params.phoneHash` must be provided. For information on how to normalize and hash these parameters, refer to [Normalization and Encoding](https://unifiedid.com/docs/getting-started/gs-normalization-encoding).

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| params.serverPublicKey | Required for client-side integration | String | See [Subscription ID and Public Key](https://unifiedid.com/docs/getting-started/gs-credentials#subscription-id-and-public-key). | - |
| params.subscriptionId | Required for client-side integration | String | See [Subscription ID and Public Key](https://unifiedid.com/docs/getting-started/gs-credentials#subscription-id-and-public-key). | - |
| params.email | Optional | String | The user's email address. Provide this parameter if using email as the DII. | `"test@example.com"` |
| params.emailHash | Optional | String | A [hashed, normalized](https://unifiedid.com/docs/getting-started/gs-normalization-encoding) representation of the user's email. Provide this parameter if using emailHash as the DII. | `"tMmiiTI7IaAcPpQPFQ65uMVCWH8av9jw4cwf/F5HVRQ="` |
| params.phone | Optional | String | A [normalized](https://unifiedid.com/docs/getting-started/gs-normalization-encoding) representation of the user's phone number. Provide this parameter if using phone as the DII. | `"+15555555555"` |
| params.phoneHash | Optional | String | A [hashed, normalized](https://unifiedid.com/docs/getting-started/gs-normalization-encoding) representation of the user's phone number. Provide this parameter if using phoneHash as the DII. | `"tMmiiTI7IaAcPpQPFQ65uMVCWH8av9jw4cwf/F5HVRQ="` |

### Server-Side Integration

#### Server-Only Mode

The following parameters apply to the UID2 User ID Module if you are following the [server-side integration guide](https://unifiedid.com/docs/guides/integration-prebid-server-side) with [server-only mode](https://unifiedid.com/docs/guides/integration-prebid-server-side#server-only-mode).

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| value | Required for server-only mode | Object | An object containing the value for the advertising token. | <pre>{<br>  uid2: {<br>    id: '...advertising token...'<br>  }<br>}</pre> |

#### Client Refresh Mode

The following parameters apply to the UID2 User ID Module if you are following the [server-side integration guide](https://unifiedid.com/docs/guides/integration-prebid-server-side) with [client refresh mode](https://unifiedid.com/docs/guides/integration-prebid-server-side#client-refresh-mode). Either `params.uid2Token` or `params.uid2Cookie` must be provided.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| params.uid2Token | Optional | Object | The initial UID2 token. This should be the `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint. | See [Sample Token](#sample-token). |
| params.uid2Cookie | Optional | String | The name of a cookie that holds the initial UID2 token, set by the server. The cookie should contain JSON in the same format as the uid2Token param. **If uid2Token is supplied, this param is ignored.** | `"uid2_pub_cookie"` |

## Sample Token

```
{
  "advertising_token": "...",
  "refresh_token": "...",
  "identity_expires": 1633643601000,
  "refresh_from": 1633643001000,
  "refresh_expires": 1636322000000,
  "refresh_response_key": "wR5t6HKMfJ2r4J7fEGX9Gw=="
}
```

## Normalization and Encoding

It's important that, in working with UID2, normalizing and encoding are performed correctly. By doing so, you can ensure that the UID2 value you create can be securely and anonymously matched up with other instances of online behavior by the same user.

For more information, refer to [Normalization and Encoding](https://unifiedid.com/docs/getting-started/gs-normalization-encoding).

## Notes

- If you provide an expired identity, and the module has a valid update from refreshing the same identity, the module uses the refreshed identity in place of the expired one you provided.

- If you provide a new token that doesn't match the original token used to generate any refreshed tokens, the module discards all stored tokens and uses the new token instead, and keeps it refreshed.

- During integration testing, set `params.uid2ApiBase` to `"https://operator-integ.uidapi.com"`. You must set this value to the same environment (production or integration) that you use for generating tokens.

- If you are building Prebid.js and following the server-side integration guide, you can create a smaller Prebid.js build by disabling client-side integration functionality. To do this, pass the `--disable UID2_CSTG` flag:

```
    $ gulp build --modules=uid2IdSystem --disable UID2_CSTG
```