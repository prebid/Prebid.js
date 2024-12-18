# Mobian Rtd Provider

## Overview

Module Name: Mobian Rtd Provider

Module Type: Rtd Provider

Maintainer: rich.rodriguez@themobian.com

The Mobian Real-Time Data (RTD) Module is a plug-and-play Prebid.js adapter that is designed to provide Mobian Contextual results on the publisher’s page.

## Downloading and Configuring the Mobian RTD module

Navigate to https://docs.prebid.org/download.html and check the box labeled Mobian Prebid Contextual Evaluation. If you have installed Prebid.js on your site previously, please be sure to select any other modules and adaptors to suit your needs. When clicking the "Get Prebid.js" button at the bottom of the page, the site will build a version of Prebid.js with all of your selections.

Direct link to the Mobian module in the Prebid.js repository: https://github.com/prebid/Prebid.js/blob/a9de3c15ac9a108b43a1e2df04abd6dfb5297530/modules/mobianRtdProvider.js

The client will need to provide Mobian with all the domains that would be using the prebid module so that Mobian can whitelist those domains. Failure to whitelist the domains will yield a 404 when making a request to the Mobian Contextual API at https://prebid.outcomes.net/.

## Functionality

At a high level, the Mobian RTD Module is designed to call the Mobian Contextal API on page load, requesting the Mobian classifications and results for the URL. The classifications and results are designed to be picked up by any SSP or DSP in the Prebid.js ecosystem. The module also supports placing the Mobian classifications on each ad slot on the page, thus allowing for targeting within GAM.

## Available Classifications

Risk:

Key: mobianRisk

Possible values: "none", "low", "medium" or "high"

Description: Risk will contain Mobian’s brand safety assessment of the page. Brand Safety is determined via the Mobian AI models taking into account a semantic analysis of the content while understanding the context. A more detailed description of the reasoning for a given URL can be observed by going to mbs.themobian.com and entering the URL.

------------------

Content Categories:

Key: mobianContentCategories

Possible values: "adult_content", "arms", "crime", "death_injury", "debated_issue", "hate_speech", "drugs_alcohol", "obscenity", "piracy", "spam", "terrorism"

Description: Content Categories contain results based on the legacy GARM framework. GARM no longer is a standard and does not factor into our risk assessment but is included for posterity.

------------------

Sentiment:

Key: mobianSentiment

Possible values: "negative", "neutral" or "positive"

Description: Sentiment can only be one of the three values listed, and is determined via the Mobian AI analyzing the content and making one of these three determinations.

------------------

Emotion:

Key: mobianEmotions

Possible values: "love", "joy", "surprise", "anger", "sadness", "fear"

Description: The Mobian AI assesses the emotions exuded from the content, taking into account the context. A given piece of content can have multiple emotions. The current list of emotions is all possible emotions available but this will be updated to be more freeform and varied in a future release.

------------------

Tone:

Key: mobianTones

Possible values: Various, but some examples include "comedic", "serious" or "emotional"

Description: While the Mobian emotion classification looks at the emotions exuded from the content, tone examines the overall presentation of the content and determines the overall mood of the work. A given piece of content can have multiple tones.

------------------

Theme:

Key: mobianThemes

Possible values: Various, but some examples include "skincare", "food" and "nightlife"

Description: Themes are a wide classification of content categorization, taking into account the content and context to label the content with a theme. A given piece of content can have multiple themes.

------------------

Genre:

Key: mobianGenre

Possible values: Various, but some examples include "journalism", "gaming" or "how-to"

Description: Genres are a more narrow classification of content categorization, aiming to label the content towards its overall purpose and audience. A given piece of content can have multiple genres.

------------------

AP Values

Keys: ap_a0, ap_a1, ap_p0, ap_p1

Possible values: Various, numerically id-based and customizable based on Mobian Persona Settings.

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

For more details on how to set up key-value pairs in GAM, please see this documentation from Google: https://support.google.com/admanager/answer/9796369?sjid=12535178383871274096-NA

For example, if you wanted to target articles where mobianRisk is "low", the key to set in GAM would be "mobianRisk" and the value would be "low". Once these keys and values are set within the Inventory section in GAM as listed by their documentation, you can then reference the key value pair in Custom Targeting for any line item you create.

## Configuration Highlight

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
