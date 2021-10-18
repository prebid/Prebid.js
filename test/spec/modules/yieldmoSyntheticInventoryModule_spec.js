import { expect } from 'chai';
import {
  init,
  MODULE_NAME,
  validateConfig
} from 'modules/yieldmoSyntheticInventoryModule';

const mockedYmConfig = {
  placementId: '123456',
  adUnitPath: '/6355419/ad_unit_name_used_in_gam'
};

const setGoogletag = () => {
  window.top.googletag = {
    cmd: [],
    defineSlot: sinon.stub(),
    addService: sinon.stub(),
    pubads: sinon.stub(),
    setTargeting: sinon.stub(),
    enableServices: sinon.stub(),
    display: sinon.stub(),
  };
  window.top.googletag.defineSlot.returns(window.top.googletag);
  window.top.googletag.addService.returns(window.top.googletag);
  return window.top.googletag;
}

describe('Yieldmo Synthetic Inventory Module', function() {
  let config = Object.assign({}, mockedYmConfig);

  beforeEach(function () {
    delete window.top.googletag;
  });

  afterEach(function () {
    delete window.top.googletag;
  });

  it('should be enabled with valid required params', function() {
    expect(function () {
      init(mockedYmConfig);
    }).not.to.throw()
  });

  it('should throw an error if placementId is missed', function() {
    const {placementId, ...config} = mockedYmConfig;

    expect(function () {
      validateConfig(config);
    }).throw(`${MODULE_NAME}: placementId required`)
  });

  it('should throw an error if adUnitPath is missed', function() {
    const {adUnitPath, ...config} = mockedYmConfig;

    expect(function () {
      validateConfig(config);
    }).throw(`${MODULE_NAME}: adUnitPath required`)
  });

  it('should add correct googletag.cmd', function() {
    const containerName = 'ym_sim_container_' + mockedYmConfig.placementId;
    const gtag = setGoogletag();

    init(mockedYmConfig);

    expect(gtag.cmd.length).to.equal(1);

    gtag.cmd[0]();

    expect(gtag.addService.getCall(0)).to.not.be.null;
    expect(gtag.setTargeting.getCall(0)).to.not.be.null;
    expect(gtag.setTargeting.getCall(0).args[0]).to.exist.and.to.equal('ym_sim_p_id');
    expect(gtag.setTargeting.getCall(0).args[1]).to.exist.and.to.equal(mockedYmConfig.placementId);
    expect(gtag.defineSlot.getCall(0)).to.not.be.null;
    expect(gtag.enableServices.getCall(0)).to.not.be.null;
    expect(gtag.display.getCall(0)).to.not.be.null;
    expect(gtag.display.getCall(0).args[0]).to.exist.and.to.equal(containerName);
    expect(gtag.pubads.getCall(0)).to.not.be.null;

    const gamContainerEl = window.top.document.getElementById(containerName);
    expect(gamContainerEl).to.not.be.null;

    gamContainerEl.parentNode.removeChild(gamContainerEl);
  });
});
