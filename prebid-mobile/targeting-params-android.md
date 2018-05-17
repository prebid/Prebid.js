---
layout: page
title: Targeting Parameters
description: Add Targeting Parameters
pid: 1
top_nav_section: prebid-mobile
nav_section: prebid-mobile-android
---


<div class="bs-docs-section" markdown="1">

# Targeting Parameters

## User location

By default, the Android Prebid Mobile SDK automatically sends location information.

Disable (false) or enable (true) location data:

```
TargetingParams.setLocationEnabled(true);
```

Fetch location data and pass it to Prebid Mobile:

```
TargetingParams.setLocation(location);
```

Choose the precision of location data:

```
TargetingParams.setLocationDecimalDigits(6);
```

## Age and Gender

Age and gender can be added to the targeting params directly.

```
TargetingParams.setYearOfBirth(1990);
TargetingParams.setGender(GENDER.FEMALE);
```


## Custom Keywords

Custom keywords are used to attach arbitrary key/value pairs to the ad call. Use key/value pairs to add users to segments, as shown here:

```
TargetingParams.setUserTargeting("foo", "bar");
TargetingParams.setUserTargeting("foo", "bay");
```
This will result in the following request JSON body construct:

```
"user" : {
	"keywords" : "foo=bar,foo=bay,"
}
```

## GDPR Consent

Prebid Mobile supports the [IAB GDPR recommendations](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/Mobile%20In-App%20Consent%20APIs%20v1.0%20Draft%20for%20Public%20Comment.md). For a general overview of Prebid Mobile support for GDPR, see [Prebid Mobile Guide to European Ad Inventory and Providing Notice, Transparency and Choice]({{site.github.url}}/prebid-mobile/gdpr.html)

Enable (true) or disable (false) the ability to provide consent.
```
TargetingParams.setSubjectToGDPR(context, true);
```
Enable publishers to set the consent string.

```
TargetingParams.setGDPRConsentString(context, "consent_string");
```

Prebid mobile also checks if the values are present in the [SharedPreferences](https://developer.android.com/training/data-storage/shared-preferences) keys specified by the IAB. If the values are also set in these objects they will be passed in the OpenRTB request object.

## Other

For more information about the TargetingParams, please check the source code in [Coding Integration for Android]({{site.github.url}}/prebid-mobile/code-integration-android).


</div>
