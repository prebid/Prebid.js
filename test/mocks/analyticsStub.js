import {_internal, setDebounceDelay} from '../../libraries/analyticsAdapter/AnalyticsAdapter.js';

before(() => {
  // stub out analytics networking to avoid random events polluting the global xhr mock
  disableAjaxForAnalytics();
  // make analytics event handling synchronous
  setDebounceDelay(0);
})

export function disableAjaxForAnalytics() {
  sinon.stub(_internal, 'ajax').callsFake(() => null);
}
export function enableAjaxForAnalytics() {
  _internal.ajax.restore();
}
