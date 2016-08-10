const {ajax} = require('../ajax');
const bidFactory = require('../bidfactory');
const bidManager = require('../bidmanager');
const utils = require('../utils');
const BASE_URL = 'https://an.facebook.com/v1/placementbid.json';
const ACCEPTED_FORMATS = ['320x50', '300x250', '728x90'];

function getBidSize({sizes, params}) {
  let width = 0;
  let height = 0;

  if (sizes.length === 2 &&
      typeof sizes[0] === 'number' &&
      typeof sizes[1] === 'number') {
    // The array contains 1 size (the items are the values)
    width = sizes[0];
    height = sizes[1];
  } else if (sizes.length >= 1) {
    // The array contains array of sizes, use the first size
    width = sizes[0][0];
    height = sizes[0][1];

    if (sizes.length > 1) {
      utils.logInfo(
        `AudienceNetworkAdapter supports only one size per ` +
        `impression, but ${sizes.length} sizes passed for ` +
        `placementId ${params.placementId}. Using first only.`
      );
    }
  }

  return {height, width};
}

function getPlacementWebAdFormat(placement) {
  if (!placement.params.native) {
    let {width, height} = getBidSize(placement);
    let size = `${width}x${height}`;
    if (ACCEPTED_FORMATS.includes(size)) {
      return size;
    }
  }
  return 'native';
}

function buildAd(unit, bid) {
  return getPlacementWebAdFormat(unit) === 'native' ?
    `<head>
      <script>var inDapIF = false;</script>
      <script type="text/javascript">
        window.onload = function() {
          if (parent) {
            var oHead = document.getElementsByTagName("head")[0];
            var arrStyleSheets = parent.document.getElementsByTagName("style");
            for (var i = 0; i < arrStyleSheets.length; i++)
              oHead.appendChild(arrStyleSheets[i].cloneNode(true));
          }
        }
      </script>
    </head>
    <body>
      <script>
        window.fbAsyncInit = function() {
          FB.Event.subscribe(
            'ad.loaded',
            function(placementId) {
              console.log('Audience Network ad loaded');
              document.getElementById('ad_root').style.display = 'block';
            }
          );
          FB.Event.subscribe(
            'ad.error',
            function(errorCode, errorMessage, placementId) {
              console.log('Audience Network error (' + errorCode + ') ' + errorMessage);
            }
          );
          FB.XFBML.parse();
        };
        (function(d, s, id) {
          var js, fjs = d.getElementsByTagName(s)[0];
          if (d.getElementById(id)) return;
          js = d.createElement(s); js.id = id;
          js.src = "//connect.facebook.net/en_US/sdk/xfbml.ad.js#xfbml=1&version=v2.5&appId=${unit.appId}";
          fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
      </script>
      <div
        class="fb-ad"
        data-placementid="${unit.placementId}"
        data-format="native"
        data-nativeadid="ad_root"
        data-bidid="${bid.bid_id}"
      >
      </div>
      <div id="ad_root">
        <a class="fbAdLink">
          <div class="fbAdMedia thirdPartyMediaClass"></div>
          <div class="fbAdTitle thirdPartyTitleClass"></div>
          <div class="fbAdBody thirdPartyBodyClass"></div>
          <div class="fbAdCallToAction thirdPartyCallToActionClass"></div>
        </a>
      </div>
    </body>` :

    `<script>var inDapIF = false;</script>
    <script>
      window.fbAsyncInit = function() {
        FB.Event.subscribe(
          'ad.loaded',
          function(placementId) {
            console.log('Audience Network ad loaded');
          }
        );
        FB.Event.subscribe(
          'ad.error',
          function(errorCode, errorMessage, placementId) {
            console.log('Audience Network error (' + errorCode + ') ' + errorMessage);
          }
        );
        FB.XFBML.parse();
      };
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "//connect.facebook.net/en_US/sdk/xfbml.ad.js#xfbml=1&version=v2.5&appId=${unit.appId}";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    </script>
    <div
      class="fb-ad"
      data-placementid="${unit.placementId}"
      data-format="${unit.format}"
      data-bidid="${bid.bid_id}"
    >
    </div>`;
}

class FANAdapter {

  constructor() {
    this.units = {};
    this.handleBids = this.handleBids.bind(this);
    this.handleError = this.handleError.bind(this);
    this.addBidErrorForUnit = this.addBidErrorForUnit.bind(this);
    this.testMode = false;
  }

  buildUnits({bids}) {
    (bids || []).forEach(bid => {
      if (bid.params.testMode) this.testMode = true;
      this.units[bid.params.placementId] = Object.assign({
        appId: bid.params.placementId.split('_')[0],
        code: bid.placementCode,
        format: getPlacementWebAdFormat(bid)
      }, bid);
    });
  }

  callBids(params) {
    this.buildUnits(params || {});
    this.fetchBids((error, bids) => {
      if (error) {
        this.handleError(error);
      } else {
        this.handleBids(bids);
      }
    });
  }

  get placementIds() {
    return Object.keys(this.units);
  }

  get formats() {
    return Object
      .keys(this.units)
      .map(placementId => this.units[placementId].format);
  }

  fetchBids(done) {
    let handleResponse = (content, resp) => {
      if (resp.status < 200 || resp.status > 300) {
        done(`Error code from FAN: ${resp.status} - ${resp.statusText}`);
      }

      try {
        content = JSON.parse(content);
      } catch (e) {
        done(e.messsage);
      }

      if (typeof content !== 'object') {
        done('Don\'t know how to handle respose from FAN');
      } else if (content.errors.length) {
        done(content.errors);
      } else if (content.bids) {
        done(null, content.bids);
      } else {
        done('unknown error');
      }
    };

    ajax(BASE_URL, handleResponse, {
      placementids: this.placementIds,
      adformats: this.formats,
      testmode: this.testMode
    }, {
      method: 'GET',
      withCredentials: true
    });
  }

  forEachUnit(fn) {
    Object.keys(this.units).forEach(placementId => {
      fn(this.units[placementId], placementId);
    });
  }

  handleError() {
    this.forEachUnit(this.addBidErrorForUnit);
  }

  handleBids(bids = {}) {
    this.forEachUnit((unit, placementId) => {
      let bid = bids[placementId];
      if (bid) {
        this.addBidForUnit(bid, unit);
      } else {
        this.addBidErrorForUnit(unit);
      }
    });
  }

  addBidForUnit(bid, unit) {
    let bidObject = bidFactory.createBid(1);
    Object.assign(bidObject, getBidSize(unit));
    bidObject.bidderCode = 'fan';
    bidObject.cpm = bid.bid_price_cents / 100;
    bidObject.bidId = bid.bid_id;
    bidObject.ad = buildAd(unit, bid);
    bidManager.addBidResponse(unit.code, bidObject);
  }

  addBidErrorForUnit({code}) {
    let bidObject = bidFactory.createBid(2);
    bidObject.bidderCode = 'fan';
    bidManager.addBidResponse(code, bidObject);
  }

}

module.exports = FANAdapter;
