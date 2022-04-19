import { expect, assert } from 'chai';
import { spec } from 'modules/jwplayerBidAdapter.js';
import { config } from 'src/config.js';

describe('jwplayer adapter tests', function() {
    var sandbox, clock, frozenNow = new Date();

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
        clock = sinon.useFakeTimers(frozenNow.getTime());
    });

    afterEach(function() {
        sandbox.restore();
        clock.restore();
    });

    describe('isBidRequestValid', function() {});

    describe('buildRequests for video', function() {});

    describe('interpretResponse for video', function() {});

    describe('user sync handler', function() {});
});
