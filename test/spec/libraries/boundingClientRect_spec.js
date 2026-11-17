import { clearCache, getBoundingClientRect, getElementDimensions } from '../../../libraries/boundingClientRect/boundingClientRect.js';
import { endLayoutEpoch } from '../../../src/utils/layoutEpoch.js';

describe('getBoundingClientRect', () => {
  let element, getBoundingClientRectSpy;

  beforeEach(() => {
    endLayoutEpoch();
    element = document.createElement('div');
    getBoundingClientRectSpy = sinon.spy(element, 'getBoundingClientRect');
  });

  afterEach(() => {
    getBoundingClientRectSpy.restore();
  });

  it('should fire getBoundingClientRect on element initially', () => {
    getBoundingClientRect(element);
    expect(getBoundingClientRectSpy.calledOnce).to.equal(true);
  });

  it('should not fire getBoundingClientRect twice for the same element', () => {
    getBoundingClientRect(element);
    getBoundingClientRect(element);
    expect(getBoundingClientRectSpy.callCount).to.equal(1);
  });

  it('should fire getBoundingClientRect on element again once the layout epoch has ended', () => {
    getBoundingClientRect(element);
    endLayoutEpoch();
    getBoundingClientRect(element);
    expect(getBoundingClientRectSpy.callCount).to.equal(2);
  });

  it('should fire getBoundingClientRect on element again once the task that measured it has ended', async () => {
    getBoundingClientRect(element);
    await new Promise(resolve => setTimeout(resolve));
    getBoundingClientRect(element);
    expect(getBoundingClientRectSpy.callCount).to.equal(2);
  });

  it('should return same value for multiple calls', () => {
    const expectedWidth = 200;
    const expectedHeight = 300;
    element.style.width = expectedWidth + 'px';
    element.style.height = expectedHeight + 'px';
    document.body.append(element);

    const result1 = getBoundingClientRect(element);

    expect(result1.width).to.deep.eql(expectedWidth);
    expect(result1.height).to.deep.eql(expectedHeight);

    const result2 = getBoundingClientRect(element);

    expect(result2).to.deep.eql(result1);

    document.body.removeChild(element);
  });
});

describe('getElementDimensions', () => {
  afterEach(() => clearCache());

  it('preserves untransformed border-box dimensions and caches them until the epoch ends', () => {
    let width = 300;
    const readWidth = sinon.spy(() => width);
    const element = {
      get offsetWidth() { return readWidth(); },
      get offsetHeight() { return 250; },
      getBoundingClientRect: () => ({ width: 150, height: 125 })
    };
    expect(getElementDimensions(element)).to.deep.equal({ width: 300, height: 250 });
    width = 400;
    expect(getElementDimensions(element).width).to.equal(300);
    sinon.assert.calledOnce(readWidth);
    clearCache();
    expect(getElementDimensions(element).width).to.equal(400);
    sinon.assert.calledTwice(readWidth);
  });

  it('keeps elements separate and refreshes after the task ends', async () => {
    const first = { offsetWidth: 1, offsetHeight: 2 };
    const second = { offsetWidth: 3, offsetHeight: 4 };
    expect(getElementDimensions(first).width).to.equal(1);
    expect(getElementDimensions(second).width).to.equal(3);
    first.offsetWidth = 5;
    await Promise.resolve();
    expect(getElementDimensions(first).width).to.equal(5);
  });
});
