## Neustar Fabrick User ID Submodule

Fabrick ID Module - https://www.home.neustar/fabrick
Product and Sales Inquiries: 1-855-898-0036

## Example configuration for publishers:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'fabrickId',
            storage: {
                name: 'pbjs_fabrickId',
                type: 'cookie',
                expires: 7
            },
            params: {
                apiKey: 'your apiKey', // provided to you by Neustar
                e: '31c5543c1734d25c7206f5fd591525d0295bec6fe84ff82f946a34fe970a1e66' // example hash identifier (sha256)
            }
        }]
    }
});
```

## Parameters

Every param except `url`, `refererInfo` and names starting with `max` is appended to the request query string as-is (not URL-encoded). A param whose value is an array is sent once per string or number element (for example `e=a&e=b`).

| Param under `userSync.userIds[]` | Scope | Type | Description |
| --- | --- | --- | --- |
| name | Required | String | `"fabrickId"` |
| params.apiKey | Required | String | API key provided by Neustar. No ID is requested without it. |
| params.e | Optional | String or String[] | Hashed email address. |
| params.p | Optional | String or String[] | Hashed phone number. |
| params.i4 | Optional | String or String[] | IPv4 address. |
| params.i6 | Optional | String or String[] | IPv6 address. |
| params.m | Optional | String or String[] | Mobile advertising ID (IDFA/AAID). |
| params.ia | Optional | String or String[] | Identifier for advertising (IFA). |
| params.iv | Optional | String or String[] | Identifier for vendors (IFV). |
| params['1pd'] | Optional | String or String[] | Partner or advertiser first-party user ID other than a first-party cookie ID. Up to 255 characters. |
| params['1pc'] | Optional | String or String[] | Partner or advertiser first-party cookie ID. Up to 255 characters. |
| params.u | Optional | String or String[] | URL-encoded page URL. |
| params.f | Optional | String or String[] | URL-encoded referrer URL. |
| params.ifa_type | Optional | String or String[] | Source of the IFA, per the IAB IFA guidelines. |
| params.lmt | Optional | `0`, `1`, `'0'`, `'1'` or Boolean | Limit ad tracking. `1` means the user opted out of ad tracking and measurement; do not send the real IFA in `ia` then. `true`/`false` are sent as `1`/`0`; earlier Prebid.js versions dropped booleans. |
| params.iab1 ... params.iab4 | Optional | String or String[] | URL-encoded IAB Tech Lab Content Taxonomy v3.0 tier 1-4 category. |
| params.url | Optional | String | Base request URL. Params are appended directly, so include the trailing `?`. Default `https://fid.agkn.com/f?`. |
| params.refererInfo | Optional | Object | Replaces Prebid's detected referer info. The module reads `topmostLocation`, `stack[0]` and `canonicalUrl`. |
| params.maxUrlLen | Optional | Number | Maximum request URL length when appending referrers. Default `2000`. |
| params.maxRefLen | Optional | Number | Maximum length of each appended `&r=` referrer parameter. Default `1000`. |
| params.maxSpaceAvailable | Optional | Number | A referrer is appended only while the URL is shorter than `maxUrlLen - maxSpaceAvailable`. Default `50`. |

The module appends up to four referrers as URL-encoded `r` params: `topmostLocation`, `stack[0]`, `canonicalUrl` and `window.location.href`, keeping only the longest URL for each path without query string. Each is truncated to fit `maxRefLen` and the remaining space under `maxUrlLen`.
