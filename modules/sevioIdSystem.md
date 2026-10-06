# Overview

Module Name: Sevio User ID Submodule
Module Type: UserID Module
Maintainer: technical@sevio.com

# Description

The Sevio User ID submodule provides the Sevio ID, an opaque identifier issued by Sevio's Identity
service, to bid adapters through `bidRequest.userId.sevioId` and as an OpenRTB Extended ID under the
source `adx.ws`.

The ID is fetched from Sevio's Identity service (`https://id.adx.ws/identity/resolve`) and then
kept in first-party storage by Prebid's `userId` module. The submodule never reads or writes storage
itself. A request is made only when no valid ID is stored, when `storage.refreshInSeconds` elapses, or
when the consent state changes. A refresh presents the stored ID to the Identity service, which
answers with a freshly sealed ID for the same user, so the stored value changes on every refresh.

# Building Prebid with Sevio ID support

```bash
gulp build --modules=userId,sevioIdSystem
```

For EU traffic, also include the TCF modules:

```bash
gulp build --modules=userId,sevioIdSystem,consentManagementTcf,tcfControl
```

# Configuration

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'sevioId',
            params: {
                clientId: 'your-sevio-client-id'
            },
            storage: {
                type: 'cookie&html5',
                name: '_sevioId',
                expires: 30,
                refreshInSeconds: 86400
            }
        }]
    }
});
```

| Param under `userSync.userIds[]` | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| `name` | Required | String | The name of this module. Must be exactly `sevioId`. | `'sevioId'` |
| `params` | Required | Object | Module parameters. | |
| `params.clientId` | Required | String | The client ID Sevio assigned to the integration. Without it the module logs an error and provides no ID. | `'your-sevio-client-id'` |
| `params.emailHash` | Optional | String | SHA-256 hash of the user's email address, as 64 hex characters. Sent to the Identity service with the next request, so that the user is recognised across sites. A value of any other shape logs a warning and is not sent. | `'a1b2c3…'` |
| `storage` | Required | Object | Prebid-managed storage for the ID. Without it the module logs an error and provides no ID. | |
| `storage.type` | Required | String | Must be `cookie&html5`. Other values log a warning; the module still works, but without the cookie-first, `localStorage`-fallback behaviour described below. | `'cookie&html5'` |
| `storage.name` | Required | String | Name of the cookie and `localStorage` key. `_sevioId` is recommended, because it is the name Sevio's storage disclosure lists. | `'_sevioId'` |
| `storage.expires` | Required | Number | Days the stored ID is kept. Without it the cookie is session-only and the `localStorage` copy is ignored, so the ID is fetched again on every visit. | `30` |
| `storage.refreshInSeconds` | Recommended | Number | Seconds after which the stored ID is presented to the Identity service again and both stores are rewritten with the answer. Without it the ID is refreshed only when it expires or consent changes. | `86400` |
| `bidders` | Optional | Array of strings | Restricts which bidders receive the ID. | `['sevio']` |

## Email hash

The hash is sent only when a request is made (see the Description), not on every page view. When the
hash becomes known after an ID is already stored, for example after the user logs in, update the
config and call `pbjs.refreshUserIds({ submoduleNames: ['sevioId'] })` to send it right away. The
Identity service matches hashes exactly, so normalise the address the same way on every site (for
example trimmed and lowercased) before hashing it. The hash is never stored by the submodule.

# Storage

With `storage.type: 'cookie&html5'`, Prebid writes the ID to both a first-party cookie and
`localStorage`, and reads the cookie first, with `localStorage` as the fallback.

If the cookie is lost (for example to a browser's cap on cookies set by script) while `localStorage`
still holds the ID, Prebid uses the `localStorage` copy and makes no request. The cookie is not
restored until the next fetch rewrites both stores: when `storage.refreshInSeconds` elapses, when the
stored ID expires, or when the consent state changes.

Keys Prebid writes, with `storage.name: '_sevioId'`:

| Storage | Keys |
| --- | --- |
| Cookie (host-only, `SameSite=Lax`) | `_sevioId`, `_sevioId_cst`, `_sevioId_last` |
| `localStorage` | `_sevioId`, `_sevioId_exp`, `_sevioId_cst`, `_sevioId_last` |

The `_last` keys are written only when `storage.refreshInSeconds` is set.

Without a `storage` object the module is inactive: it logs an error, makes no request and provides no
ID.

# Consent

- The submodule declares GVL ID `1393`. When `tcfControl` is enabled, Prebid's TCF enforcement
  requires Purpose 1 consent and vendor consent for GVL ID `1393` before the ID can be stored or read.
- The request is a `POST` to `https://id.adx.ws/identity/resolve` with a JSON body, sent with
  credentials. The body carries `params.clientId` as `client_id`, the stored ID and
  `params.emailHash` when present, and the consent signals present on the page in a `privacy` object: `gdpr`, `gdpr_consent`,
  `us_privacy`, `gpp` and `gpp_sid`.
- The Identity service provides no ID when the privacy signals refuse it, and also when the page
  carries no consent signal at all. Include the consent management modules that apply to your
  traffic.
- No ID is provided under COPPA. When COPPA applies, the module makes no request, and an ID that is
  already stored is not passed to bidders either.
- **`userSync.enforceStorageType` caveat:** Prebid currently compares each storage write's single
  type with the whole configured `storage.type` string. With `cookie&html5` and
  `userSync.enforceStorageType: true`, every write is blocked and the ID is never stored. Without
  `enforceStorageType`, every write logs a warning but the ID is stored normally. Leave
  `enforceStorageType` unset with this module until that is fixed in Prebid core.

# EID output

```javascript
{
    source: 'adx.ws',
    uids: [{
        id: 'some-random-id-value',
        atype: 1
    }]
}
```
