# Overview

Module Name: Adquery Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adquery.com

# Description

Module that connects to Adquery's demand sources.

# User IDs

userId: all

- `bidQid` (adQuery's own user id) is taken only from the `adquery.io` EID (`adqueryIdSystem`).
  EIDs from other sources are never used as `bidQid`; without an `adquery.io` uid it is empty
  and the adQuery bidder assigns its own id.
- The EIDs the bidder receives are forwarded with their original `source` and their ORTB fields
  (`uids[].id`, `atype`, `ext`, `inserter`, `matcher`, `mm`): in the `eids` field of banner requests
  and in `user.ext.eids` of video requests. Before sending, EIDs without a `source` and uids without
  a non-empty string id are dropped, other fields are left out (as Prebid Server does), identical
  duplicates are removed, and at most 50 uids are sent in total; when nothing is left, the field is
  omitted. The order is deterministic and does not depend on user ID module order: `adquery.io`
  first, then by `source` and uids; the cap is applied after sorting, so it never drops the
  `adquery.io` uid. The Prebid Server adQuery adapter applies the same rules.
- Publishers can limit which user ids are sent to adQuery with the `bidders` option of each
  `userSync.userIds[]` entry. When the `tcfControl` module is included, EIDs are also withheld
  if adQuery (GVL ID 902) lacks consent for the `transmitEids` activity.

# Test Parameters
```
    var adUnits = [
        {
            code: 'banner-adquery-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: 'adquery',
                    params: {
                        placementId: '6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897',
                        type: 'banner300x250'
                    }
                }
            ]
        }
    ];
```
