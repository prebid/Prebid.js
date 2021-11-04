import fluctAnalyticsAdapter, {
  getAdUnitCodeBeforeReplication,
  getBrowsiRefreshCount
} from '../../../modules/fluctAnalyticsAdapter';
import { expect } from 'chai';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js'
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import * as mockGpt from '../integration/faker/googletag.js';
import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency.js';

describe('正規表現にマッチしている', () => {
  const slots = {
    'div-gpt-ad-1629864618640-0': '/62532913/p_fluctmagazine_320x50_surface_15377',
    'browsi_ad_0_ai_1_rc_0': '/62532913/p_fluctmagazine_320x50_surface_15377'
  }

  it('browsi枠のリフレッシュ回数を取得できる', () => {
    const browsiAdUnit = getBrowsiRefreshCount('browsi_ad_0_ai_1_rc_0')
    expect(browsiAdUnit).to.equal('0')
  })

  it('browsi枠ではないためリフレッシュ回数を取得できない', () => {
    const browsiAdUnit = getBrowsiRefreshCount('div-gpt-ad-1629864618640-0')
    expect(browsiAdUnit).to.equal(undefined)
  })

  it('browsi枠codeから複製前の枠codeを取得できる', () => {
    const adUnitCode = getAdUnitCodeBeforeReplication(slots, 'browsi_ad_0_ai_1_rc_0')
    expect(adUnitCode).to.equal('div-gpt-ad-1629864618640-0')
  })

  it('browsi枠ではない枠codeは変化しない', () => {
    const adUnitCode = getAdUnitCodeBeforeReplication(slots, 'div-gpt-ad-1629864618640-0')
    expect(adUnitCode).to.equal('div-gpt-ad-1629864618640-0')
  })
})

describe('fluct analytics adapter', () => {
  let sandbox;
  beforeEach(() => {
    mockGpt.disable();
    sandbox = sinon.sandbox.create();
    config.setConfig({
    })
  });

  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
    mockGpt.enable();
  });

  it('enableAnalyticsの引数内にoptionsを必要としない', () => {
    fluctAnalyticsAdapter.enableAnalytics({});
    expect(fluctAnalyticsAdapter.initOptions).to.equal(undefined);
  });
});
