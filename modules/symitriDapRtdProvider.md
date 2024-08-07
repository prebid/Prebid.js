---
layout: page_v2
title: Symitri DAP Real Time Data Provider Module
display_name: Symitri DAP Real Time Data Provider Module
description: Symitri DAP Real Time Data Provider Module
page_type: module
module_type: rtd
module_code : symitriDapRtdProvider
enable_download : true
vendor_specific: true
sidebarType : 1
---

# Symitri DAP Real Time Data Provider Module

{:.no_toc}

* TOC
{:toc}

The Symitri Data Activation Platform (DAP) is a privacy-first system that protects end-user privacy by only allowing them to be targeted as part of a larger cohort. Symitri DAP Real time data Provider automatically invokes the DAP APIs and submit audience segments and the Secure Ad ID(SAID) to the bid-stream.  SAID is a JWT/JWE which carries with it the cohorts and only a side-car or trusted server in the demand-side platform is allowed to see its contents.

## Publisher Usage

1. Build the symitriDapRTD module into the Prebid.js package with:

    ```bash
    gulp build --modules=symitriDapRtdProvider,...
    ```

2. Use `setConfig` to instruct Prebid.js to initilaize the symitriDapRtdProvider module, as specified below.

### Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 2000,
    dataProviders: [
      {
        name: "symitriDap",
        waitForIt: true,
        params: {
          apiHostname: '<see your Symitri account rep>',
          apiVersion: "x1",
          apiAuthToken: '<see your Symitri account rep>',
          domain: 'your-domain.com',
          identityType: 'email' | 'mobile' | ... | 'dap-signature:1.0.0',
          identityValue: '<user email/mobile>'
          identitySelector: '#user-profile-email',
          segtax: 501,
          dapEntropyUrl: 'https://sym-dist.symitri.net/dapentropy.js',
          dapEntropyTimeout: 1500
        }
      }
    ]
  }
});
```

Please reach out to your Symitri account representative(<Prebid@symitri.com>) to get provisioned on the DAP platform.

**Config Syntax details:**

{: .table .table-bordered .table-striped }
| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Symitri Dap Rtd module name | 'symitriDap' always|
| waitForIt | Boolean | Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false |
| apiHostname | String | Hostname provided by Symitri | Please reach out to your Symitri account representative(<Prebid@symitri.com>) for this value|
| apiVersion | String | This holds the API version | It should be "x1" always |
| apiAuthToken | String | Symitri API AuthToken | Please reach out to your Symitri account representative(<Prebid@symitri.com>) for this value |
| domain | String | The domain name of your webpage | |
| identityType | String | Something like this 'email', 'mobile',  ... 'dap-signature:1.0.0' | |
| identityValue | String | This is optional field to pass user email/mobile. Will be used only if identityType is email or mobile | |
| identitySelector | String | This is optional field to pass javascript query selector to extract user email/mobile from DOM tree. Will be used only if identityType is email or mobile and identityValue is not set. | |
| segtax | Integer | The taxonomy for Symitri | The value should be 501 |
| dapEntropyUrl | String | URL to dap entropy script | Optional if the script is directly included on the webpage. Contact your Symitri account rep for more details |
| dapEntropyTimeout | Integer | Maximum time allotted for the entropy calculation to happen | |

### Testing

To view an example of available segments returned by dap:

```bash
gulp serve --modules=rtdModule,symitriDapRtdProvider,appnexusBidAdapter,sovrnBidAdapter
```

and then point your browser at:
"<http://localhost:9999/integrationExamples/gpt/symitridap_segments_example.html>"
