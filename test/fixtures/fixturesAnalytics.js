// Copyright 2016 AOL Platforms.

export const DEFAULT_TIMEOUT = 1000;
export const DEFAULT_REQUEST_TIMESTAMP = new Date().getTime();
export const DEFAULT_RESPONSE_TIMESTAMP = DEFAULT_REQUEST_TIMESTAMP + 500;
export const DEFAULT_REQUEST_ID = '1863e370099524';
export const DEFAULT_AD_UNIT_CODE = 'header-bid-tag-0';

export const BID_CONFIGS = {
  AOL1: {
    bidder: 'aol',
    params: {
      placement: 3675026,
      network: '9599.1',
      pageid: 12345
    }
  },
  AOL2: {
    bidder: 'aol',
    params: {
      placement: 3675027,
      network: '9599.1',
      pageid: 12345
    }
  },
  APPNEXUS1: {
    bidder: 'appnexus',
    params: {
      placementId: 12345,
    }
  },
  APPNEXUS2: {
    bidder: 'appnexus',
    params: {
      placementId: 56789,
    }
  },
  APPNEXUS3: {
    bidder: 'appnexus',
    params: {
      placementId: 2345,
    }
  },
  PULSEPOINT1: {
    bidder: 'pulsepoint',
    params: {
      placement: 12345
    }
  }
};

export const DEFAULT_AD_UNIT = {
  code: DEFAULT_AD_UNIT_CODE,
  sizes: [[300, 250]],
  bids: [BID_CONFIGS.AOL1]
};

export const BID_SETS = {
  AOL: {
    bidder: 'aol',
    bidderCode: 'aol',
    bidderRequestId: '107f5e6e98dcf10',
    requestId: DEFAULT_REQUEST_ID,
    start: DEFAULT_REQUEST_TIMESTAMP,
    timeout: DEFAULT_TIMEOUT,
    bids: [Object.assign({}, BID_CONFIGS.AOL1, {
      placementCode: DEFAULT_AD_UNIT_CODE,
      bidId: '1144e2f0de84364',
      bidderRequestId: '107f5e6e98dcf10',
      requestId: DEFAULT_REQUEST_ID,
      sizes: [[300, 250]]
    })]
  }
};

export const BIDS = {
  VALID: {
    bidder: 'aol',
    bidderCode: 'aol',
    adUnitCode: DEFAULT_AD_UNIT_CODE,
    getStatusCode: () => 1,
    statusMessage: 'Bid available',
    width: 300,
    height: 250,
    adId: '122bb26f9e8be',
    ad: '<script></script>',
    requestTimestamp: DEFAULT_REQUEST_TIMESTAMP,
    responseTimestamp: DEFAULT_RESPONSE_TIMESTAMP,
    timeToRespond: DEFAULT_RESPONSE_TIMESTAMP - DEFAULT_REQUEST_TIMESTAMP,
    cpm: 0.10,
    dealId: 'MP-1-999-1-K3XEW',
    pbLg: '0.00',
    pbMg: '0.10',
    pbHg: '0.11',
    pbAg: '0.10',
    size: '300x250'
  },

  EMPTY: {
    bidder: 'aol',
    bidderCode: 'aol',
    adUnitCode: DEFAULT_AD_UNIT_CODE,
    getStatusCode: () => 2,
    statusMessage: 'Bid returned empty or error response',
    width: 0,
    height: 0,
    adId: '222bb26f9e8be',
    requestTimestamp: DEFAULT_REQUEST_TIMESTAMP,
    responseTimestamp: DEFAULT_RESPONSE_TIMESTAMP,
    timeToRespond: DEFAULT_RESPONSE_TIMESTAMP - DEFAULT_REQUEST_TIMESTAMP,
    cpm: 0,
    pbLg: '0',
    pbMg: '0',
    pbHg: '0',
    pbAg: '0',
    size: '0x0'
  },

  TIMED_OUT: {
    bidder: 'aol',
    adUnitCode: DEFAULT_AD_UNIT_CODE,
    getStatusCode: () => 3,
    timeToRespond: 5000,
    cpm: 0
  }
};
