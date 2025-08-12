# Overtone Rtd Provider

## Overview

Module Name: Overtone Rtd Provider

Module Type: Rtd Provider

Maintainer: tech@overtone.ai

The Overtone Real-Time Data (RTD) Module is a plug-and-play Prebid.js adapter designed to provide contextual classification results on the publisher’s page through Overtone’s contextual API.


## Downloading and Configuring the Overtone RTD Module

Navigate to https://docs.prebid.org/download.html and select the box labeled Overtone Prebid Contextual Evaluation. If Prebid.js is already installed on your site, ensure other necessary modules and adapters are selected. Upon clicking the "Get Prebid.js" button, a customized Prebid.js version will be built with your selections.

Direct link to the Overtone module in the Prebid.js repository: 

The client must provide Overtone with all the addresses using the Prebid module to whitelist those domains. Failure to whitelist addresses will result in an invalid request to the Overtone Contextual API.


## Functionality

At a high level, the Overtone RTD Module makes requests to the Overtone Contextual API during page load. It fetches and categorizes content for each page, which is then available for targeting in Prebid.js. Contextual data includes content classifications, which help advertisers make informed decisions about ad placements.


## Available Classifications

Content Categories:

Key: categories

Possible Values: Various identifiers such as ovtn_004, ovtn_104, etc.

Description: Content Categories represent Overtone’s classification of page content based on its contextual analysis.

Please contact tech@overtone.ai for more information about our exact categories in brand safety, type, and tone.


## Configuration Highlight

The configuration for the Overtone RTD module in Prebid.js might resemble the following:

pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'overtone',
      params: {
        
      }
    }]
  }
});


## API Response Handling

The Overtone RTD module processes responses from the Overtone Contextual API. A typical response might include the following:

Status: Indicates the API request status (1 for success, 3 for fail, 4 for ignore).

Categories: An array of classification identifiers.

For example:

{
  "categories": ["ovtn_004", "ovtn_104", "ovtn_309", "ovtn_202"],
  "status": 1
}

The module ensures that these values are integrated into Prebid.js’s targeting configuration for the current page.


## Testing and Validation

The functionality of the Overtone RTD module can be validated using the associated test suite provided in overtoneRtdProvider_spec.mjs. The test suite simulates different API response scenarios to verify module behavior under varied conditions.

Example Test Cases:

Successful Data Retrieval:

Input: URL with valid classification data.

Expected Output: Categories array populated with identifiers.

Failed Request:

Input: URL resulting in a failure.

Expected Output: Empty categories array.

Ignored URL:

Input: URL to be ignored by the API.

Expected Output: Empty categories array.
