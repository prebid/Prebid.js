import { expect } from 'chai';
import { getWinDimensions, resetWinDimensions } from '../../../src/utils/winDimensions.js';
import { clearCache, getBoundingClientRect } from '../../../libraries/boundingClientRect/boundingClientRect.js';
import { internal } from '../../../src/utils.js';

describe('cached window dimensions', () => {
  afterEach(() => {
    resetWinDimensions();
    sinon.restore();
  });

  it('caches every document dimension and preserves offset, client and scroll measurements', () => {
    const properties = ['offsetWidth', 'offsetHeight', 'scrollWidth', 'scrollHeight', 'clientWidth', 'clientHeight', 'scrollTop', 'scrollLeft'];
    const body = {};
    const reads = properties.map((property, index) => {
      const read = sinon.stub().returns(index + 1);
      Object.defineProperty(body, property, { get: read });
      return read;
    });
    const dims = getWinDimensions({ document: { body, documentElement: body } });
    for (const element of [dims.document.body, dims.document.documentElement]) {
      properties.forEach((property, index) => {
        expect(element[property]).to.equal(index + 1);
        expect(element[property]).to.equal(index + 1);
      });
    }
    reads.forEach(read => sinon.assert.calledTwice(read));
  });

  it('keeps explicit frames separate and resets retained wrappers with element rects', () => {
    const first = { scrollY: 10, document: { body: { scrollHeight: 100 } } };
    const second = { scrollY: 20 };
    const dims = getWinDimensions(first);
    const body = dims.document.body;
    const element = { getBoundingClientRect: sinon.stub().returns({ top: 1 }) };
    expect(getWinDimensions(first)).to.equal(dims);
    expect(dims.scrollY).to.equal(10);
    expect(body.scrollHeight).to.equal(100);
    expect(getWinDimensions(second).scrollY).to.equal(20);
    expect(getBoundingClientRect(element).top).to.equal(1);
    first.scrollY = 30;
    first.document.body.scrollHeight = 200;
    element.getBoundingClientRect.returns({ top: 2 });
    expect(dims.scrollY).to.equal(10);
    clearCache();
    expect(dims.scrollY).to.equal(30);
    expect(body.scrollHeight).to.equal(200);
    expect(getBoundingClientRect(element).top).to.equal(2);
    first.scrollY = 40;
    resetWinDimensions();
    expect(dims.scrollY).to.equal(40);
  });

  it('refreshes explicit frames after the task ends', async () => {
    const win = { scrollX: 5 };
    const dims = getWinDimensions(win);
    expect(dims.scrollX).to.equal(5);
    win.scrollX = 10;
    await Promise.resolve();
    expect(dims.scrollX).to.equal(10);
  });

  it('uses the accessible top window by default and falls back when it cannot be accessed', () => {
    const top = { location: { href: 'https://example.com' }, innerWidth: 1000 };
    sinon.stub(internal, 'getWindowTop').returns(top);
    sinon.stub(internal, 'getWindowSelf').returns({ innerWidth: 300 });
    resetWinDimensions();
    expect(getWinDimensions().innerWidth).to.equal(1000);
    Object.defineProperty(top, 'location', { get() { throw new Error('cross-origin'); } });
    resetWinDimensions();
    expect(getWinDimensions().innerWidth).to.equal(300);
  });
});
