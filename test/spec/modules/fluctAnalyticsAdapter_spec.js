import * as fluctAnalyticsAdapter from 'modules/fluctAnalyticsAdapter.js';
import { expect } from 'chai';

const { getAdUnitCodeBeforeReplication, getBrowsiRefreshCount } = fluctAnalyticsAdapter;

describe('正規表現にマッチしている', () => {
  const slots = [
    { code: 'div-gpt-ad-1629864618640-0', path: '/62532913/p_fluctmagazine_320x50_surface_15377' },
    { code: 'browsi_ad_0_ai_1_rc_0', path: '/62532913/p_fluctmagazine_320x50_surface_15377' }
  ]

  it('browsi枠のリフレッシュ回数を取得できる', () => {
    const browsiAdUnit = getBrowsiRefreshCount(slots[1].code)
    expect(browsiAdUnit).to.equal('0')
  })

  it('browsi枠ではないためリフレッシュ回数を取得できない', () => {
    const browsiAdUnit = getBrowsiRefreshCount(slots[0].code)
    expect(browsiAdUnit).to.equal(undefined)
  })

  it('browsi枠codeから複製前の枠codeを取得できる', () => {
    const adUnitCode = getAdUnitCodeBeforeReplication(slots, slots[1].code)
    expect(adUnitCode).to.equal(slots[0].code)
  })
})
