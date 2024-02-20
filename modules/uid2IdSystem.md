## UID2 User ID Submodule

The UID2 module handles storing, providing, and optionally refreshing tokens. While initial tokens traditionally required server-side generation, the introduction of the *Client-Side Token Generation (CSTG)* mode offers publishers the flexibility to generate UID2 tokens directly from the module, eliminating this need. Publishers can choose to operate the module in one of three distinct modes: *Client Refresh* mode, *Server Only* mode and *Client-Side Token Generation* mode.

*Server Only* mode was originally referred to as *legacy mode*, but it is a popular mode for new integrations where publishers prefer to handle token refresh server-side.

*Client-Side Token Generation* mode is included in UID2 module by default. However, it's important to note that this mode is created and made available recently. For publishers who do not intend to use it, you have the option to instruct the build to exclude the code related to this feature:

```
    $ gulp build --modules=uid2IdSystem --disable UID2_CSTG
```
If you do plan to use Client-Side Token Generation (CSTG) mode, please consult the UID2 Team first as they will provide required configuration values for you to use (see the Client-Side Token Generation (CSTG) mode section below for details)

**Important information:** UID2 is not designed to be used where GDPR applies. The module checks the passed-in consent data and will not operate if the `gdprApplies` flag is true.

## Client-Side Token Generation (CSTG) mode

**This mode is created and made available recently. Please consult UID2 Team first as they will provide required configuration values for you to use.**

For publishers seeking a purely client-side integration without the complexities of server-side involvement, the CSTG mode is highly recommended. This mode requires the provision of a public key, subscription ID and [directly identifying information (DII)](https://unifiedid.com/docs/ref-info/glossary-uid#gl-dii) - either emails or phone numbers. In the CSTG mode, the module takes on the responsibility of encrypting the DII, generating the UID2 token, and handling token refreshes when necessary.

To configure the module to use this mode, you must:
1. Set `parmas.serverPublicKey`  and `params.subscriptionId` (please reach out to the UID2 team to obtain these values)
2. Provide **ONLY ONE DII** by setting **ONLY ONE** of `params.email`/`params.phone`/`params.emailHash`/`params.phoneHash`

Below is a table that provides guidance on when to use each directly identifying information (DII) parameter, along with information on whether normalization and hashing are required by the publisher for each parameter.

| DII param        | When to use it                                        | Normalization required by publisher? | Hashing required by publisher? |
|------------------|-------------------------------------------------------|--------------------------------------|--------------------------------|
| params.email     | When you have users' email address                    | No                                   | No                             |
| params.phone     | When you have user's phone number                     | Yes                                  | No                             |
| params.emailHash | When you have user's hashed, normalized email address | Yes                                  | Yes                            |
| params.phoneHash | When you have user's hashed, normalized phone number  | Yes                                  | Yes                            |


*Note that setting params.email will normalize email addresses, but params.phone requires phone numbers to be normalized.*

Refer to [Normalization and Encoding](#normalization-and-encoding) for details on email address normalization, SHA-256 hashing and Base64 encoding.

### CSTG example

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2',
            params: {
               serverPublicKey: '...server public key...',
               subscriptionId: '...subcription id...',
               email: 'user@email.com',
               //phone: '+0000000',
               //emailHash: '...email hash...',
               //phoneHash: '...phone hash ...'
            }
        }]
    }
});
```

## Client Refresh mode

This is the recommended mode for most scenarios. In this mode, the full response body from the UID2 Token Generate or Token Refresh endpoint must be provided to the module. As long as the refresh token remains valid, the module will refresh the advertising token as needed.

To configure the module to use this mode, you must **either**:
1. Set `params.uid2Cookie` to the name of the cookie which contains the response body as a JSON string, **or**
2. Set `params.uid2Token` to the response body as a JavaScript object.

The `uid2Cookie` param was originally `uid2ServerCookie`. The old name can still be used, however the inclusion of the word 'server' was causing some confusion. If both values are provided, `uid2ServerCookie` will be ignored.

### Client refresh cookie example

In this example, the cookie is called `uid2_pub_cookie`.

Cookie:
```
uid2_pub_cookie={"advertising_token":"...advertising token...","refresh_token":"...refresh token...","identity_expires":1684741472161,"refresh_from":1684741425653,"refresh_expires":1684784643668,"refresh_response_key":"...response key..."}
```

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2',
            params: {
                uid2Cookie: 'uid2_pub_cookie'
            }
        }]
    }
});
```

### Client refresh uid2Token example

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2',
            params: {
                uid2Token: {
                    'advertising_token': '...advertising token...',
                    'refresh_token': '...refresh token...',
                    // etc. - see the Sample Token below for contents of this object
                }
            }
        }]
    }
});
```

## Server-Only Mode

In this mode, only the advertising token is provided to the module. The module will not be able to refresh the token. The publisher is responsible for implementing some other way to refresh the token.

To configure the module to use this mode, you must **either**:
1. Set a cookie named `__uid2_advertising_token` to the advertising token, **or**
2. Set `value` to an ID block containing the advertising token (see "Server only value" example below).

### Server only cookie example

Cookie:
```
__uid2_advertising_token=...advertising token...
```

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2'
        }]
    }
});
```

### Server only value example

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2'
            value: {
                'uid2': {
                    'id': '...advertising token...'
                }
            }
        }]
    }
});
```

## Storage

The module stores a number of internal values. By default, all values are stored in HTML5 local storage. You can switch to cookie storage by setting `params.storage` to `cookie`. The cookie size can be significant and this is not recommended, but is provided as an option if local storage is not an option.

## Sample token

`{`<br />&nbsp;&nbsp;`"advertising_token": "...",`<br />&nbsp;&nbsp;`"refresh_token": "...",`<br />&nbsp;&nbsp;`"identity_expires": 1633643601000,`<br />&nbsp;&nbsp;`"refresh_from": 1633643001000,`<br />&nbsp;&nbsp;`"refresh_expires": 1636322000000,`<br />&nbsp;&nbsp;`"refresh_response_key": "wR5t6HKMfJ2r4J7fEGX9Gw=="`<br />`}`

### Notes

If you are trying to limit the size of cookies, provide the token in configuration and use the default option of local storage.

If you provide an expired identity and the module has a valid identity which was refreshed from the identity you provide, it will use the refreshed identity. The module stores the original token used for refreshing the token, and it will use the refreshed tokens as long as the original token matches the one supplied.

If a new token is supplied which does not match the original token used to generate any refreshed tokens, all stored tokens will be discarded and the new token used instead (refreshed if necessary).

You can set `params.uid2ApiBase` to `"https://operator-integ.uidapi.com"` during integration testing. Be aware that you must use the same environment (production or integration) here as you use for generating tokens.

## Parameter Descriptions for the `usersync` Configuration Section

The below parameters apply only to the UID2 User ID Module integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID2 module - `"uid2"` | `"uid2"` |
| value | Optional, Server only | Object | An object containing the value for the advertising token. | See the example above. |
| params.uid2Token | Optional, Client refresh | Object | The initial UID2 token. This should be `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint. | See the sample token above. |
| params.uid2Cookie | Optional, Client refresh | String | The name of a cookie which holds the initial UID2 token, set by the server. The cookie should contain JSON in the same format as the uid2Token param. **If uid2Token is supplied, this param is ignored.** | See the sample token above. |
| params.uid2ApiBase | Optional, Client refresh | String | Overrides the default UID2 API endpoint. | `"https://prod.uidapi.com"` _(default)_|
| params.storage | Optional, Client refresh | String | Specify whether to use `cookie` or `localStorage` for module-internal storage. It is recommended to not provide this and allow the module to use the default. | `localStorage` _(default)_ |
| params.serverPublicKey | Optional, Client-side token generation | String | 	A public key for encrypting the DII payload for the Operator's CSTG endpoint. **This is required for client-side token generation.**  | - |
| params.subscriptionId | Optional, Client-side token generation | String | A publisher Identifier. **This is required for client-side token generation.** | - |
| params.email | Optional, Client-side token generation | String | The user's email address. Provide this parameter if using email as the DII. | `"test@example.com"` |
| params.emailHash | Optional, Client-side token generation | String | A hashed, normalized representation of the user's email. Provide this parameter if using emailHash as the DII. | `"tMmiiTI7IaAcPpQPFQ65uMVCWH8av9jw4cwf/F5HVRQ="` |
| params.phone | Optional, Client-side token generation | String | The user's phone number. Provide this parameter if using phone as the DII. | `"+15555555555"` |
| params.phoneHash | Optional, Client-side token generation | String | A hashed, normalized representation of the user's phone number. Provide this parameter if using phoneHash as the DII. | `"tMmiiTI7IaAcPpQPFQ65uMVCWH8av9jw4cwf/F5HVRQ="` |

# Normalization and Encoding

This section provides information about normalizing and encoding [directly Identifying information (DII)](https://unifiedid.com/docs/ref-info/glossary-uid#gl-dii). It's important that, in working with UID2, normalizing and encoding are performed correctly.

## Introduction
When you're taking user information such as an email address, and following the steps to create a raw UID2 and/or a UID2 advertising token, it's very important that you follow all the required steps. Whether you normalize the information or not, whether you hash it or not, follow the steps exactly. By doing so, you can ensure that the UID2 value you create can be securely and anonymously matched up with other instances of online behavior by the same user.

>Note: Raw UID2s, and their associated UID2 tokens, are case sensitive. When working with UID2, it's important to pass all IDs and tokens without changing the case. Mismatched IDs can cause ID parsing or token decryption errors.

## Types of Directly Identifying Information
UID2 supports the following types of directly identifying information (DII):
- Email address
- Phone number

## Email Address Normalization

If you send unhashed email addresses to the UID2 Operator Service, the service normalizes the email addresses and then hashes them. If you want to hash the email addresses yourself before sending them, you must normalize them before you hash them.

> IMPORTANT: Normalizing before hashing ensures that the generated UID2 value will always be the same, so that the data can be matched. If you do not normalize before hashing, this might result in a different UID2, reducing the effectiveness of targeted advertising.

To normalize an email address, complete the following steps:

1. Remove leading and trailing spaces.
2. Convert all ASCII characters to lowercase.
3. In `gmail.com` email addresses, remove the following characters from the username part of the email address:
    1. The period  (`.` (ASCII code 46)).<br/>For example, normalize `jane.doe@gmail.com` to `janedoe@gmail.com`.
    2. The plus sign (`+` (ASCII code 43)) and all subsequent characters.<br/>For example, normalize `janedoe+home@gmail.com` to `janedoe@gmail.com`.

## Email Address Hash Encoding

An email hash is a Base64-encoded SHA-256 hash of a normalized email address. The email address is first normalized, then hashed using the SHA-256 hashing algorithm, and then the resulting bytes of the hash value are encoded using Base64 encoding. Note that the bytes of the hash value are encoded, not the hex-encoded string representation.

| Type | Example | Comments and Usage |
| :--- | :--- | :--- |
| Normalized email address | `user@example.com` | Normalization is always the first step. |
| SHA-256 hash of normalized email address | `b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514` | This 64-character string is a hex-encoded representation of the 32-byte SHA-256.|
| Hex to Base64 SHA-256 encoding of normalized email address | `tMmiiTI7IaAcPpQPFQ65uMVCWH8av9jw4cwf/F5HVRQ=` | This 44-character string is a Base64-encoded representation of the 32-byte SHA-256.<br/>WARNING: The SHA-256 hash string in the example above is a hex-encoded representation of the hash value. You must Base64-encode the raw bytes of the hash or use a Base64 encoder that takes a hex-encoded value as input.<br/>Use this encoding for `email_hash` values sent in the request body. |

>WARNING: When applying Base64 encoding, be sure to Base64-encode the raw bytes of the hash or use a Base64 encoder that takes a hex-encoded value as input.

## Phone Number Normalization

If you send unhashed phone numbers to the UID2 Operator Service, the service normalizes the phone numbers and then hashes them. If you want to hash the phone numbers yourself before sending them, you must normalize them before you hash them.

> IMPORTANT: Normalization before hashing ensures that the generated UID2 value will always be the same, so that the data can be matched. If you do not normalize before hashing, this might result in a different UID2, reducing the effectiveness of targeted advertising.

Here's what you need to know about phone number normalization rules:

- The UID2 Operator accepts phone numbers in the [E.164](https://en.wikipedia.org/wiki/E.164) format, which is the international phone number format that ensures global uniqueness. 
- E.164 phone numbers can have a maximum of 15 digits.
- Normalized E.164 phone numbers use the following syntax, with no spaces, hyphens, parentheses, or other special characters:<br/>
  `[+] [country code] [subscriber number including area code]`
 Examples:
   - US: `1 (123) 456-7890` is normalized to `+11234567890`.
   - Singapore: `65 1243 5678` is normalized to `+6512345678`.
   - Sydney, Australia: `(02) 1234 5678` is normalized to drop the leading zero for the city plus include the country code: `+61212345678`.

## Phone Number Hash Encoding

A phone number hash is a Base64-encoded SHA-256 hash of a normalized phone number. The phone number is first normalized, then hashed using the SHA-256 hashing algorithm, and the resulting hex value is encoded using Base64 encoding.

The example below shows a simple input phone number, and the result as each step is applied to arrive at a secure, opaque, URL-safe value.

| Type | Example | Comments and Usage |
| :--- | :--- | :--- |
| Normalized phone number | `+12345678901` | Normalization is always the first step. |
| SHA-256 hash of normalized phone number | `10e6f0b47054a83359477dcb35231db6de5c69fb1816e1a6b98e192de9e5b9ee` |This 64-character string is a hex-encoded representation of the 32-byte SHA-256. |
| Hex to Base64 SHA-256 encoding of normalized and hashed phone number | `EObwtHBUqDNZR33LNSMdtt5cafsYFuGmuY4ZLenlue4=` | This 44-character string is a Base64-encoded representation of the 32-byte SHA-256.<br/>NOTE: The SHA-256 hash is a hexadecimal value. You must use a Base64 encoder that takes a hex value as input. Use this encoding for `phone_hash` values sent in the request body. |

>WARNING: When applying Base64 encoding, be sure to use a function that takes a hex value as input. If you use a function that takes text as input, the result is a longer string which is invalid for the purposes of UID2.
