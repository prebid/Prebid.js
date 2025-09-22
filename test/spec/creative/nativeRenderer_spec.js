import {getAdMarkup, getReplacements, getReplacer} from '../../../creative/renderers/native/renderer.js';
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
      win.document = {}
      const data = {
        assets: ['1', '2'],
        ortb: 'ortb',
        rendererUrl: 'renderer'
      };
      const renderAd = sinon.stub().returns('markup');
      loadScript.returns(Promise.resolve().then(() => {
        win.renderAd = renderAd;
      }));
      return getAdMarkup('123', data, null, win, loadScript).then((markup) => {
        expect(markup).to.eql('markup');
        sinon.assert.calledWith(loadScript, data.rendererUrl, sinon.match(arg => arg === win.document));
        sinon.assert.calledWith(renderAd, sinon.match(arg => {
          expect(arg).to.have.members(data.assets);
          expect(arg.ortb).to.eql(data.ortb);
          return true;
        }));
      });
    });
    describe('otherwise, calls replacer', () => {
      let replacer, frame;
      beforeEach(() => {
        replacer = sinon.stub().returns('markup');
        frame = document.createElement('iframe');
        document.body.appendChild(frame);
        win.document = frame.contentDocument;
      });
      afterEach(() => {
        document.body.removeChild(frame);
      })
      it('with adTemplate, if present', () => {
        return getAdMarkup('123', {adTemplate: 'tpl'}, replacer, win).then((result) => {
          expect(result).to.eql('markup');
          sinon.assert.calledWith(replacer, 'tpl');
        });
      });
      it('with document body otherwise', () => {
        win.document.body.innerHTML = 'body'
        return getAdMarkup('123', {}, replacer, win).then((result) => {
          expect(result).to.eql('markup');
          sinon.assert.calledWith(replacer, 'body');
        })
      })
    })
  });

  describe('getReplacer', () => {
    function expectReplacements(replacer, replacements) {
      Object.entries(replacements).forEach(([placeholder, repl]) => {
        expect(replacer(`.${placeholder}.${placeholder}.`)).to.eql(`.${repl}.${repl}.`);
      })
    }
    it('uses empty strings for missing legacy assets', () => {
      const repl = getReplacer('123', {
        nativeKeys: {
          'k': 'hb_native_k'
        }
      });
      expectReplacements(repl, {
        '##hb_native_k##': '',
        'hb_native_k:123': ''
      })
    });

    it('uses empty string for missing ORTB assets', () => {
      const repl = getReplacer('', {
        ortb: {
          assets: [{
            id: 1,
            link: {url: 'l1'},
            data: {value: 'v1'}
          }]
        }
      });
      expectReplacements(repl, {
        '##hb_native_asset_id_1##': 'v1',
        '##hb_native_asset_id_2##': '',
        '##hb_native_asset_link_id_1##': 'l1',
        '##hb_native_asset_link_id_2##': ''
      });
    });

    it('replaces placeholders for for legacy assets', () => {
      const repl = getReplacer('123', {
        assets: [
          {key: 'k1', value: 'v1'}, {key: 'k2', value: 'v2'}
        ],
        nativeKeys: {
          k1: 'hb_native_k1',
          k2: 'hb_native_k2'
        }
      });
      expectReplacements(repl, {
        '##hb_native_k1##': 'v1',
        'hb_native_k1:123': 'v1',
        '##hb_native_k2##': 'v2',
        'hb_native_k2:123': 'v2'
      })
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
      it('replaces placeholders', () => {
        const repl = getReplacer('123', {
          ortb
        });
        expectReplacements(repl, expected);
      });
      it('gives them precedence over legacy counterparts', () => {
        const repl = getReplacer('123', {
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
        expectReplacements(repl, expected);
      });
      it('uses empty string for missing assets', () => {
        const repl = getReplacer('123', {
          ortb: {}
        });
        expectReplacements(repl, {
          '##hb_native_linkurl##': '',
          '##hb_native_privacy##': '',
        })
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
        it('replaces placeholder', () => {
          const repl = getReplacer('', {ortb});
          expectReplacements(repl, {
            '##hb_native_asset_id_123##': 'val'
          })
        });
        it('replaces link placeholders', () => {
          ortb.assets[0].link = {url: 'link'};
          const repl = getReplacer('', {ortb});
          expectReplacements(repl, {
            '##hb_native_asset_link_id_123##': 'link'
          })
        });
      });
    });
  });

  describe('render', () => {
    let getMarkup, sendMessage, adId, nativeData, exc, frame;
    beforeEach(() => {
      adId = '123';
      nativeData = {}
      getMarkup = sinon.stub();
      sendMessage = sinon.stub()
      exc = sinon.stub();
      frame = document.createElement('iframe');
      document.body.appendChild(frame);
      win.document = frame.contentDocument;
    });

    afterEach(() => {
      document.body.removeChild(frame);
    })

    function runRender() {
      return render({adId, native: nativeData}, {sendMessage, exc}, win, getMarkup)
    }

    it('replaces placeholders in head, if present', () => {
      getMarkup.returns(Promise.resolve(''))
      win.document.head.innerHTML = '##hb_native_asset_id_1##';
      nativeData.ortb = {
        assets: [
          {id: 1, data: {value: 'repl'}}
        ]
      };
      return runRender().then(() => {
        expect(win.document.head.innerHTML).to.eql('repl');
      })
    });

    it('does not replace iframes with srcdoc that contain "renderer"', () => {
      win.document.head.innerHTML = win.document.body.innerHTML = '<iframe srcdoc="renderer"></iframe>';
      getMarkup.returns(Promise.resolve(''))
      return runRender().then(() => {
        expect(Array.from(win.document.querySelectorAll('iframe[srcdoc="renderer"]')).length).to.eql(2);
      })
    })

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
        const mkNode = () => {
          const node = {
            innerHTML: '',
            childNodes: [],
            insertAdjacentHTML: () => {},
            style: {},
            querySelectorAll: () => [],
            cloneNode: () => node
          };
          return node;
        }
        win.document = {
          head: mkNode(),
          body: Object.assign(mkNode(), {
            offsetHeight: 123,
            offsetWidth: 321
          }),
          querySelectorAll: () => [],
          style: {}
        };
        getMarkup.returns(Promise.resolve('markup'));
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
      });

      it('uses scrollHeight if offsetHeight is 0', () => {
        win.document.body.offsetHeight = 0;
        win.document.documentElement = {scrollHeight: 200};
        return runRender().then(() => {
          win.onload();
          sinon.assert.calledWith(sendMessage, MESSAGE_NATIVE, sinon.match({action: ACTION_RESIZE, height: 200}))
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
