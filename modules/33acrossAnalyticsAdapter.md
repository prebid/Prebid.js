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
        /** The partner id assigned to you by the 33Across Team */
        pid: 12345,
        /** Given by the 33Across Team */
        endpoint: 'https://localhost:9999/event',
        /** [optional] timeout in milliseconds after which an auction report will sent regardless of auction state */
        timeout: 3000 
    }
});
```
