# Overview

Module Name: anonymisedIdSystem
Module Type: UserID Module
Maintainer: support@anonymised.io

# Description

Anonymised is a data anonymization technology for privacy-preserving advertising.

The Anonymised User ID submodule exposes the CUID - the identifier that the
[Anonymised Marketing Tag](https://support.anonymised.io/integrate/marketing-tag?t=LPukVCXzSIcRoal5jggyeg)
assigns when a user signs in - to bid adapters as an OpenRTB Extended ID under the source
`anonymised.io`.

The submodule performs no network calls. It reads the identifier that the Marketing Tag has already
stored on the publisher's own domain, in `localStorage` under the key `anon-cuid`, and passes it to
the bid stream. When the Marketing Tag is not installed, or the user is not signed in, no ID is read
and no EID is added.

### Prerequisite

The Anonymised Marketing Tag must be installed on the page. This submodule does not load it. The tag
can be installed [natively](https://support.anonymised.io/integrate/install-the-anonymised-tag-natively?t=LPukVCXzSIcRoal5jggyeg)
or through the [`anonymisedRtdProvider`](anonymisedRtdProvider.md) module's `tagConfig` parameter.

# Building Prebid with Anonymised ID support

```bash
gulp build --modules=userId,anonymisedIdSystem
```

# Configuration

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'anonymisedId'
        }]
    }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `'anonymisedId'` |

The submodule takes no `params`.

### Do not configure `storage`

This submodule manages the identifier itself and must be configured **without** a `storage` object.

The Marketing Tag is the single source of truth for the CUID: it writes the identifier on sign-in and
removes it on sign-out and on consent withdrawal. If Prebid.js were allowed to keep its own copy, that
copy would outlive the removal and the submodule would keep sending a stale identifier to bidders
until Prebid's own expiry elapsed. Reading the value fresh on every initialization makes removal take
effect immediately.

If a `storage` object is configured, the submodule logs a warning and provides **no** ID at all,
rather than one Prebid.js may cache beyond the Marketing Tag's removal of it.

### Do not set `userSync.ppid` to `anonymised.io`

The Marketing Tag sets the Google Ad Manager Publisher Provided ID itself, as part of its SignalLift
feature. Pointing `userSync.ppid` at `anonymised.io` makes Prebid.js set the PPID as well, which
produces two problems:

- Prebid.js strips non-alphanumeric characters from an ID before setting it as the PPID, while the
  Marketing Tag sends the identifier unmodified. The same user would be represented by two different
  PPIDs depending on which code path ran, splitting Google Ad Manager audiences and reporting.
- The Marketing Tag applies its own logic when deciding whether a PPID should be set at all. Prebid.js
  is not aware of that logic and would bypass it.

The division is: the Marketing Tag owns the identifier sent to **Google Ad Manager**; this submodule
owns the identifier sent to **bidders**.

### Single-page applications

`getId` is called when the User ID module initializes and is not re-run for subsequent auctions. If a
user signs in after that point, call `pbjs.refreshUserIds({ submoduleNames: ['anonymisedId'] })` to
pick up the new identifier. Always pass `submoduleNames` - an unscoped refresh re-initializes every
configured ID submodule, including those that make network requests.

### Subdomains

The identifier is read from `localStorage`, which is scoped to a single origin. A publisher serving
the same user from more than one subdomain will have an identifier available on each subdomain only
after the Marketing Tag has run there.

### Data deletion

Deletion requests are handled by the Marketing Tag, which owns the user's session and every
identifier derived from it. This submodule stores nothing of its own and therefore implements no
`onDataDeletionRequest` callback.

### Vendor and storage disclosure

The submodule declares GVL ID `1116`. Its first-party storage use is disclosed at
[https://cdn1.anonymised.io/deviceStorage.json](https://cdn1.anonymised.io/deviceStorage.json).

For any questions or assistance with integrating Prebid, `anonymisedIdSystem`, or the Anonymised
Marketing Tag, please contact an [Anonymised representative](mailto:support@anonymised.io).
