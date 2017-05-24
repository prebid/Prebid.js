import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import adloader from 'src/adloader';
import * as utils from 'src/utils';

const JustpremiumAdapter = function JustpremiumAdapter() {
  const top = window.top;
  const d = top.document;
  const gupi = false;

  function arrayUnique(array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
      for (var j = i + 1; j < a.length; ++j) {
        if (a[i] === a[j]) {
          a.splice(j--, 1);
        }
      }
    }

    return a;
  }

  function readCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  let bids;
  let cookieLoaded = false;
  let adManagerLoaded = false;
  let jPAM = top.jPAM = top.jPAM || window.jPAM || {};

  const dConfig = jPAM._dev ||
    {
      toLoad: null,
      server: null
    };
  const libVer = readCookie('jpxhbadp') || null;
  const toLoad = dConfig.toLoad || [d.location.protocol + '//d2nvliyzbo36lk.cloudfront.net/adp/' + (libVer ? libVer + '/' : '') + 'bc.js'];
  const server = dConfig.server || d.location.protocol + '//pre.ads.justpremium.com';

  function loadCookie() {
    if (cookieLoaded) return;
    cookieLoaded = true;
    adloader.loadScript(d.location.protocol + '//ox-d.justpremium.com/w/1.0/cj');
  }

  function loadTag(params, callback) {
    for (let key in params) {
      if (params.hasOwnProperty(key)) {
        if (!params[key]) {
          delete params[key];
        }
      }
    }

    const keys = Object.keys(params || {});
    const url = `${server}${keys.length ? '/?' : ''}${keys.map(key => `${key}=${params[key]}`).join('&')}`;
    adloader.loadScript(url, callback);
  }

  function onLoad() {
    jPAM = top.jPAM = Jpx.JAM.instance({
      plugins: ['bidder']
    });
  }

  function loadResources() {
    if (toLoad.length > 0) {
      adloader.loadScript(toLoad.shift(), function () {
        loadResources();
      });
    } else {
      onLoad();
    }
  }

  function loadAdManager() {
    if (adManagerLoaded) return;
    if (managerAlreadyDefined()) {
      if (!jPAM.hasPlugin('bidder')) {
        return jPAM.addPlugin('bidder');
      }
      return;
    }
    adManagerLoaded = true;
    loadResources();
  }

  function managerAlreadyDefined() {
    return top.jPAM && top.jPAM.initialized;
  }

  function findBid(zone, bids) {
    let len = bids.length;
    while (len--) {
      if (bids[len].params.zone == zone) {
        const rec = bids.splice(len, 1);
        return rec.length ? rec.pop() : false;
      }
    }

    return false;
  }

  function handleError(zone, reqBids) {
    let bid = findBid(zone, reqBids);
    while (bid) {
      const bidObject = bidfactory.createBid(2);
      bidObject.bidderCode = 'justpremium';
      bidmanager.addBidResponse(bid.placementCode, bidObject);
      bid = findBid(zone, reqBids);
    }
  }

  function addBidResponse(zone, reqBids) {
    jPAM.cmd = jPAM.cmd || [];
    jPAM.cmd.push((function (zone) {
      return function () {
        const jPAM = window.top.jPAM = window.top.jPAM || window.jPAM || {};
        const bidder = jPAM.getPlugin('bidder');

        jPAM.subscribe('tagLoaded:' + zone, function () {
          let bid = findBid(zone, reqBids);
          while (bid) {
            bidmanager.addBidResponse(bid.placementCode, bidder.createBid(function (ad) {
              let bidObject;

              if (!ad) {
                bidObject = bidfactory.createBid(2);
                bidObject.bidderCode = 'justpremium';
                return bidObject;
              }
              bidObject = bidfactory.createBid(1);
              bidObject.bidderCode = 'justpremium';
              bidObject.adSlot = bid.adSlot;

              return bidObject;
            }, bid));
            bid = findBid(zone, reqBids);
          }
        });
      }
    }(zone)));
  }

  function requestBids(bids) {
    const pubCond = preparePubCond(bids);
    const reqBids = bids.concat();

    Object.keys(pubCond).forEach(zone => {
      loadTag(
        {
          zone: zone,
          hostname: d.location.hostname,
          protocol: d.location.protocol.replace(':', ''),
          sw: top.screen.width,
          sh: top.screen.width,
          ww: top.innerWidth,
          wh: top.innerHeight,
          c: encodeURIComponent(JSON.stringify(pubCond[zone])),
          id: zone,
          i: (+new Date())
        },
        function (err) {
          if (err) {
            handleError(zone, reqBids);
          }
        },
        true
      );
      addBidResponse(zone, reqBids);
    });
  }

  function preparePubCond(bids) {
    const cond = {};
    const count = {};

    bids.forEach(function (bid) {
      const params = bid.params || {};
      const zone = params.zone;

      if (!zone) {
        throw new Error('JustPremium: Bid should contains zone id.');
      }

      if (cond[zone] === 1) {
        return;
      }

      const allow = params.allow || params.formats || [];
      const exclude = params.exclude || [];

      if (allow.length === 0 && exclude.length === 0) {
        return cond[params.zone] = 1;
      }

      cond[zone] = cond[zone] || [[], {}];
      cond[zone][0] = arrayUnique(cond[zone][0].concat(allow));
      exclude.forEach(function (e) {
        if (!cond[zone][1][e]) {
          cond[zone][1][e] = 1;
        } else cond[zone][1][e]++;
      });

      count[zone] = count[zone] || 0;
      if (exclude.length) count[zone]++;
    });

    Object.keys(count).forEach(zone => {
      if (cond[zone] === 1) return;

      const exclude = [];
      Object.keys(cond[zone][1]).forEach(format => {
        if (cond[zone][1][format] === count[zone]) exclude.push(format);
      });

      cond[zone][1] = exclude;
    });

    Object.keys(cond).forEach(zone => {
      if (cond[zone] !== 1 && cond[zone][1].length) {
        cond[zone][0].forEach(r => {
          var idx = cond[zone][1].indexOf(r);
          if (idx > -1) {
            cond[zone][1].splice(idx, 1);
          }
        });
        cond[zone][0].length = 0;
      }

      if (cond[zone] !== 1 && !cond[zone][0].length && !cond[zone][1].length) cond[zone] = 1;
    });

    return cond;
  }

  function callBids(params) {
    bids = params.bids || [];

    loadAdManager();
    requestBids(bids);
  }

  loadCookie();

  return {
    callBids: callBids
  };
};

module.exports = JustpremiumAdapter;
