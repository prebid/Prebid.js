import setPausableTimeout from '../../../../src/utils/deferredTimeout';

export const setDocumentHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('deferredTimeout', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  })

  it('should invoke callback when page is visible', () => {
    let callback = sinon.stub();
    setPausableTimeout(callback, 2000);
    clock.tick(2000);
    expect(callback.called).to.be.true;
  });

  it('should not invoke callback if page was hidden', () => {
    let callback = sinon.stub();
    setPausableTimeout(callback, 2000);
    setDocumentHidden(true);
    clock.tick(3000);
    expect(callback.called).to.be.false;
  });

  it('should defer callback execution when page is hidden', () => {
    let callback = sinon.stub();
    setPausableTimeout(callback, 4000);
    clock.tick(2000);
    setDocumentHidden(true);
    clock.tick(2000);
    setDocumentHidden(false);
    expect(callback.called).to.be.false;
    clock.tick(2000);
    expect(callback.called).to.be.true;
  });
});
