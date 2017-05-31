import bidmanager from 'src/bidmanager';
import bidfactory from 'src/bidfactory';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import Adapter from 'src/adapters/adapter';

/**
 * Adapter for requesting bids from AdKernel white-label platform
 * @class
 */
const AdKernelAdapter = function AdKernelAdapter() {
  const AJAX_REQ_PARAMS = {
    contentType: 'text/plain',
    withCredentials: true,
    method: 'GET'
  };
  const EMPTY_BID_RESPONSE = {'seatbid': [{'bid': []}]};

  let baseAdapter = Adapter.createNew('adkernel');

  /**
   * Helper object to build multiple bid requests in case of multiple zones/ad-networks
   * @constructor
   */
  function RtbRequestDispatcher() {
    const _dispatch = {};
    const originalBids = {};
    const site = createSite();
    const syncedHostZones = {};

    // translate adunit info into rtb impression dispatched by host/zone
    this.addImp = function (bid) {
      let host = bid.params.host;
      let zone = bid.params.zoneId;
      let size = bid.sizes[0];
      let bidId = bid.bidId;

      if (!(host in _dispatch)) {
        _dispatch[host] = {};
      }
      /* istanbul ignore else  */
      if (!(zone in _dispatch[host])) {
        _dispatch[host][zone] = [];
      }
      let imp = {
        'id': bidId,
        'tagid': bid.placementCode,
        'banner': {'w': size[0], 'h': size[1]}
      };
      if (utils.getTopWindowLocation().protocol === 'https:') {
        imp.secure = 1;
      }
      // save rtb impression for specified ad-network host and zone
      _dispatch[host][zone].push(imp);
      originalBids[bidId] = bid;
      // perform user-sync
      if (!(host in syncedHostZones)) {
        syncedHostZones[host] = [];
      }
      if (syncedHostZones[host].indexOf(zone) === -1) {
        syncedHostZones[host].push(zone);
      }
    };

    /**
     *  Main function to get bid requests
     */
    this.dispatch = function (callback) {
      utils._each(_dispatch, (zones, host) => {
        utils.logMessage(`processing network ${host}`);
        utils._each(zones, (impressions, zone) => {
          utils.logMessage(`processing zone ${zone}`);
          dispatchRtbRequest(host, zone, impressions, callback);
        });
      });
    };
    /**
     *  Build flat user-sync queue from host->zones mapping
     */
    this.buildUserSyncQueue = function() {
      return Object.keys(syncedHostZones)
        .reduce((m, k) => {
          syncedHostZones[k].forEach((v) => m.push([k, v]));
          return m;
        }, []);
    };

    function dispatchRtbRequest(host, zone, impressions, callback) {
      let url = buildEndpointUrl(host);
      let rtbRequest = buildRtbRequest(impressions);
      let params = buildRequestParams(zone, rtbRequest);
      ajax(url, (bidResp) => {
        bidResp = bidResp === '' ? EMPTY_BID_RESPONSE : JSON.parse(bidResp);
        utils._each(rtbRequest.imp, (imp) => {
          let bidFound = false;
          utils._each(bidResp.seatbid[0].bid, (bid) => {
            /* istanbul ignore else */
            if (!bidFound && bid.impid === imp.id) {
              bidFound = true;
              callback(originalBids[imp.id], imp, bid);
            }
          });
          if (!bidFound) {
            callback(originalBids[imp.id], imp);
          }
        });
      }, params, AJAX_REQ_PARAMS);
    }

    /**
     * Builds complete rtb bid request
     * @param imps collection of impressions
     */
    function buildRtbRequest(imps) {
      return {
        'id': utils.getUniqueIdentifierStr(),
        'imp': imps,
        'site': site,
        'at': 1,
        'device': {
          'ip': 'caller',
          'ua': 'caller'
        }
      };
    }

    /**
     * Build ad-network specific endpoint url
     */
    function buildEndpointUrl(host) {
      return `${window.location.protocol}//${host}/rtbg`;
    }

    function buildRequestParams(zone, rtbReq) {
      return {
        'zone': encodeURIComponent(zone),
        'ad_type': 'rtb',
        'r': encodeURIComponent(JSON.stringify(rtbReq))
      };
    }
  }

  /**
   *  Main module export function implementation
   */
  baseAdapter.callBids = function (params) {
    var bids = params.bids || [];
    processBids(bids);
  };

  /**
   *  Process all bids grouped by network/zone
   */
  function processBids(bids) {
    const dispatcher = new RtbRequestDispatcher();
    // process individual bids
    utils._each(bids, (bid) => {
      if (!validateBidParams(bid.params)) {
        utils.logError(`Incorrect configuration for adkernel bidder: ${bid.params}`);
        bidmanager.addBidResponse(bid.placementCode, createEmptyBidObject(bid));
      } else {
        dispatcher.addImp(bid);
      }
    });
    // start async usersync
    processUserSyncQueue(dispatcher.buildUserSyncQueue());

    // process bids grouped into bid requests
    dispatcher.dispatch((bid, imp, bidResp) => {
      let adUnitId = bid.placementCode;
      if (bidResp) {
        utils.logMessage(`got response for ${adUnitId}`);
        bidmanager.addBidResponse(adUnitId, createBidObject(bidResp, bid, imp.banner.w, imp.banner.h));
      } else {
        utils.logMessage(`got empty response for ${adUnitId}`);
        bidmanager.addBidResponse(adUnitId, createEmptyBidObject(bid));
      }
    });
  }

  /**
   *  Create bid object for the bid manager
   */
  function createBidObject(resp, bid, width, height) {
    return Object.assign(bidfactory.createBid(1, bid), {
      bidderCode: bid.bidder,
      ad: formatAdMarkup(resp),
      width: width,
      height: height,
      cpm: parseFloat(resp.price)
    });
  }

  /**
   * Create empty bid object for the bid manager
   */
  function createEmptyBidObject(bid) {
    return Object.assign(bidfactory.createBid(2, bid), {
      bidderCode: bid.bidder
    });
  }

  /**
   *  Format creative with optional nurl call
   */
  function formatAdMarkup(bid) {
    var adm = bid.adm;
    if ('nurl' in bid) {
      adm += utils.createTrackPixelHtml(`${bid.nurl}&px=1`);
    }
    return adm;
  }

  function validateBidParams(params) {
    return typeof params.host !== 'undefined' && typeof params.zoneId !== 'undefined';
  }

  /**
   * Creates site description object
   */
  function createSite() {
    var location = utils.getTopWindowLocation();
    return {
      'domain': location.hostname,
      'page': location.href.split('?')[0]
    };
  }

  /**
   *  Recursively process user-sync queue
   */
  function processUserSyncQueue(queue) {
    if (queue.length === 0) {
      return;
    }
    let entry = queue.pop();
    insertUserSync(entry[0], entry[1], () => processUserSyncQueue(queue));
  }

  /**
   *  Insert single iframe user-sync
   */
  function insertUserSync(host, zone, callback) {
    var iframe = utils.createInvisibleIframe();
    iframe.src = `//sync.adkernel.com/user-sync?zone=${zone}&r=%2F%2F${host}%2Fuser-synced%3Fuid%3D%7BUID%7D`;
    utils.addEventHandler(iframe, 'load', callback);
    try {
      document.body.appendChild(iframe);
    } catch (error) {
      /* istanbul ignore next */
      utils.logError(error);
    }
  }

  return {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    getBidderCode: baseAdapter.getBidderCode,
    createNew: AdKernelAdapter.createNew
  };
};

/**
 * Creates new instance of AdKernel bidder adapter
 */
AdKernelAdapter.createNew = function() {
  return new AdKernelAdapter();
};

module.exports = AdKernelAdapter;
