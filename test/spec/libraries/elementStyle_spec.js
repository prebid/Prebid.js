import { expect } from 'chai';
import { getElementStyle } from '../../../libraries/elementStyle/elementStyle.js';
import { endLayoutEpoch } from '../../../src/utils/layoutEpoch.js';

describe('getElementStyle', () => {
  afterEach(() => endLayoutEpoch());

  it('snapshots visibility and positioning properties for each element and window', () => {
    const style = { display: 'block', visibility: 'visible', position: 'static' };
    const win = { getComputedStyle: sinon.stub().returns(style) };
    const element = { ownerDocument: { defaultView: win } };
    expect(getElementStyle(element)).to.deep.equal(style);
    style.display = 'none';
    expect(getElementStyle(element).display).to.equal('block');
    sinon.assert.calledOnce(win.getComputedStyle);
    const otherWindow = { getComputedStyle: sinon.stub().returns(style) };
    expect(getElementStyle(element, otherWindow).display).to.equal('none');
    expect(getElementStyle({ ownerDocument: { defaultView: win } }).display).to.equal('none');
    endLayoutEpoch();
    expect(getElementStyle(element).display).to.equal('none');
  });

  it('expires at the end of the task', async () => {
    const win = { getComputedStyle: sinon.stub().returns({ display: 'block' }) };
    const element = {};
    getElementStyle(element, win);
    await Promise.resolve();
    getElementStyle(element, win);
    sinon.assert.calledTwice(win.getComputedStyle);
  });

  it('defaults to this window for elements without an owner document', () => {
    const readStyle = sinon.stub(window, 'getComputedStyle').returns({ display: 'block' });
    try {
      expect(getElementStyle({}).display).to.equal('block');
      sinon.assert.calledOnce(readStyle);
    } finally {
      readStyle.restore();
    }
  });
});
