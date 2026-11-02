import * as logging from 'src/utils/logging.js';
import { _setEventEmitter, prefixLog } from 'src/utils/logging.js';
import { setLogEventEmitter } from 'src/events.js';
import { EVENTS } from '../../../src/constants.js';
import { config } from 'src/config.js';

describe('logging utils', () => {
  [
    ['logWarn', 'WARNING'],
    ['logError', 'ERROR']
  ].forEach(([method, level]) => {
    Object.entries({
      'top level util': logging[method],
      'prefixLog': (() => {
        const prefix = prefixLog('test');
        return prefix[method].bind(prefix);
      })()
    }).forEach(([desc, fn]) => {
      describe(`${method} from ${desc}`, () => {
        let mockEmit;
        beforeEach(() => {
          mockEmit = sinon.stub();
          _setEventEmitter(mockEmit);
        });
        afterEach(() => {
          setLogEventEmitter();
        });
        it('should emit AUCTION_DEBUG event', () => {
          fn('message');
          sinon.assert.calledOnce(mockEmit);
          sinon.assert.calledWith(mockEmit, EVENTS.AUCTION_DEBUG, sinon.match({
            type: level,
            arguments: sinon.match(args => args.includes('message')),
            bidder: null
          }));
        });
        it('should include bidder, when run in a bidder context', () => {
          config.runWithBidder('mockBidder', () => {
            fn('message');
            sinon.assert.calledWith(mockEmit, EVENTS.AUCTION_DEBUG, sinon.match({
              type: level,
              bidder: 'mockBidder',
            }));
          });
        });
      });
    });
  });
});
