# Overview
```
Module Name: AdvRed Analytics Adapter
Module Type: Analytics Adapter
Maintainer: support@adv.red
```

### Usage

The AdvRed analytics adapter can be used by all clients after approval. For more information,
please visit <https://ams.adv.red/>

### Analytics Options
| Param enableAnalytics | Scope    | Type   | Description                                          | Example                                |
|-----------------------|----------|--------|------------------------------------------------------|----------------------------------------|
| provider              | Required | String | The name of this Adapter.                            | `'advRed'`                             |
| params                | Required | Object | Details of module params.                            |                                        |
| params.publisherId    | Required | String | This is the Publisher ID value obtained from AdvRed. | `'123456'`                             |
| params.url            | Optional | String | Custom URL of the endpoint to collect the events     | `'https://pub1.api.adv.red/api/event'` |

### Example Configuration

```javascript
pbjs.enableAnalytics({
    provider: 'advRed',
    options: {
        publisherId: '123456'    // change to the Publisher ID you received from AdvRed
    }
});
```
