import * as equativUtils from "../../../../libraries/equativUtils/equativUtils.js";
import { storage } from "../../../../modules/equativBidAdapter.js";

describe('equativUtils', () => {
  describe('prepareSplitImps', () => {
    let imp, bid;

    beforeEach(() => {
      imp = {
        id: 'abcd1234',
        banner: {
          topframe: 1,
          pos: 1,
          format: [
            {
              w: 10,
              h: 10,
            }
          ]
        },
      }

      bid = {
        params: {
          bidfloor: 2.0
        }
      }
    })

    it('should not set pos and topframe properties for imp in case of Equativ adapter', () => {
      const result = equativUtils.prepareSplitImps([imp], bid, 'USD', {}, 'eqtv')[0];

      expect(result.banner.pos).to.be.undefined;
      expect(result.banner.topframe).to.be.undefined;
    })

    it('should set pos and topframe properties for imp in case of Sharethrough adapter', () => {
      const result = equativUtils.prepareSplitImps([imp], bid, 'USD', {}, 'stx')[0];

      expect(result.banner.pos).to.equal(1);
      expect(result.banner.topframe).to.equal(1);
    })
  })

  describe('handleCookieSync', () => {
    let setDataInLocalStorageStub;
    let addEventListenerStub;
    let messageHandler;

    const SAMPLE_RESPONSE = {
      body: {
        id: '12h712u7-k22g-8124-ab7a-h268s22dy271',
        seatbid: [
          {
            bid: [
              {
                id: '1bh7jku7-ko2g-8654-ab72-h268shvwy271',
                impid: 'r12gwgf231',
                price: 0.6565,
                adm: '<h1>AD</h1>',
                adomain: ['abc.com'],
                cid: '1242512',
                crid: '535231',
                w: 300,
                h: 600,
                mtype: 1,
                cat: ['IAB19', 'IAB19-1'],
                cattax: 1,
              },
            ],
            seat: '4212',
          },
        ],
        cur: 'USD',
        statuscode: 0,
      },
    };

    beforeEach(() => {
      setDataInLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
      addEventListenerStub = sinon.stub(window, 'addEventListener').callsFake((type, handler) => {
        if (type === 'message') {
          messageHandler = handler;
        }
        return addEventListenerStub.wrappedMethod.call(this, type, handler);
      });
    });
    afterEach(() => {
      setDataInLocalStorageStub.restore();
      addEventListenerStub.restore();
    });

    it('should return empty array if iframe sync not enabled', () => {
      const syncs = equativUtils.handleCookieSync({}, SAMPLE_RESPONSE, {}, 73, storage);
      expect(syncs).to.deep.equal([]);
    });

    it('should retrieve and save user pid', (done) => {
      equativUtils.handleCookieSync(
        { iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: true, vendorData: { vendor: { consents: {} } } },
        73,
        storage
      );

      messageHandler.call(window, {
        origin: 'https://apps.smartadserver.com',
        data: { action: 'getConsent', pid: '7767825890726' },
        source: { postMessage: sinon.stub() }
      });

      expect(setDataInLocalStorageStub.calledOnce).to.be.true;
      expect(setDataInLocalStorageStub.calledWith('eqt_pid', '7767825890726')).to.be.true;
      done();
    });

    it('should not save user pid coming from incorrect origin', (done) => {
      equativUtils.handleCookieSync(
        { iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: true, vendorData: { vendor: { consents: {} } } },
        73,
        storage
      );

      messageHandler.call(window, {
        origin: 'https://another-origin.com',
        data: { action: 'getConsent', pid: '7767825890726' },
        source: { postMessage: sinon.stub() }
      });

      expect(setDataInLocalStorageStub.notCalled).to.be.true;
      done();
    });

    it('should not save empty pid', (done) => {
      equativUtils.handleCookieSync(
        { iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: true, vendorData: { vendor: { consents: {} } } },
        73,
        storage
      );

      messageHandler.call(window, {
        origin: 'https://apps.smartadserver.com',
        data: { action: 'getConsent', pid: '' },
        source: { postMessage: sinon.stub() }
      });

      expect(setDataInLocalStorageStub.notCalled).to.be.true;
      done();
    });

    it('should return array including iframe cookie sync object (gdprApplies=true)', () => {
      const syncs = equativUtils.handleCookieSync(
        { iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: true },
        73,
        storage
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0]).to.deep.equal({
        type: 'iframe',
        url: 'https://apps.smartadserver.com/diff/templates/asset/csync.html?nwid=73&gdpr=1&'
      });
    });

    it('should return array including iframe cookie sync object (gdprApplies=false)', () => {
      const syncs = equativUtils.handleCookieSync(
        { iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: false },
        73,
        storage
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0]).to.deep.equal({
        type: 'iframe',
        url: 'https://apps.smartadserver.com/diff/templates/asset/csync.html?nwid=73&gdpr=0&'
      });
    });
  });
})
