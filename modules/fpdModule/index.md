# Overview

```
Module Name: First Party Data Module
```

# Description

Runs the first party data submodules that are included in the build on the `ortb2Fragments` of every auction, before the auction starts.

Submodules:

- `validationFpdModule`: verifies OpenRTB data types, removing or warning about values likely to break downstream readers; removes OpenRTB attributes that should not be set as first party data; optionally suppresses user FPD when the `_pubcid_optout` opt-out is set.
- `topicsFpdModule`: adds first and third party Topics data to `user.data`.

Enrichment (referer, page keywords, user agent client hints, and so on) is not a submodule: Prebid core performs it on every auction, with or without this module. It is configured with `firstPartyData.uaHints` and `firstPartyData.keywords`; see [First Party Data](https://docs.prebid.org/features/firstPartyData.html).

# Configuration

No configuration is required. To keep the validation submodule in the build but turn its validations off:

```javascript
pbjs.setConfig({
    firstPartyData: {
        skipValidations: true // default false
    }
});
```

# Requirements

Include at least one submodule (`validationFpdModule`, `topicsFpdModule`); on its own this module does nothing.
