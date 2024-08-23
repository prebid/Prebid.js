import {setFocusTimeout, reset} from '../../../../src/utils/focusTimeout';

export const setDocumentHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('focusTimeout', () => {
  let clock, callback;

  beforeEach(() => {
    reset()
    clock = sinon.useFakeTimers();
    callback = sinon.spy();
  });

  afterEach(() => {
    clock.restore();
  })

  it('should invoke callback when page is visible', () => {
    setFocusTimeout(callback, 2000);
    clock.tick(2000);
    expect(callback.called).to.be.true;
  });

  it('should not choke if page starts hidden', () => {
    setDocumentHidden(true);
    reset();
    setDocumentHidden(false);
    setFocusTimeout(callback, 1000);
    clock.tick(1000);
    sinon.assert.called(callback);
  })

  it('should not invoke callback if page was hidden', () => {
    setFocusTimeout(callback, 2000);
    setDocumentHidden(true);
    clock.tick(3000);
    expect(callback.called).to.be.false;
  });

  it('should defer callback execution when page is hidden', () => {
    setFocusTimeout(callback, 4000);
    clock.tick(2000);
    setDocumentHidden(true);
    clock.tick(2000);
    setDocumentHidden(false);
    expect(callback.called).to.be.false;
    clock.tick(2000);
    expect(callback.called).to.be.true;
  });

  it('should not execute deferred callbacks again', () => {
    setDocumentHidden(true);
    setFocusTimeout(callback, 1000);
    clock.tick(2000);
    [false, true, false].forEach(setDocumentHidden);
    clock.tick(2000);
    sinon.assert.calledOnce(callback);
  });

  it('should run callbacks that expire while page is hidden', () => {
    setFocusTimeout(callback, 1000);
    clock.tick(500);
    setDocumentHidden(true);
    clock.tick(1000);
    setDocumentHidden(false);
    sinon.assert.notCalled(callback);
    clock.tick(1000);
    sinon.assert.called(callback);
  })

  it('should return updated timerId after page was showed again', () => {
    const getCurrentTimerId = setFocusTimeout(callback, 4000);
    const oldTimerId = getCurrentTimerId();
    clock.tick(2000);
    setDocumentHidden(true);
    clock.tick(2000);
    setDocumentHidden(false);
    const newTimerId = getCurrentTimerId();
    expect(oldTimerId).to.not.equal(newTimerId);
  });
});
