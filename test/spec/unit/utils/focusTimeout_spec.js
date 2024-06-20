import setFocusTimeout from '../../../../src/utils/focusTimeout';

export const setDocumentHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('focusTimeout', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  })

  it('should invoke callback when page is visible', () => {
    let callback = sinon.stub();
    setFocusTimeout(callback, 2000);
    clock.tick(2000);
    expect(callback.called).to.be.true;
  });

  it('should not invoke callback if page was hidden', () => {
    let callback = sinon.stub();
    setFocusTimeout(callback, 2000);
    setDocumentHidden(true);
    clock.tick(3000);
    expect(callback.called).to.be.false;
  });

  it('should defer callback execution when page is hidden', () => {
    let callback = sinon.stub();
    setFocusTimeout(callback, 4000);
    clock.tick(2000);
    setDocumentHidden(true);
    clock.tick(2000);
    setDocumentHidden(false);
    expect(callback.called).to.be.false;
    clock.tick(2000);
    expect(callback.called).to.be.true;
  });

  it('should return updated timerId after page was showed again', () => {
    let callback = sinon.stub();
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
