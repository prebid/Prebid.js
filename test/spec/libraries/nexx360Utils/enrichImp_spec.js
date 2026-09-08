import { expect } from 'chai';
import { enrichImp } from '../../../../libraries/nexx360Utils/index.js';

// Minimal bidRequest carrying the ad-unit level mediaTypes.video.
const makeBidRequest = (video) => ({
  adUnitCode: 'div-gpt-1',
  params: {},
  mediaTypes: { video },
});

describe('nexx360Utils enrichImp video.ext.playerSize', () => {
  it('reflects the resolved imp.video.w/h when an override diverges from the declared size', () => {
    // converter resolved 640x480 onto the imp, ad unit declared 854x480
    const imp = { video: { w: 640, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [[854, 480]], context: 'instream' }));
    expect(imp.video.ext.playerSize).to.deep.equal([640, 480]);
    expect(imp.video.ext.playerSize).to.deep.equal([imp.video.w, imp.video.h]);
  });

  it('forwards a single declared size unchanged (established flat wire shape) when not overridden', () => {
    const imp = { video: { w: 640, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [640, 480] }));
    expect(imp.video.ext.playerSize).to.deep.equal([640, 480]);
  });

  it('forwards a multi-size declaration unchanged when not overridden', () => {
    const imp = { video: { w: 854, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [[854, 480], [300, 250]] }));
    expect(imp.video.ext.playerSize).to.deep.equal([[854, 480], [300, 250]]);
  });

  it('forwards the declared size when the imp has no resolved w/h', () => {
    const imp = { video: {} };
    enrichImp(imp, makeBidRequest({ playerSize: [[854, 480]] }));
    expect(imp.video.ext.playerSize).to.deep.equal([[854, 480]]);
  });

  it('writes video.ext.context from mediaTypes.video.context', () => {
    const imp = { video: { w: 640, h: 480 } };
    enrichImp(imp, makeBidRequest({ playerSize: [640, 480], context: 'outstream' }));
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
