# Overview

```
Module Name: Data Controller Module
```

# Description

This module will filter EIDs and SDA based on the configurations.
The filtered EIDs are stored in 'dcUsersAsEids' configuration and filtered SDA are updated in bidder configuration.

Sub module object with the following keys:

|  param name | type  | Scope | Description | Params |
| :------------ | :------------ | :------ | :------ | :------ |
|  filterEIDwhenSDA  | function | optional | Filters user EIDs based on SDA | bidrequest |
|  filterSADwhenEID  | function | optional | Filters SDA based on configured EIDs | bidrequest  |

# Module Control Configuration

```

pbjs.setConfig({
    dataController: {
       filterEIDwhenSDA: ['*']
       filterSADwhenEID: ['id5-sync.com'] 
    }
});

```
