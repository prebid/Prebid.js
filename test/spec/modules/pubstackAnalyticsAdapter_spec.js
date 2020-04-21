import * as utils from 'src/utils.js';

let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');

describe('Pubstack Analytics Adapter', () => {
  const scope = utils.getWindowTop();

  beforeEach(() => {
    scope.pbstckQ = [];
    scope.PubstackAnalytics = () => scope.pbstckQ.push(arguments);
    adapterManager.enableAnalytics({
      provider: 'pubstack'
    });
  });

  afterEach(() => {
    adapter.disableAnalytics();
  });

  it('should forward all events to pbstckQ', () => {
    // Given
    const args = { string: 'whatever', number: 42 }

    // When
    events.emit(constants.EVENTS.BID_REQUESTED, args)

    // Then
    expect(scope.pbstckQ.length).to.eql(1);
    expect(scope.pbstckQ[0]).to.eql(args);
  });
});
