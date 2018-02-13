# Overview

Module Name: keen.io Analytics Adapter
Module Type: Analytics Adapter
Maintainer: misterlexa123@gmail.com

# Description

Analytics adapter for http://keen.io. Contact misterlexa123@gmail.com for information.
Don't forget to run
```
npm install keen-tracking --save

```

# Usage

```
pbjs.enableAnalytics([
    {
        provider: 'keenio',
        options: {
            projectId: 'your project id',
            writeKey: 'your key'
        }
    }
]);
```
