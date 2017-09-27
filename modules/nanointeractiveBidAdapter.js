import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';

const BIDDER_CODE = 'nanointeractive';
const ENGINE_BASE_URL = 'https://www.audiencemanager.de/ad?type=js';

const SECURITY = 'sec';
const DATA_PARTNER_ID = 'dpid';
const DATA_PARTNER_PIXEL_ID = 'pid';
const ALG = 'a§lg';
const NQ = 'nq';
const NQ_NAME = 'name';
const CATEGORY = 'category';

const DEFAULT_ALG = 'ih';

const REQUEST_NQ = 'nq[]';
const REQUEST_SIZE = 'size[]';
const REQUEST_ALGORITHM = 'alg';
const REQUEST_HEADER_BIDDING = 'hb';
const REQUEST_HEADER_BID_ID = 'hbid';
const REQUEST_DIRECT_CALL = 'dirCall';

class NanointeractiveBidAdapter {
  constructor() {
    this.QUERY_STRING = utils.getTopWindowLocation().href.split('?');
    this.QUERY_PARAMS = this.QUERY_STRING.length > 1 ? this.QUERY_STRING[1].split('&') : [];
  }

  callBids(params) {
    params.bids.forEach(bid => {
      this.timeoutResponse(bid, params.timeout);
      this.formatParamsAndCallEngine(bid);
    })
  }

  timeoutResponse(bid, timeout) {
    setTimeout(() => {
      this.addNoBidResponse(bid);
    }, timeout)
  }

  formatParamsAndCallEngine(bid) {
    const sec = bid.params[SECURITY];
    const dpid = bid.params[DATA_PARTNER_ID];
    const pid = bid.params[DATA_PARTNER_PIXEL_ID];
    const nq = bid.params[NQ_NAME] ? this.getQueryParam(bid.params[NQ_NAME]) : bid.params[NQ] || '';
    const alg = bid.params[ALG] || DEFAULT_ALG;
    const category = bid.params[CATEGORY];

    const sizes = bid.sizes.map(value => value[0] + 'x' + value[1]);

    if (!sec || !dpid || !pid) {
      utils.logError('Required params are missing', bid);
      this.addNoBidResponse(bid);
    } else {
      this.callEngine(sec, dpid, pid, nq, alg, category, sizes, bid);
    }
  }

  callEngine(sec, dpid, pid, nq, alg, category, sizes, bid) {
    ajax(
      this.getEndpoint(sec, dpid, pid, nq, alg, category, sizes, bid.bidId),
      {
        success: response => this.successCallback(bid, response),
        error: err => this.handleEngineResponseError(bid, err)
      }
    );
  }

  getQueryParam(nq) {
    for (let i = 0; i < this.QUERY_PARAMS.length; i++) {
      const pair = this.QUERY_PARAMS[i].split('=');
      if (pair[0] === nq) {
        return decodeURIComponent(pair[1]) || null;
      }
    }
    return null;
  };

  getEndpoint(sec, dpid, pid, nq, alg, category, sizes, bidId) {
    return ENGINE_BASE_URL +
      '&' + SECURITY + '=' + sec +
      '&' + DATA_PARTNER_ID + '=' + dpid +
      '&' + DATA_PARTNER_PIXEL_ID + '=' + pid +
      this.formatSizes(sizes) +
      '&' + REQUEST_NQ + '=' + nq +
      '&' + REQUEST_ALGORITHM + '=' + alg +
      this.formatCategory(category) +
      '&' + REQUEST_HEADER_BIDDING + '=' + true +
      '&' + REQUEST_HEADER_BID_ID + '=' + bidId +
      '&' + REQUEST_DIRECT_CALL + '=' + 1
  }

  formatSizes(sizes) {
    let sizesFormatted = '';
    for (let i = 0; i < sizes.length; i++) {
      sizesFormatted += '&' + REQUEST_SIZE + '=' + sizes[i];
    }
    return sizesFormatted;
  }

  formatCategory(category) {
    return category ? '&nq=' + category : ''
  }

  successCallback(bid, response) {
    try {
      response = JSON.parse(response);
      this.handleEngineResponse(bid, response);
    } catch (err) {
      this.handleEngineResponseError(bid, err);
    }
  }

  handleEngineResponse(bid, response) {
    if (this.isEngineResponseValid(response) === true) {
      this.addBidResponse(bid, response);
    } else {
      this.addNoBidResponse(bid);
    }
  }

  handleEngineResponseError(bid, error) {
    utils.logError('Bid Response Error', bid, error);
    this.addNoBidResponse(bid);
  }

  isEngineResponseValid(response) {
    return !!response.cpm && !!response.ad;
  }

  addBidResponse(bid, response) {
    let bidResponse = bidfactory.createBid(STATUS.GOOD, {bidId: bid.bidId});
    bidResponse.cpm = response.cpm;
    bidResponse.ad = response.ad;
    bidResponse.width = response.width;
    bidResponse.height = response.height;
    bidResponse.bidderCode = BIDDER_CODE;
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  addNoBidResponse(bid) {
    let bidResponse = bidfactory.createBid(STATUS.NO_BID, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }
}

adaptermanager.registerBidAdapter(new NanointeractiveBidAdapter(), BIDDER_CODE);

module.exports = NanointeractiveBidAdapter;
