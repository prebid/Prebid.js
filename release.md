## New Features
- **New adapters**: 
-- AdSpiritAdapter: main adapter
-- ConnectAdAdapter: child adapter with predefined host parameter
-- XapadsMediaAdapter: child adapter with predefined host parameter

### New Adapters
#### AdSpiritAdapter adapter
```JavaScript
{
    bidder: 'adspirit',
    params: {
        placementId: XXX,
        host: URL    // advertiser specific adserver url
    }
}
```

#### ConnectAdAdapter adapter
```JavaScript
{
    bidder: 'connectad',
    params: {
        placementId: XXX
    }
}
```

#### XapadsMediaAdapter adapter
```JavaScript
{
    bidder: 'xapadsmedia',
    params: {
        placementId: XXX
    }
}
```