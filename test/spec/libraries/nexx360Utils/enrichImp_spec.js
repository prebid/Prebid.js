import { expect } from 'chai';
import { enrichImp } from '../../../../libraries/nexx360Utils/index.js';

// Minimal bidRequest carrying the ad-unit level mediaTypes.video.
const makeBidRequest = (video) => ({
  adUnitCode: 'div-gpt-1',
  params: {},
  mediaTypes: { video },
});

describe('nexx360Utils enrichImp video.ext.playerSize', () => {
  it('keeps video.ext.playerSize in sync with the resolved imp.video.w/h (override honored)', () => {
    const imp = { video: { w: 640, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [[854, 480]], context: 'instream' }));
    expect(imp.video.ext.playerSize[0]).to.deep.equal([640, 480]);
    // both size sources now agree on the primary size
    expect([imp.video.w, imp.video.h]).to.deep.equal(imp.video.ext.playerSize[0]);
  });

  it('preserves additional declared sizes after the resolved primary size, de-duplicated', () => {
    const imp = { video: { w: 640, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [[854, 480], [640, 480], [300, 250]] }));
    expect(imp.video.ext.playerSize).to.deep.equal([[640, 480], [854, 480], [300, 250]]);
  });

  it('normalizes a flat playerSize into an array of size tuples', () => {
    const imp = { video: { w: 640, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [640, 480] }));
    expect(imp.video.ext.playerSize).to.deep.equal([[640, 480]]);
  });

  it('falls back to declared sizes when the imp has no resolved w/h', () => {
    const imp = { video: {} };
    enrichImp(imp, makeBidRequest({ playerSize: [[854, 480]] }));
    expect(imp.video.ext.playerSize).to.deep.equal([[854, 480]]);
  });

  it('writes video.ext.context from mediaTypes.video.context', () => {
    const imp = { video: { w: 640, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [[640, 480]], context: 'outstream' }));
    expect(imp.video.ext.context).to.equal('outstream');
  });

  it('does not write undefined playerSize/context keys when the ad unit declared none', () => {
    const imp = { video: {} };
    enrichImp(imp, makeBidRequest({}));
    const ext = imp.video.ext || {};
    expect(ext).to.not.have.property('playerSize');
    expect(ext).to.not.have.property('context');
  });
});
