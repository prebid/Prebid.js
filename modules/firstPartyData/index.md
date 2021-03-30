# Overview

```
Module Name: First Party Data Module
```

# Description

Module to perform the following functions to allow for consistent set of first party data

- verify OpenRTB datatypes, remove/warn any that are likely to choke downstream readers
- verify that certain OpenRTB attributes are not specified: just imp for now
- optionally suppress user FPD based on a TBD opt-out signal (_pubcid_optout)
- populate available data into object: referer, meta-keywords, cur

This module will automatically run both first party data enrichments and validations. There is no configuration required. In order to load the module and opt out of either enrichements or validations, use the below opt out configuration

# Opt Out Configuration

```

pbjs.setConfig({
    firstPartyData: {
        skipValidations: true, // default to false
        skipEnrichments: true // default to false
    }
});

```
