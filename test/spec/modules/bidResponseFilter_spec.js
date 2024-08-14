import { BID_ADV_DOMAINS_REJECTION_REASON, BID_ATTR_REJECTION_REASON, BID_CATEGORY_REJECTION_REASON, PUBLISHER_FILTER_REJECTION_REASON, addBidResponseHook } from '../../../modules/bidResponseFilter';
import { config } from '../../../src/config';

describe('bidResponseFilter', () => {
  afterEach(() => {
    config.resetConfig();
  });

  it('should reject the bid after failed publisher rule validation', () => {
    const reject = sinon.stub();
    const bid = {
      meta: {}
    };
    const filterFn = (bid) => {
      return bid.meta.hasOwnProperty('expectedFieldName');
    };
    config.setConfig({bidResponseFilter: {filterFn}});

    addBidResponseHook(() => {}, 'adcode', bid, reject);
    sinon.assert.calledWith(reject, PUBLISHER_FILTER_REJECTION_REASON);
  });

  it('should pass the bid after successful publisher rule validation', () => {
    const call = sinon.stub();
    const bid = {
      meta: {
        expectedFieldName: ['domain1.com', 'domain2.com']
      }
    };
    const filterFn = (bid) => {
      return bid.meta.hasOwnProperty('expectedFieldName');
    };
    config.setConfig({bidResponseFilter: {filterFn}});

    addBidResponseHook(call, 'adcode', bid, () => {});
    sinon.assert.calledOnce(call);
  });

  it('should pass the bid after successful ortb2 rules validation', () => {
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'EXAMPLE-CAT-ID',
        attr: 'attr'
      }
    };
    config.setConfig({ortb2: {
      badv: [], bcat: ['BANNED_CAT1', 'BANNED_CAT2'], battr: 'BANNED_ATTR'
    }});

    addBidResponseHook(call, 'adcode', bid, () => {});
    sinon.assert.calledOnce(call);
  });

  it('should reject the bid after failed ortb2 cat rule validation', () => {
    const reject = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'BANNED_CAT1',
        attr: 'attr'
      }
    };
    config.setConfig({ortb2: {
      badv: [], bcat: ['BANNED_CAT1', 'BANNED_CAT2'], battr: 'BANNED_ATTR'
    }});

    addBidResponseHook(call, 'adcode', bid, reject);
    sinon.assert.calledWith(reject, BID_CATEGORY_REJECTION_REASON);
  });

  it('should reject the bid after failed ortb2 adv domains rule validation', () => {
    const rejection = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'VALID_CAT',
        attr: 'attr'
      }
    };
    config.setConfig({ortb2: {
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2'], battr: 'BANNED_ATTR'
    }});

    addBidResponseHook(call, 'adcode', bid, rejection);
    sinon.assert.calledWith(rejection, BID_ADV_DOMAINS_REJECTION_REASON);
  });

  it('should reject the bid after failed ortb2 attr rule validation', () => {
    const reject = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
        primaryCatId: 'VALID_CAT',
        attr: 'BANNED_ATTR'
      }
    };
    config.setConfig({ortb2: {
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2'], battr: 'BANNED_ATTR'
    }});

    addBidResponseHook(call, 'adcode', bid, reject);
    sinon.assert.calledWith(reject, BID_ATTR_REJECTION_REASON);
  });
})
