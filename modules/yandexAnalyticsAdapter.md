# Overview
```
Module Name:  Yandex Analytics Adapter
Module Type:  Analytics Adapter
Maintainer: prebid@yandex-team.com
```

# Description
Analytics adapter for Yandex Metrika.


## Metrika Analytics Configuration
If you already have yandex metrika counter (tag_prebid.js) installed on your page you may init analytics provider by passing array of their ids to analytics provider options like this.
```javascript
pbjs.enableAnalytics({
    provider: 'yandexAnalytics',
    options: {
        counters: [
            123,
        ],
    },
});
```

If you don't have yandex metrika counter installed you can use this code instead.
You can configure your counter by setting fields of the counterOptions as they are explained [here](https://yandex.com/support/metrica/code/counter-spa-setup.html).
```javascript
pbjs.enableAnalytics({
    provider: 'yandexAnalytics',
    options: {
        counters: [{
            id: 1234,
        }],
    }
});
```

## Metrika Analytics Registration