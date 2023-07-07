
# OpenX Analytics Adapter to Prebid.js
## Implementation Guide
#### Internal use only

---

# NOTE: OPENX NO LONGER OFFERS ANALYTICS
# THIS ADAPTER NO LONGER FUNCTIONS AND 
# WILL BE REMOVED IN PREBID 8

# About this Guide
This implementation guide walks through the flow of onboarding an alpha Publisher to test OpenX’s new Analytics Adapter.

- [Adding OpenX Analytics Adapter to Prebid.js](#adding-openx-analytics-adapter-to-prebidjs)
  - [Publisher Builds Prebid.js File Flow](#publisher-builds-prebidjs-file-flow)
  - [OpenX Builds Prebid.js File Flow](#openx-builds-prebidjs-file-flow)
- [Website Configuration](#website-configuration)
- [Configuration Options](#configuration-options)
- [Viewing Data](#viewing-data)

---

# Adding OpenX Analytics Adapter to Prebid.js
A Publisher has two options to add the OpenX Analytics Adapter to Prebid.js:

1. [Publisher builds the Prebid.js file](#publisher-builds-prebid.js-file-flow): If the Publisher is familiar with building Prebid.js (through the command line and not through the download site), OpenX can provide to the Publisher only the Analytics Adapter code.

2. [OpenX builds the Prebid.js file](#openx-builds-prebid.js-file-flow): If the Publisher is unfamiliar with building Prebid.js, the Publisher should advise OpenX which modules to include by going to the [Prebid download site](http://prebid.org/download.html) and selecting all the desired items (adapters and modules) for OpenX.

---

## Publisher Builds Prebid.js File Flow
Use this option if the Publisher is building the Prebid.js file.

1. OpenX sends Publisher the new Analytics Adapter code.

2. Publisher replaces the file in `<path_to_prebid.js_folder>/modules/openxAnalyticsAdapter.js` with the file provided by OpenX.

3. Publisher runs the build command in `<path_to_prebid.js_folder>` and includes `openxAnalyticsAdapter` as one of the modules to include.

    For example:

    ```shell
    gulp build --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter,openxBidAdapter,openxAnalyticsAdapter,dfpAdServerVideo
    ```

4. Publisher deploys the Prebid.js file from `<path_to_prebid.js_folder>/build/dist/prebid.js` to a website.

---

## OpenX Builds Prebid.js File Flow
Use this option if OpenX is building the Prebid.js file on behalf of the Publisher.

1. Publisher refers to the [Prebid download site](http://prebid.org/download.html) and sends a list of adapters and modules to OpenX.

    >Note: The Publisher must be aware that only Prebid 3.0+ is supported.

    For example (does not have to follow exact format):

    ```yaml
    Prebid Version: 3.10+
    Modules:
      Bidders
        OpenX
        Rubicon
        Sovrn
      Consent Management
        US Privacy
      User ID
        IdentityLink ID
      DFP Video
      Supply Chain Object
      Currency
    ```

2. OpenX uses the information to build a package to the user’s specification and includes `openxAnalyticsAdapter` as an additional module.

3. OpenX sends the built package to the Publisher.

4. Publisher deploys the modified Prebid.js to a website.

---

# Website Configuration
To configure your website, add the following code snippet to your website:

```javascript
pbjs.que.push(function () {
  pbjs.enableAnalytics([{
    provider: "openx",
    options: {
        publisherPlatformId: "OPENX_PROVIDED_PLATFORM_ID", // eg: "a3aece0c-9e80-4316-8deb-faf804779bd1"
        publisherAccountId: PUBLISHER_ACCOUNT_ID, // eg: 537143056
        sampling: 0.05, // 5% sample rate
        testCode: 'test-code-1'
    }
  }]);
});
```

---

## Configuration Options
Configuration options are a follows:

| Property | Type | Required? | Description | Example |
|:---|:---|:---|:---|:---|
| `orgId` | `string` | Yes | Used to determine ownership of data. | `aa1bb2cc-3dd4-4316-8deb-faf804779bd1` |
| `publisherPlatformId` | `string` | No <br> **__Deprecated.  Please use orgId__** | Used to determine ownership of data. | `a3aece0c-9e80-4316-8deb-faf804779bd1` |
| `publisherAccountId` | `number` | No <br> **__Deprecated.  Please use orgId__** | Used to determine ownership of data. | `1537143056` |
| `sampling` | `number` | Yes | Sampling rate | Undefined or `1.00` - No sampling. Analytics is sent all the time.<br>0.5 - 50% of users will send analytics data. |
| `testCode` | `string` | No | Used to label analytics data for the purposes of tests.<br>This label is treated as a dimension and can be compared against other labels. | `timeout_config_1`<br>`timeout_config_2`<br>`timeout_default` |
| `campaign` | `Object` | No | Object with 5 parameters: <ul><li>content</li><li>medium</li><li>name</li><li>source</li><li>term</li></ul> Each parameter is a free-form string. Refer to metrics doc on when to use these fields.  By setting a value to one of these properties, you override the associated url utm query parameter. | |
| `payloadWaitTime` | `number` | No | Delay after all slots of an auction renders before the payload is sent. <br> Defaults to 100ms | 1000 |
---

# Viewing Data
The Prebid Report available in the Reporting in the Cloud tool, allows you to view your data.

**To view your data:**

1. Log in to [OpenX Reporting](https://openx.sigmoid.io/app).

2. In the top right, click on the **View** list and then select **Prebidreport**.

3. On the left icon bar, click on the dimensions icon.

4. Add the dimensions that you need.

5. On the left icon bar, click on the metrics icon.

6. Add the metrics (graphs) that you need.

   The data appears on the Analyze screen.
