# Overview

```
Module Name: Data Controller Module
```

# Description

This module will filter EIDs and SDA based on the configurations.

Sub module object with the following keys:

|  param name | type  | Scope | Description | Params |
| :------------ | :------------ | :------ | :------ | :------ |
|  filterEIDwhenSDA  | function | optional | Filters user EIDs based on SDA | bidrequest |
|  filterSDAwhenEID  | function | optional | Filters SDA based on configured EIDs | bidrequest  |

# Module Control Configuration

```

pbjs.setConfig({
    dataController: {
       filterEIDwhenSDA: ['*']
       filterSDAwhenEID: ['id5-sync.com'] 
    }
});

```
