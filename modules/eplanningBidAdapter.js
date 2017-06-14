var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adaptermanager = require('src/adaptermanager');

function EPlanningAdapter() {
  (function() {
    var win = window, doc = win.document, pbjs = win.pbjs, _global = {}, _default = { 'sv': 'ads.us.e-planning.net', 't': 0 }, rnd, FILE = 'file', CALLBACK_FUNCTION = 'hbpb.rH', NULL_SIZE = '1x1', _csRequested = [], PROTO = location.protocol === 'https:' ? 'https:' : 'http:', ISV = 'aklc.img.e-planning.net';
    function Hbpb() {
      var slots = (function() {
        var _data = [];
        function Slot(slotId) {
          var data = _data[slotId];
          function hasAds() {
            return _data[slotId].ads.length;
          }
          function getSizes() {
            return data.sizes;
          }
          function getSizesString() {
            var s = [], i, sizes = getSizes();
            if (sizes && sizes.length) {
              if (typeof sizes[0] === 'object') {
                for (i = 0; i < sizes.length; i++) {
                  s.push(sizes[i][0] + 'x' + sizes[i][1]);
                }
              } else {
                s.push(sizes[0] + 'x' + sizes[1]);
              }
            } else {
              return NULL_SIZE;
            }
            return s.join(',');
          }
          return {
            getPlacementCode: function() {
              return data.placementCode;
            },
            getString: function() {
              return this.getPlacementCode() + ':' + getSizesString();
            },
            addAd: function(ad) {
              _data[slotId].ads.push(ad);
            },
            getFormatedResponse: function() {
              var ad, that = this;
              if (hasAds()) {
                ad = data.ads[0];
                return {
                  'placementCode': that.getPlacementCode(),
                  'ad': {
                    'ad': ad.adm,
                    'cpm': ad.pr,
                    'width': ad.size.w,
                    'height': ad.size.h
                  }
                };
              } else {
                return { 'placementCode': that.getPlacementCode() };
              }
            }
          };
        }
        function findAll() {
          var i = 0, r = [];
          for (i = 0; i < _data.length; i++) {
            r.push(new Slot(i));
          }
          return r;
        }
        return {
          add: function(slot) {
            slot.ads = [];
            _data.push(slot);
          },
          get: function(slotId) {
            return new Slot(slotId);
          },
          getString: function() {
            var _slots = [], i, slot;
            for (i = 0; i < _data.length; i++) {
              slot = this.get(i);
              _slots.push(slot.getString());
            }
            return _slots.join('+');
          },
          findByPlacementCode: function(placementCode) {
            var i, _slots = findAll();
            for (i = 0; i < _slots.length; i++) {
              if (_slots[i].getPlacementCode() === placementCode) {
                return _slots[i];
              }
            }
          },
          getFormatedResponse: function() {
            var _slots = findAll(), i, r = [];
            for (i = 0; i < _slots.length; i++) {
              r.push(_slots[i].getFormatedResponse());
            }
            return {
              'bids': r
            };
          }
        };
      })();
      function call(params) {
        var i, bids = params.bids;
        for (i = 0; i < bids.length; i++) {
          slots.add({
            _raw: bids[i],
            placementCode: bids[i].placementCode,
            sizes: bids[i].sizes
          });
          setGlobalParam('sv', bids[i]);
          setGlobalParam('ci', bids[i]);
          setGlobalParam('t', bids[i]);
        }
        doRequest();
      }
      function setGlobalParam(param, bid) {
        if (!_global[param]) {
          if (bid && bid.params && bid.params[param]) {
            _global[param] = bid.params[param];
          }
        }
      }
      function getGlobalParam(param) {
        return (_global[param] || _default[param]);
      }
      function getRandom() {
        if (!rnd) {
          rnd = Math.random();
        }
        return rnd;
      }
      function getDocURL() {
        return escape(win.location.href || FILE);
      }
      function getReferrerURL() {
        return doc.referrer;
      }
      function getCallbackFunction() {
        return CALLBACK_FUNCTION;
      }
      function doRequest() {
        var clienteId = getGlobalParam('ci'), url, dfpClienteId = '1', sec = 'ROS', params = [], t = getGlobalParam('t');
        if (clienteId && !t) {
          url = PROTO + '//' + getGlobalParam('sv') + '/hb/1/' + clienteId + '/' + dfpClienteId + '/' + (win.location.hostname || FILE) + '/' + sec + '?';
          params.push('rnd=' + getRandom());
          params.push('e=' + slots.getString());
          if (getDocURL()) {
            params.push('ur=' + getDocURL());
          }
          if (getReferrerURL()) {
            params.push('fr=' + getReferrerURL());
          }
          params.push('cb=' + getCallbackFunction());
          params.push('r=pbjs');
          url += params.join('&');
          load(url);
        } else if (t) {
          url = PROTO + '//' + ISV + '/layers/t_pbjs_' + t + '.js';
          load(url);
        }
      }
      function load(url) {
        var script = doc.createElement('script');
        script.src = url;
        doc.body.appendChild(script);
      }
      function callback(response) {
        if (pbjs && pbjs.processEPlanningResponse && typeof pbjs.processEPlanningResponse === 'function') {
          pbjs.processEPlanningResponse(response);
        }
      }
      function syncUsers(cs) {
        var i, e, d;
        for (i = 0; i < cs.length; i++) {
          if (typeof cs[i] === 'string' && _csRequested.indexOf(cs[i]) === -1) {
            (new Image()).src = cs[i];
            _csRequested.push(cs[i]);
          } else if (typeof cs[i] === 'object' && _csRequested.indexOf(cs[i].u) === -1) {
            if (cs[i].j) {
              e = doc.createElement('script');
              e.src = cs[i].u;
            } else if (cs[i].ifr) {
              e = doc.createElement('iframe');
              e.src = cs[i].u;
              e.style.width = e.style.height = '1px';
              e.display = 'none';
            }
            if (cs[i].data) {
              for (d in cs[i].data) {
                if (cs[i].data.hasOwnProperty(d)) {
                  e.setAttribute('data-' + d, cs[i].data[d]);
                }
              }
            }
            doc.body.appendChild(e);
            _csRequested.push(cs[i].u);
          }
        }
      }
      function rH(response) {
        var slot, i, o;
        if (response && response.sp && response.sp.length) {
          for (i = 0; i < response.sp.length; i++) {
            if (response.sp[i].a) {
              slot = slots.findByPlacementCode(response.sp[i].k);
              if (slot) {
                for (o = 0; o < response.sp[i].a.length; o++) {
                  slot.addAd({
                    'adm': response.sp[i].a[o].adm,
                    'pr': response.sp[i].a[o].pr,
                    'size': {
                      'w': response.sp[i].a[o].w,
                      'h': response.sp[i].a[o].h
                    }
                  });
                }
              }
            }
          }
          callback(slots.getFormatedResponse());
        }
        if (response && response.cs && response.cs.length) {
          syncUsers(response.cs);
        }
      }
      return {
        call: function(params) {
          return call(params);
        },
        rH: function(response) {
          return rH(response);
        }
      };
    }
    win.hbpb = win.hbpb || new Hbpb();
  })();

  window.pbjs = window.pbjs || {};
  window.pbjs.processEPlanningResponse = function(response) {
    var bids, bidObject, i;
    if (response) {
      bids = response.bids;
      for (i = 0; i < bids.length; i++) {
        if (bids[i].ad) {
          bidObject = getBidObject(bids[i]);
          bidmanager.addBidResponse(bids[i].placementCode, bidObject);
        } else {
          bidObject = bidfactory.createBid(2);
          bidObject.bidderCode = 'eplanning';
          bidmanager.addBidResponse(bids[i].placementCode, bidObject);
        }
      }
    }
  };

  function getBidObject(bid) {
    var bidObject = bidfactory.createBid(1), i;
    bidObject.bidderCode = 'eplanning';
    for (i in bid.ad) {
      if (bid.ad.hasOwnProperty(i)) {
        bidObject[i] = bid.ad[i];
      }
    }
    return bidObject;
  }

  function _callBids(params) {
    if (window.hbpb) {
      window.hbpb.call(params);
    }
  }

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new EPlanningAdapter, 'eplanning');

module.exports = EPlanningAdapter;
