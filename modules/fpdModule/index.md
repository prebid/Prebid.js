# Overview

```
Module Name: First Party Data Module
```

# Description

Module to perform the following functions to allow for consistent set of first party data using the following submodules.

Enrichment Submodule:
- populate available data into object: referer, meta-keywords, cur

Validation Submodule:
- verify OpenRTB datatypes, remove/warn any that are likely to choke downstream readers
- verify that certain OpenRTB attributes are not specified
- optionally suppress user FPD based on the existence of _pubcid_optout


1. Module initializes on first load and set bidRequestHook 
2. When hook runs, corresponding submodule init functions are run to perform enrichments/validations dependant on submodule
3. After hook complete, it is disabled - meaning module only runs on first auction
4. To reinitiate the module, run pbjs.refreshFPD(), which allows module to rerun as if initial load


This module will automatically run first party data enrichments and validations dependant on which submodules are included. There is no configuration required. In order to load the module and submodule(s) and opt out of either enrichements or validations, use the below opt out configuration

# Module Control Configuration

```

pbjs.setConfig({
    firstPartyData: {
        skipValidations: true, // default to false
        skipEnrichments: true // default to false
    }
});

```

# Requirements

At least one of the submodules must be included in order to successfully run the corresponding above operations.

enrichmentFpdModule
validationFpdModule