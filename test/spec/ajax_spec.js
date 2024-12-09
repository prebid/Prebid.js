import { expect } from 'chai';
import { sendBeacon } from '../../src/ajax.js'

describe('test sendBeacon wrapper', () => {
  it('with legitimate behaviour', () => {
    sinon.stub(navigator, 'sendBeacon').returns(true);
    expect(sendBeacon('http://localhost:80/')).to.equal(true);
    expect(navigator.sendBeacon.callCount).to.equal(1);
    navigator.sendBeacon.restore();
  })
})
