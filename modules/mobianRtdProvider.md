# Mobian Rtd Provider

## Overview

Module Name: Mobian Rtd Provider

Module Type: Rtd Provider

Maintainer: support@themobian.com

The Mobian Real-Time Data (RTD) Module is a plug-and-play Prebid.js adapter that is designed to provide Mobian Contextual results on the publisher’s page.

## Downloading and Configuring the Mobian RTD module

Navigate to https://docs.prebid.org/download.html and check the box labeled Mobian Prebid Contextual Evaluation. If you have installed Prebid.js on your site previously, please be sure to select any other modules and adaptors to suit your needs. When clicking the "Get Prebid.js" button at the bottom of the page, the site will build a version of Prebid.js with all of your selections.

Direct link to the Mobian module in the Prebid.js repository: https://github.com/prebid/Prebid.js/blob/master/modules/mobianRtdProvider.js

The client will need to provide Mobian with all the domains that would be using the prebid module so that Mobian can whitelist those domains. Failure to whitelist the domains will yield a 404 when making a request to the Mobian Contextual API at https://prebid.outcomes.net/.

## Configuration Highlight

Below is Mobian's suggested default for configuration:

```js
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'mobianBrandSafety',
      params: {
        // Prefix for the targeting keys (default: 'mobian')
        prefix: 'mobian',

        // Enable targeting keys for advertiser data
        advertiserTargeting: true,
        // Or set it as an array to pick specific targeting keys:
        // advertiserTargeting: ['genres', 'emotions', 'themes'],
        // Available values: 'apValues', 'categories', 'emotions', 'genres', 'risk', 'sentiment', 'themes', 'tones'

        // Enable targeting keys for publisher data
        publisherTargeting: true,
        // Or set it as an array to pick specific targeting keys:
        // publisherTargeting: ['tones', 'risk'],
        // Available values: 'apValues', 'categories', 'emotions', 'genres', 'risk', 'sentiment', 'themes', 'tones'
      }
    }]
  }
});
```

## Functionality

At a high level, the Mobian RTD Module is designed to call the Mobian Contextal API on page load, requesting the Mobian classifications and results for the URL. The classifications and results are designed to be picked up by any SSP or DSP in the Prebid.js ecosystem. The module also supports placing the Mobian classifications on each ad slot on the page, thus allowing for targeting within GAM.

## Available Classifications

NOTE: The examples below for targetable keys for GAM or otherwise in the ortb2 object assume that your prefix is the default of "mobian". The prefix in the targetable key will change based on your settings.

Risk:

Prebid.outcomes.net endpoint key: mobianRisk

Targetable Key: mobian_risk

Possible values: "low", "medium" or "high"

Description: This category assesses whether content contains any potential risks or concerns to advertisers and returns a determination of Low Risk, Medium Risk, or High Risk based on the inclusion of sensitive or high-risk topics. Content that might be categorized as unsafe may include violence, hate speech, misinformation, or sensitive topics that most advertisers would like to avoid. Content that is explicit or overly graphic in nature will be more likely to fall into the High Risk tier compared to content that describes similar subjects in a more informative or educational manner.

------------------

Content Categories:

Prebid.outcomes.net endpoint key: mobianContentCategories

Targetable Key: mobian_categories

Possible values: "adult", "arms", "crime", "death_injury", "debated_issue", "piracy", "hate_speech", "obscenity", "drugs", "spam", "terrorism" 

Description: Brand Safety Categories contain categorical results for brand safety when relevant (e.g. Low Risk Adult Content). Note there can be Medium and High Risk content that is not associated to a specific brand safety category.

------------------

Sentiment:

Prebid.outcomes.net endpoint key: mobianSentiment

Targetable Key: mobian_sentiment

Possible values: "negative", "neutral" or "positive"

Description: This category analyzes the overall positivity, negativity, or neutrality of a piece of content. This is a broad categorization of the content’s tone; every piece of content receives one of three possible sentiment ratings: Positive, Negative, or Neutral.

------------------

Emotion:

Prebid.outcomes.net endpoint key: mobianEmotions

Targetable Key: mobian_emotions

Possible values: Various but some examples include "love", "joy", "surprise", "anger", "sadness", "fear"

Description: This category represents the specific feelings expressed or evoked through the content. Emotions are the reactions tied to the content’s presentation. Multiple emotions may be evoked by a single piece of content as this category reflects the way humans engage with the content.

------------------

Tone:

Prebid.outcomes.net endpoint key: mobianTones

Targetable Key: mobian_tones

Possible values: Various, but some examples include "comedic", "serious" or "emotional"

Description: This category represents the content’s stylistic attitude or perspective that is being conveyed. If the Genre classification above represents the more objective structure, the Tone classification represents the subjective form. This categorization influences the way audiences may receive the piece of content and how they could be impacted by it.

------------------

Theme:

Prebid.outcomes.net endpoint key: mobianThemes

Targetable Key: mobian_themes

Possible values: Various, but some examples include "skincare", "food" and "nightlife"

Description: This category includes broad conceptual ideas or underlying topics that form the foundation of the content. Themes represent the central message or idea conveyed throughout, rather than the specific details of the subject. Themes are intended to be broad and high-level, describing the overall purpose and intent of the content, and can connect multiple pieces of content, even if they are not from the same property.

------------------

Genre:

Prebid.outcomes.net endpoint key: mobianGenres

Targetable Key: mobian_genres

Possible values: Various, but some examples include "journalism", "gaming" or "how-to"

Description: This category represents the type or style of the content, focusing on the purpose, format, or presentation of the content. Genres group pieces of content into recognizable categories based on style and provide a framework for understanding the structure of the content.

------------------

AP Values

Prebid.outcomes.net endpoint key: ap (an array, containing values of a0, a1, p0, p1)

Targetable Keys: mobian_ap_a0, mobian_ap_a1, mobian_ap_p0, mobian_ap_p1

Possible values: Various, numerically id-based and customizable based on Mobian Context Settings.

Description: Mobian AI Personas are custom created based on prompts to find a specific audience. Please contact your Mobian contact directly for more information on this tool. The difference between the keys is below:

a0 = Advertisers (via Campaign IDs) in this list should NOT want to advertise on this page

a1 = Advertisers (via Campaign IDs) should want to advertise on this page

p0 = Advertisers (via Campaign IDs) should AVOID targeting these personas

p1 = Advertisers (via Campaign IDs) should target these personas

*AP Values is in the early stages of testing and is subject to change.

## GAM Targeting:

On each page load, the Mobian RTD module finds each ad slot on the page and performs the following function:

```js
window.googletag.cmd.push(() => {
  window.googletag.pubads().setTargeting(key, value);
```

"key" and "value" will be replaced with the various classifications as described in the previous section. Notably, this function runs before ad calls are made to GAM, which enables the keys and value to be used for targeting or blocking in GAM.

For more details on how to set up key-value pairs in GAM, please see this documentation from Google: https://support.google.com/admanager/answer/9796369

For example, if you wanted to target articles where mobianRisk is "low", the key to set in GAM would be "mobian_risk" and the value would be "low". Once these keys and values are set within the Inventory section in GAM as listed by their documentation, you can then reference the key value pair in Custom Targeting for any line item you create.
