import * as utils from 'src/utils.js';
import pubstackAnalytics from '../../../modules/pubstackAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import * as events from 'src/events';
import {expectEvents} from '../../helpers/analytics.js';

describe('Pubstack Analytics Adapter', () => {
  const scope = utils.getWindowSelf();

  beforeEach(() => {
    scope.PubstackAnalytics = sinon.stub();
    adapterManager.enableAnalytics({
      provider: 'pubstack'
    });
  });

  afterEach(() => {
    pubstackAnalytics.disableAnalytics();
  });

  it('should forward all events to the queue', () => {
    expectEvents().to.beBundledTo(scope.PubstackAnalytics);
  });
});
