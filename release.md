## New Features
- **New adapters**: 
  - AdSpiritAdapter: bid adapter for AdSpirit
  - adapter alias 'connectad' with predefined host parameter
  - adapter alias 'xapadsmedia' with predefined host parameter

### New Adapters
#### AdSpiritAdapter main adapter
```JavaScript
{
    bidder: 'adspirit',
    params: {
        placementId: XXX,
        host: URL    // advertiser specific adserver url
    }
}
```

#### connectad alias
```JavaScript
{
    bidder: 'connectad',
    params: {
        placementId: XXX
    }
}
```

#### xapadsmedia alias
```JavaScript
{
    bidder: 'xapadsmedia',
    params: {
        placementId: XXX
    }
}
```