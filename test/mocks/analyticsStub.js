import {_internal} from '../../libraries/analyticsAdapter/AnalyticsAdapter.js';

before(() => {
  // stub out analytics networking to avoid random events polluting the global xhr mock
  disableAjaxForAnalytics();
})

export function disableAjaxForAnalytics() {
  sinon.stub(_internal, 'ajax').callsFake(() => null);
}
export function enableAjaxForAnalytics() {
  _internal.ajax.restore();
}
