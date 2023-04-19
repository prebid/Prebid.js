# 33Across Analytics Adapter

```txt
Module Name:  33Across Analytics Adapter
Module Type:  Analytics Adapter
```

## How to configure?

```js
pbjs.enableAnalytics({
    provider: '33across',
    options: {
        /**
         * The partner id assigned by the 33Across Team
         */
        pid: 12345,
        /** 
         * Defaults to 33Across endpoint if not provided 
         * [optional]
         */
        endpoint: 'https://localhost:9999/event',
        /** 
         * Timeout in milliseconds after which an auction report 
         * will be sent regardless of auction state
         * [optional]
         */
        timeout: 3000
    }
});
```
