import * as utils from 'src/utils.js';
import { expect } from 'chai';
import optimonAnalyticsAdapter from '../../../modules/optimonAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import * as events from 'src/events';
import constants from 'src/constants.json'

const AD_UNIT_CODE = 'demo-adunit-1';
const PUBLISHER_CONFIG = {
  pubId: 'optimon_test',
  pubAdxAccount: 123456789,
  pubTimezone: 'Asia/Jerusalem'
};

describe('Optimon Analytics Adapter', () => {
  const optmn_currentWindow = utils.getWindowSelf();
  let optmn_queue = [];

  beforeEach(() => {
    optmn_currentWindow.OptimonAnalyticsAdapter = (...optmn_args) => optmn_queue.push(optmn_args);
    adapterManager.enableAnalytics({
      provider: 'optimon'
    });
    optmn_queue = []
  });

  afterEach(() => {
    optimonAnalyticsAdapter.disableAnalytics();
  });

  it('should forward all events to the queue', () => {
    const optmn_arguments = [AD_UNIT_CODE, PUBLISHER_CONFIG];

    events.emit(constants.EVENTS.AUCTION_END, optmn_arguments)
    events.emit(constants.EVENTS.BID_TIMEOUT, optmn_arguments)
    events.emit(constants.EVENTS.BID_WON, optmn_arguments)

    expect(optmn_queue.length).to.eql(3);
  });
});
