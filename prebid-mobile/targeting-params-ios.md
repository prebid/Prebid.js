---
layout: page
title: Targeting Parameters
description: Add Targeting Parameters
pid: 1
top_nav_section: prebid-mobile
nav_section: prebid-mobile-ios
---


<div class="bs-docs-section" markdown="1">

# Targeting Parameters

## User location

By default, the iOS Prebid Mobile SDK does not automatically send location information. In order for Prebid Mobile to use location information for targeting, the app developer must explicitly pass the location information to Prebid Mobile.

Note: Developers should ensure adequate consent is obtained before sharing location information. Developers can control whether location is collected and sent by Prebid Mobile.

In this snippet, we implement the `CLLocationManagerDelegate` delegate. Create a location manager object as shown here:

```
@property (nonatomic, readwrite) CLLocationManager *locationManager;
```

Initialize the location manager:

```
- (void)setupPrebidLocationManager {
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
    self.locationManager.distanceFilter = kCLDistanceFilterNone;
    self.locationManager.desiredAccuracy = kCLLocationAccuracyKilometer;

    // Check for iOS 8. Without this guard the code will crash with "unknown selector" on iOS 7.

    if ([self.locationManager respondsToSelector:@selector(requestWhenInUseAuthorization)]) {
        [self.locationManager requestWhenInUseAuthorization];
    }
    [self.locationManager startUpdatingLocation];
}
```

Implement the location delegate as:
```
// Location Manager Delegate Methods
- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray *)locations {
    [[PBTargetingParams sharedInstance] setLocation:[locations lastObject]];
}
```

## Age and Gender
{:.no_toc}

Age and gender can be added to the targeting params directly.

```
[[PBTargetingParams sharedInstance] setAge:25];
[[PBTargetingParams sharedInstance] setGender:PBTargetingParamsGenderFemale];
```


## Pass Custom Keywords
{:.no_toc}

Custom keywords are used to attach arbitrary key/value pairs to the ad call. Use key/value pairs to add users to segments, as shown here:

```
[[PBTargetingParams sharedInstance] setUserKeywords:@"foo" withValue:@"bar"];
[[PBTargetingParams sharedInstance] setUserKeywords:@"foo" withValue:@"baz"];
[[PBTargetingParams sharedInstance] setUserKeywords:@"foo" withValue:@"bay"];
[[PBTargetingParams sharedInstance] setUserKeywords:@"foo" withValue:@"bee"];
```
If a value is set for an existing keyword, the value for the key is replaced with the new value. In the preceding example, the key `foo` will have a value of `bee`, the most recent value associated with that key.

You can set a key to have an array of values with the following API:
```
[[PBTargetingParams sharedInstance] setUserKeywords:@"boo" withValues:@[@"bar",@"baz",@"bay",@"bee"]];
```

The preceding commands will result in the following request JSON body construct:

```
user = {
keywords = "foo=bar,foo=baz,foo=bay,foo=bee";
};
```

## GDPR Consent

Prebid Mobile supports the [IAB GDPR recommendations](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/Mobile%20In-App%20Consent%20APIs%20v1.0%20Draft%20for%20Public%20Comment.md). For a general overview of Prebid Mobile support for GDPR, see [Prebid Mobile Guide to European Ad Inventory and Providing Notice, Transparency and Choice]({{site.github.url}}/prebid-mobile/gdpr.html)

Enable (true) or disable (false) the ability to provide consent.
```
[[PBTargetingParams sharedInstance] setSubjectToGDPR:YES];
```
Enable publishers to set the consent string.

```
[[PBTargetingParams sharedInstance] setGdprConsentString:@"sample_consent_string"];
```

Prebid mobile also checks if the values are present in the [NSUserDefaults](https://developer.apple.com/documentation/foundation/nsuserdefaults#1664798?language=objc) keys specified by the IAB. If the values are also set in these objects they will be passed in the OpenRTB request object.


</div>
