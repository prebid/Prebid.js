import * as utils from 'src/utils.js';

import optimonAnalyticsAdapter from '../../../modules/optimonAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import 'src/events';
import { expectEvents } from '../../helpers/analytics.js';

describe('Optimon Analytics Adapter', () => {
  const optmn_currentWindow = utils.getWindowSelf();

  beforeEach(() => {
    optmn_currentWindow.OptimonAnalyticsAdapter = sinon.stub();
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
