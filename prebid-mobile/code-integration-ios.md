---
layout: page
title: Code Integration
description: Code Integration
pid: 1
top_nav_section: prebid-mobile
nav_section: prebid-mobile-ios
---


<div class="bs-docs-section" markdown="1">

# Code Integration for iOS

Get started with Prebid Mobile by creating a [Prebid Server account]({{site.github.url}}/prebid-mobile/prebid-mobile-pbs.html).

### Use Cocoapods?

Easily include the Prebid Mobile SDK for your primary ad server in your Podfile.

```
platform :ios, '8.0'

target 'MyAmazingApp' do 
    pod 'PrebidMobile'
end
```

### Build framework from source

Build Prebid Mobile from source code. After cloning the repo, from the root directory run

```
./scripts/buildPrebidMobile.sh
```

to output the PrebidMobile.framework.


## Ad Unit Setup for iOS
{:.no_toc}

Register Prebid Mobile ad units as early as possible in the application's lifecycle. Each ad unit has an `adUnitId` which is an arbitrary unique identifier of the developer's choice. 

We recommend doing this in the `didFinishLaunchingWithOptions` method in `AppDelegate.m` using the following steps as shown in the code sample below:

1. Create the ad units with ad unit ids and add sizes for banner ad units
2. Add a server side configuration for each ad unit to Prebid Server Adapter
3. Set targeting parameters for the ad units (Optional)
4. Register the ad units with the adapter to start bid fetching process

Embed the ad unit registration in a try-catch block to catch all the exceptions (if any) thrown by the SDK.

```objc
#import "PrebidMobile/PBBannerAdUnit.h"
#import "PrebidMobile/PBServerAdapter.h"
#import "PrebidMobile/PBTargetingParams.h"
#import "PrebidMobile/PrebidMobile.h"
 
[PBLogManager setPBLogLevel:PBLogLevelAll];
  
// 1. Create the ad units with ad unit ids and add sizes for banner ad units
PBBannerAdUnit *__nullable adUnit1 = [[PBBannerAdUnit alloc] initWithAdUnitIdentifier:@"YOUR-AD-UNIT-ID-HERE" andConfigId:@"YOUR-CONFIG-ID-HERE"];
[adUnit1 addSize:CGSizeMake(300, 250)];
  
// 2. Set targeting parameters for the ad units (Optional)
[[PBTargetingParams sharedInstance] setAge:25];
[[PBTargetingParams sharedInstance] setGender:PBTargetingParamsGenderFemale];
  
// 3. Register the ad units with Prebid Mobile to start bid fetching process
[PrebidMobile registerAdUnits:@[adUnit1] withAccountId:@"YOUR-ACCOUNT-ID-HERE"];
```

## Set bid keywords on ad object
{:.no_toc}

Prebid Mobile continuously pre-caches creatives in the background, so that right before the ad unit makes an ad request from your network, your app can ask Prebid Mobile for a bid price and creative without waiting as shown in the code below.


```objc
#import <PrebidMobile/PrebidMobile.h>
  
// Set the prebid keywords on your adObject, upon completion load the adObject's ad
[PrebidMobile setBidKeywordsOnAdObject:YOUR-AD-VIEW withAdUnitId:@"YOUR-AD-UNIT-ID-HERE" withTimeout:600 completionHandler:^{
    [YOUR-AD-VIEW YOUR-ADS-LOAD-METHOD];
}];
```

Prebid Mobile will immediately tell your app whether it has a bid or not without waiting. If it does have a bid, the code below will attach the bids to the ad request by applying keyword targeting. Use the table below to see which ad objects are supported currently.

{: .table .table-bordered .table-striped }
| Primary Ad Server | Ad Object Type | Ad Object                    | Load Method                                 |
|-------------------|----------------|------------------------------|---------------------------------------------|
| DFP               | Banner         | `DFPBannerView`              | `- (void)loadRequest:(GADRequest *)request` |
| DFP               | Interstitial   | `DFPInterstitial`            | `- (void)loadRequest:(GADRequest *)request` |
| MoPub             | Banner         | `MPAdView`                   | `- (void)loadAd`                            |
| MoPub             | Interstitial   | `MPInterstitialAdController` |` - (void)loadAd`                            |




</div>