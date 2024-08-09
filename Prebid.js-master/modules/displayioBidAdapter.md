# Overview

```
Module Name: DisplayIO Bidder Adapter
Module Type: Bidder Adapter
```

# Description

Module that connects to display.io's demand sources.
Web mobile (not relevant for web desktop).


#Features
| Feature       |                                                         | Feature               |     |
|---------------|---------------------------------------------------------|-----------------------|-----|
| Bidder Code   | displayio                                               | Prebid member         | no  |
| Media Types   | Banner, video. <br/>Sizes (display 320x480 / vertical video) | GVL ID                | no  | 
| GDPR Support  | yes                                                     | Prebid.js Adapter     | yes |
| USP Support   | yes                                                     | Prebid Server Adapter | no  |


#Global configuration
```javascript
<head>
  <script src="https://cdn.display.io/webis/webis.min.js"></script>
</head>
<script>
    ......................................  
    var CMP_TIMEOUT = 8000;
    var consentManagement = {
    gdpr: {
       cmpApi: 'iab',
       timeout: CMP_TIMEOUT,
       defaultGdprScope: true
    },
    usp: {
       cmpApi: 'iab',
       timeout: CMP_TIMEOUT
     }
    }
    
    if (typeof __tcfapi !== 'function') {
       delete consentManagement.gdpr;
    }
    
    pbjs.que.push(function() {
       pbjs.setConfig({consentManagement})
    });
    
    
    ......................................
    
    function initAdserver(bidResponses) {
      if (pbjs.initAdserverSet) return;
      pbjs.initAdserverSet = true;
    
      ...........................
    
      const displayioBids = getDisplayioBid(bidResponses)
      displayioBids.forEach(b => {
          const {adData, placement} = b[1].bids[0];
          webis.init(adData, b[0], {placement})
      })
    
    }
    
    function getDisplayioBid(bidResponses) {
      const codes = adUnits.map(u => u.code);
      const bids = Object.entries(bidResponses);
      bids.filter(([key, value]) => codes.includes(key) && value.bids[0].bidderCode === 'displayio');
      return bids;
    }

    ......................................

```


# Bid Parameters

| Name  | Scope | Type | Description                            | Example                       |
|----------------| ----- | ---- |----------------------------------------|-------------------------------|
| `siteId`       | required | Number | SiteId and PlacementID are your inventory IDs on the display.io platform (please ask your Account Manager for your site and placement IDs). | 7753                          |
| `placementId`  | required | Number | SiteId and PlacementID are your inventory IDs on the display.io platform (please ask your Account Manager for your site and placement IDs).                                       | 5375                          |
| `adsSrvDomain` | required | String |                                        | "appsrv.display.io"           |
| `cdnDomain`    | required | String |                                        | "cdn.display.io"              |
| `pageCategory` | optional | String | Comma-separated list of IAB content categories that describe the current page or view of the site, list of available values. | "pageCategory1, pageCategory2" |
| `keywords`     | optional | String | Comma-separated list of keywords describing the content. | "keyword1, keyword2, keyword3" |
| `custom`       | optional | Object | User-defined targeting key-value pairs. custom applies to a specific unit. | `{headerTextColor: "red", fixedHeaderSelector: '.site-header'}` |
| `custom.headerText`| optional | String | Ad container header text. By default, text is "Scroll to continue with content". Limited to 50 characters. | "Our awesome advertisement"|
| `custom.headerTextColor`| optional | String | Ad container header text color, "white" by default | "#2196f3"|
| `custom.headerBackgroundColor`| optional | String | Ad container header background color, "black" by default | "#fff" |
| `custom.adContainerBackgroundColor`| optional | String | Ad container body background color, "transparent" by default | "#000"|
| `custom.fixedHeaderSelector`| optional | String | In case your webpage has a fixed header – the header Id attribute or header class attribute should be defined as a value for parameter fixedHeaderSelector. | ".site-header"|

# adUnit configuration example
```javascript
var adUnits = [
  {
    code: 'ad-tag-1',
    mediaTypes: {
      banner: {
        sizes: [[320, 480]]
      },
      video: {
        sizes: [[360, 640]]
      },
    },
    bids: [
      {
        bidder: 'displayio',
        params: {
          siteId: 1,
          placementId: 1,
          adsSrvDomain: 'appsrv.display.io',
          cdnDomain: 'cdn.display.io',
          pageCategory: 'pageCategory1, pageCategory2', //comma separated
          keywords: 'keyword1, keyword2, keyword3', //comma separated
          custom: {
            headerText: 'Our awesome advertisement',
            headerTextColor: '#2196f3',
            headerBackgroundColor: 'black',
            adContainerBackgroundColor: 'transparent',
            fixedHeaderSelector: '.site-header',
          },
        }
      }
    ]
  },
  // minimal required options
  {
    code: 'ad-tag-2',
    bids: [{
      bidder: 'displayio',
      params: {
        siteId: 1,
        placementId: 1,
        adsSrvDomain: 'appsrv.display.io',
        cdnDomain: 'cdn.display.io',
      }
    }]
  }
];
```

# Additional Details
[Mobile web prebid.js integration](https://www.display.io/documentation/mobile-web-prebid-js-integration/)
