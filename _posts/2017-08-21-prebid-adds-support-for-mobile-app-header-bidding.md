---
layout: post
title: Prebid Adds Support for Mobile App Header Bidding
head_title: Prebid Adds Support for Mobile App Header Bidding
description: The addition of Prebid Mobile libraries for iOS and Android marks another milestone for Prebid, representing its first formal steps towards providing an end-to-end open-source header bidding solution for mobile app publishers.
permalink: /blog/prebid-adds-support-for-mobile-app-header-bidding
---

Last week, the [prebid-mobile-android](https://github.com/prebid/prebid-mobile-android) and [prebid-mobile-ios](https://github.com/prebid/prebid-mobile-ios) repositories were open-sourced under the Prebid GitHub project. The addition of these libraries marks another milestone for Prebid, representing its first formal steps towards providing an end-to-end open-source header bidding solution for mobile app publishers.

{: .pb-img.pb-md-img :}
![Prebid Mobile - Banner and Interstitial Ads running on iOS]({{site.baseurl}}/assets/images/blog/prebid-mobile-ios-banner-and-interstitial.png)

## Why Should I Be Interested in Prebid Mobile?

This year, mobile programmatic spend in the US is expected to exceed $21 billion, representing 78% of all mobile display spend1. Prebid Mobile helps app publishers unlock a greater portion of this mobile app growth by solving for many of the problems endemic to today's mobile programmatic ecosystem, and by applying the advantages of "traditional" web header bidding to mobile app environments.

Major benefits include:

- **Increased Transparency**: Prebid Mobile brings transparency and fair, real-time competition to the mobile app monetization black box. Today, most mobile publishers route impressions to mediation partners without knowing how much each impression is actually worth. By enabling real-time impression-level competition among all configured demand partners, Prebid Mobile allows publishers to more efficiently monetize their most valuable impressions.

- **Better User Experience**: Prebid Mobile offers significant improvements to the end-user experience by reducing latency and resource contention on the user's mobile device. By establishing a single server-side point of integration for programmatic demand partners, Prebid Mobile eliminates the need to set up sequential mediation waterfalls. And, by continuously pre-caching creatives in the background, Prebid Mobile can deliver ads with near-zero delay without interrupting the app's workflow.

- **Streamlined Integration for App Developers**: Prebid Mobile is designed to be as streamlined as possible for mobile app developers. Once integrated, Prebid Mobile ad unit configurations are maintained and managed server-side. This means that publishers can subsequently add or remove demand partners, change demand partner parameters, or alter global settings without making any updates to native app code.

## How Prebid Mobile Works

{: .pb-img.pb-lg-img :}
![How Prebid Mobile Works]({{site.baseurl}}/assets/images/blog/prebid-mobile-how-it-works.png)

### Initial Setup

Mobile developers register each ad unit with the Prebid Mobile framework (ideally early in the application lifecycle). In doing so, each Prebid Mobile ad unit is associated with the ad object in your primary ad server SDK, and with a unique configuration ID pointing to a set of Prebid demand partners maintained server-side.

In parallel, the publisher ad ops team will configure Prebid Mobile line items and creatives in the primary ad server targeted to Prebid key/values. This ad ops setup is nearly identical to Prebid.js for web and should be familiar for publishers that have integrated.

{: .pb-img.pb-lg-img :}
![Prebid Server Config Page]({{site.baseurl}}/assets/images/blog/prebid-server-config-page.png)

### In the App

As the Prebid Mobile module runs, it sends bid requests to Prebid Server via a single integration point. Prebid Server looks up the settings associated with the ad unit's configuration ID, and makes server-side OpenRTB requests to each appropriate demand partner. Prebid Server caches the creative content associated with each demand partner bid response, and sends lightweight bid-level metadata (including bid price) back to the client device as key/value pairs.

The client-side Prebid Mobile module communicates this key/value targeting to the primary ad server SDK. If the primary ad server selects a Prebid Mobile line item based on this targeting, the Prebid Mobile JavaScript creative is served into the ad server's ad view. Once delivered, this placeholder JavaScript fetches the actual cached creative content from Prebid Server, and the winning demand partner counts the transacted impression.

## Getting Started

Once you've reviewed the [Prebid Mobile Documentation]({{site.baseurl}}/prebid-mobile) on Prebid.org, the most important first step is to register for a Prebid Server account through the [Prebid Server Homepage](https://prebid.adnxs.com/). Upon registration, you will be assigned a Prebid Server account ID, and can begin setting up demand partner configurations that will be associated with Prebid Mobile ad units.

From there, you can download the Prebid Mobile [Android](https://github.com/prebid/prebid-mobile-android) and/or [iOS](https://github.com/prebid/prebid-mobile-android) SDKs from GitHub, and can begin working with your ad ops team to configure Prebid Mobile line items and creatives in your primary adserver.

## What's Next for Prebid Mobile

Moving forward, we will focus on adding additional support in two key areas:

- **Ad types**: The initial Prebid Mobile rollout includes support for banner and interstitial ads running through the DFP and MoPub ad server SDKs. We are working to add support for additional ad types in each of these ad server SDKs, including interstitial video, rewarded video and native ads.

- **Demand partners**: In parallel, we are working to increase the available set of Prebid Mobile demand partners, focusing initially on mobile-first SSPs as well as the set of demand partners already integrated with Prebid Server for display.

## How to Contribute

Prebid is an open-source project, and we very much encourage community participation in driving its design and development. The [prebid-mobile-android](https://github.com/prebid/prebid-mobile-android) and [prebid-mobile-ios](https://github.com/prebid/prebid-mobile-ios) repositories are now available on GitHub, along with the source code for [Prebid Server](https://github.com/prebid/prebid-server).

We love pull requests, and will be looking to collaborate with the community as we look to broaden Prebid Mobile support across ad servers, mobile ad types, and demand partners.

by [Matt Jacobson](https://www.linkedin.com/in/matthew-jacobson-5a947940/), Product Manager at AppNexus
