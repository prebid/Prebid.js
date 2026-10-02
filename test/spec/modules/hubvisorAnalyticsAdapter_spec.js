import * as utils from 'src/utils.js';
import hubvisorAnalytics from '../../../modules/hubvisorAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import { expectEvents } from '../../helpers/analytics.js';

describe('Hubvisor Analytics Adapter', () => {
  it('Events should be bundled to hubvisor analytics', () => {
    const hubvisorAnalyticsStub = utils.getWindowSelf().hubvisorAnalytics = sinon.stub();

    adapterManager.enableAnalytics({
      provider: 'hubvisor'
    });

    expectEvents().to.beBundledTo(hubvisorAnalyticsStub);

    hubvisorAnalytics.disableAnalytics();
  });
});
