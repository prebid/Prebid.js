import {timeoutQueue} from '../../../libraries/timeoutQueue/timeoutQueue.js';
import {expect} from 'chai/index.js';

describe('timeoutQueue', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('calls onTimeout when not resumed', () => {
    const q = timeoutQueue();
    const spyResume = sinon.spy();
    const spyTimeout = sinon.spy();
    q.submit(50, spyResume, spyTimeout);
    clock.tick(60);
    expect(spyTimeout.calledOnce).to.equal(true);
    expect(spyResume.called).to.equal(false);
  });

  it('calls onResume when resumed before timeout', () => {
    const q = timeoutQueue();
    const spyResume = sinon.spy();
    const spyTimeout = sinon.spy();
    q.submit(50, spyResume, spyTimeout);
    q.resume();
    expect(spyResume.calledOnce).to.equal(true);
    expect(spyTimeout.called).to.equal(false);
  });

  it('resumes items in order', () => {
    const q = timeoutQueue();
    const order = [];
    q.submit(100, () => order.push(1), () => {});
    q.submit(100, () => order.push(2), () => {});
    q.resume();
    expect(order).to.deep.equal([1, 2]);
  });
});
