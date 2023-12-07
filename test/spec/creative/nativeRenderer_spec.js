import {getAdMarkup, getReplacements, replace} from '../../../creative/renderers/native/renderer.js';
import {ACTION_CLICK, ACTION_IMP, ACTION_RESIZE, MESSAGE_NATIVE} from '../../../creative/renderers/native/constants.js';

describe('Native creative renderer', () => {
  let win;
  beforeEach(() => {
    win = {};
  });

  describe('getAdMarkup', () => {
    let loadScript;
    beforeEach(() => {
      loadScript = sinon.stub();
    });
    it('uses rendererUrl if present', () => {
      const data = {
        assets: ['1', '2'],
        ortb: 'ortb',
        rendererUrl: 'renderer'
      };
      const renderAd = sinon.stub().returns('markup');
      loadScript.returns(Promise.resolve().then(() => {
        win.renderAd = renderAd;
      }));
      return getAdMarkup('123', data, win, loadScript).then((markup) => {
        expect(markup).to.eql('markup');
        sinon.assert.calledWith(loadScript, data.rendererUrl, win);
        sinon.assert.calledWith(renderAd, sinon.match(arg => {
          expect(arg).to.have.members(data.assets);
          expect(arg.ortb).to.eql(data.ortb);
          return true;
        }));
      });
    });
  });

  describe('getReplacements', () => {
    it('generates empty entries for missing assets', () => {
      const repl = getReplacements('123', {
        nativeKeys: {
          'k': 'hb_native_k'
        }
      });
      expect(repl).to.eql({
        '##hb_native_k##': undefined,
        'hb_native_k:123': undefined
      });
    });
    it('generates entries for legacy assets', () => {
      const repl = getReplacements('123', {
        assets: [
          {key: 'k1', value: 'v1'}, {key: 'k2', value: 'v2'}
        ],
        nativeKeys: {
          k1: 'hb_native_k1',
          k2: 'hb_native_k2'
        }
      });
      expect(repl).to.eql({
        '##hb_native_k1##': 'v1',
        'hb_native_k1:123': 'v1',
        '##hb_native_k2##': 'v2',
        'hb_native_k2:123': 'v2'
      });
    });

    describe('ORTB response top-level (non-asset) fields', () => {
      const ortb = {
        link: {
          url: 'link.url'
        },
        privacy: 'privacy.url'
      };
      const expected = {
        '##hb_native_linkurl##': 'link.url',
        '##hb_native_privacy##': 'privacy.url'
      };
      it('generate entries', () => {
        const repl = getReplacements('123', {
          ortb
        });
        sinon.assert.match(repl, expected);
      });
      it('take precedence over legacy counterparts', () => {
        const repl = getReplacements('123', {
          ortb,
          assets: [
            {key: 'clickUrl', value: 'overridden'},
            {key: 'privacyLink', value: 'overridden'}
          ],
          nativeKeys: {
            clickUrl: 'hb_native_linkurl',
            privacyLink: 'hb_native_privacy'
          }
        });
        sinon.assert.match(repl, expected);
      });
      it('generate empty entries', () => {
        const repl = getReplacements('123', {
          ortb: {}
        });
        expect(repl).to.eql({
          '##hb_native_linkurl##': undefined,
          '##hb_native_privacy##': undefined,
        });
      });
    });

    Object.entries({
      title: {text: 'val'},
      data: {value: 'val'},
      img: {url: 'val'},
      video: {vasttag: 'val'}
    }).forEach(([type, contents]) => {
      describe(`for ortb ${type} asset`, () => {
        let ortb;
        beforeEach(() => {
          ortb = {
            assets: [
              {
                id: 123,
                [type]: contents
              }
            ]
          };
        });
        it('generates entries', () => {
          const repl = getReplacements('', {ortb});
          expect(repl['##hb_native_asset_id_123##']).to.eql('val');
        });
        it('generates link entries', () => {
          ortb.assets[0].link = {url: 'link'};
          const repl = getReplacements('', {ortb});
          expect(repl['##hb_native_asset_link_id_123##']).to.eql('link');
        });
      });
    });
  });

  describe('replace', () => {
    it('replaces values', () => {
      const result = replace('pre?middle?post', {'?': '.'});
      expect(result).to.eql('pre.middle.post');
    });
    it('defaults to empty string', () => {
      const result = replace('pre?post', {'?': undefined});
      expect(result).to.eql('prepost');
    });
    it('uses empty string for missing asset id placeholders', () => {
      const repl = {
        '##hb_native_asset_id_1##': 'v1',
        '##hb_native_asset_link_id_1##': 'l1'
      };
      const template = '.##hb_native_asset_id_1##.##hb_native_asset_id_2##.##hb_native_asset_link_id_1##.##hb_native_asset_link_id_2##';
      expect(replace(template, repl)).to.eql('.v1..l1.');
    });
  });

  describe('render', () => {
    let getMarkup, sendMessage, adId, nativeData, exc;
    beforeEach(() => {
      adId = '123';
      nativeData = {}
      getMarkup = sinon.stub();
      sendMessage = sinon.stub()
      exc = sinon.stub();
      win.document = {
        querySelectorAll() { return [] },
        body: {}
      }
    });

    function runRender() {
      return render({adId, native: nativeData}, {sendMessage, exc}, win, getMarkup)
    }

    it('drops markup on body, and fires imp trackers', () => {
      getMarkup.returns(Promise.resolve('markup'));
      return runRender().then(() => {
        expect(win.document.body.innerHTML).to.eql('markup');
        sinon.assert.calledWith(sendMessage, MESSAGE_NATIVE, {action: ACTION_IMP});
      })
    });

    it('runs postRenderAd if defined', () => {
      win.postRenderAd = sinon.stub();
      getMarkup.returns(Promise.resolve('markup'));
      return runRender().then(() => {
        sinon.assert.calledWith(win.postRenderAd, sinon.match({
          adId,
          ...nativeData
        }))
      })
    })

    it('rejects on error', (done) => {
      const err = new Error('failure');
      getMarkup.returns(Promise.reject(err));
      runRender().catch((e) => {
        expect(e).to.eql(err);
        done();
      })
    });

    describe('requests resize', () => {
      beforeEach(() => {
        getMarkup.returns(Promise.resolve('markup'));
        win.document.body.offsetHeight = 123;
        win.document.body.offsetWidth = 321;
      });

      it('immediately, if document is loaded', () => {
        win.document.readyState = 'complete';
        return runRender().then(() => {
          sinon.assert.calledWith(sendMessage, MESSAGE_NATIVE, {action: ACTION_RESIZE, height: 123, width: 321})
        })
      });

      it('on document load otherwise', () => {
        return runRender().then(() => {
          sinon.assert.neverCalledWith(sendMessage, MESSAGE_NATIVE, sinon.match({action: ACTION_RESIZE}));
          win.onload();
          sinon.assert.calledWith(sendMessage, MESSAGE_NATIVE, {action: ACTION_RESIZE, height: 123, width: 321});
        })
      })
    })

    describe('click trackers', () => {
      let iframe;
      beforeEach(() => {
        iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        win.document = iframe.contentDocument;
      })
      afterEach(() => {
        document.body.removeChild(iframe);
      })

      it('are fired on click', () => {
        getMarkup.returns(Promise.resolve('<div class="pb-click"><div id="target"></div></div>'));
        return runRender().then(() => {
          win.document.querySelector('#target').click();
          sinon.assert.calledWith(sendMessage, MESSAGE_NATIVE, sinon.match({action: ACTION_CLICK}));
        })
      });

      it('pass assetId if provided', () => {
        getMarkup.returns(Promise.resolve('<div class="pb-click" hb_native_asset_id="123" id="target"></div>'));
        return runRender().then(() => {
          win.document.querySelector('#target').click();
          sinon.assert.calledWith(sendMessage, MESSAGE_NATIVE, {action: ACTION_CLICK, assetId: '123'})
        });
      });
    });
  });
});
