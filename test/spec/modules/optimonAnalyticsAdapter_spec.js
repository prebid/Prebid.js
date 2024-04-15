import * as utils from 'src/utils.js';
import { expect } from 'chai';
import optimonAnalyticsAdapter from '../../../modules/optimonAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import * as events from 'src/events';
import {expectEvents} from '../../helpers/analytics.js';

const AD_UNIT_CODE = 'demo-adunit-1';
const PUBLISHER_CONFIG = {
  pubId: 'optimon_test',
  pubAdxAccount: 123456789,
  pubTimezone: 'Asia/Jerusalem'
};

describe('Optimon Analytics Adapter', () => {
  const optmn_currentWindow = utils.getWindowSelf();

  beforeEach(() => {
    optmn_currentWindow.OptimonAnalyticsAdapter = sinon.stub()
    adapterManager.enableAnalytics({
      provider: 'optimon'
    });
  });

  afterEach(() => {
    optimonAnalyticsAdapter.disableAnalytics();
  });

  it('should forward all events to the queue', () => {
    expectEvents().to.beBundledTo(optmn_currentWindow.OptimonAnalyticsAdapter);
  });
});
