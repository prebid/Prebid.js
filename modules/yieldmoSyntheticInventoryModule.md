# Yieldmo Synthetic Inventory Module

## Overview

This module enables publishers to set up Yieldmo Synthetic Outstream ads on their pages.

If publishers will enable this module and provide placementId and Google Ad Manager ad unit path, this module will create a placement on the page and inject Yieldmo SDK into this placement. Publisher will then need to get a placement id from their Yieldmo account manager (accounts email) and setup corresponding ad units on the GAM ad server.

## Integration

Build the Yieldmo Synthetic Inventory Module into the Prebid.js package with:

```
gulp build --modules=yieldmoSyntheticInventoryModule,...
```

## Module Configuration

```js
pbjs.que.push(function() {
    pbjs.setConfig({
        yieldmo_synthetic_inventory: {
            placementId: '1234567890',
            adUnitPath: '/1234567/ad_unit_name_used_in_gam'
        }
    });
});
```

### Configuration Parameters

|Name |Scope |Description | Example| Type
| :------------ | :------------ | :------------ | :------------ | :------------ |
|placementId | required | Yieldmo placement ID | '1234567890' | string
|adUnitPath | required | Google Ad Manager ad unit path | '/6355419/ad_unit_name_used_in_gam' | string

### How to get ad unit path

Ad unit path follows the format /network-code/[parent-ad-unit-code/.../]ad-unit-code, where:

- network-code is a unique identifier for the Ad Manager network the ad unit belongs to
- parent-ad-unit-code are the codes of all parent ad units (only applies to non-top level ad units)
- ad-unit-code is the code for the ad unit to be displayed

Note that all ad unit codes included in the ad unit path must adhere to the [formatting rules](https://support.google.com/admanager/answer/1628457#ad-unit-codes) specified by Ad Manager.

Another and probably the easiest way to get an ad unit path is to get it from the google ad manager ad unit document header generated tag:

```js
googletag.defineSlot('/1234567/ad_unit_name_used_in_gam', [1, 1], 'ad-container-id').addService(googletag.pubads());
```

### How to get Yieldmo placement id

Please reach out to your Yieldmo account's person or email to support@yieldmo.com

### Google Ad Manager setup

Yieldmo Synthetic Inventory Module is designed to be used along with Google Ad Manager. GAM should be set as usual, but there are a few requirements:

- Ad unit size should be 1x1
- Creative should NOT be served into a SafeFrame and also should have 1x1 size
- Synthetic Inventory Universal Tag should be used as 3rd party creative code
### Synthetic Inventory Universal Tag

```js
<div id="ym_%%PATTERN:ym_sim_p_id%%" class="ym"></div><script type="text/javascript">(function(e,t){if(t._ym===void 0){t._ym="";var m=e.createElement("script");m.type="text/javascript",m.async=!0,m.src="//static.yieldmo.com/ym."+Math.round(5*Math.random()/3)+".js",(e.getElementsByTagName("head")[0]||e.getElementsByTagName("body")[0]).appendChild(m)}else t._ym instanceof String||void 0===t._ym.chkPls||t._ym.chkPls()})(document,window);</script>
```