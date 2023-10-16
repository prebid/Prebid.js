# Google Analytics Adapter

The google analytics adapter pushes prebid events into google analytics.

## Usage

The simplest way to enable the analytics adapter is this

```javascript
pbjs.enableAnalytics([{
  provider: 'ga'
}]);
```

Defaults will be used and you should see events being pushed to analytics.

You can customize the adapter with various `options` like this

```javascript
pbjs.enableAnalytics([{
  provider: 'ga',
  options: { ... }
}]);

Here is a full list of settings available

- `global` (string) - name of the global analytics object. Default is `ga`
- `trackerName` (string) - use another tracker for prebid events. Default is the default tracker
- `sampling` (number) - choose a value from `0` to `1`, where `0` means 0% and `1` means 100% tracked
- `enableDistribution` (boolean) - enables additional events that track load time and cpm distribution
  by creating buckets for load time and cpm
- `cpmDistribution` (cpm: number => string) - customize the cpm buckets for the cpm distribution
- `sendFloors` (boolean) - if set, will include floor data in the eventCategory field and include ad unit code in eventAction field


## Additional resources

- [Prebid GA Analytics](http://prebid.org/overview/ga-analytics.html)
