import { mgidSubmodule, storage } from '../../../modules/mgidRtdProvider.js';
import {expect} from 'chai';
import * as refererDetection from '../../../src/refererDetection';

describe('Mgid RTD submodule', () => {
  let server;
  let clock;
  let getRefererInfoStub;
  let getDataFromLocalStorageStub;

  beforeEach(() => {
    server = sinon.fakeServer.create();

    clock = sinon.useFakeTimers();

    getRefererInfoStub = sinon.stub(refererDetection, 'getRefererInfo');
    getRefererInfoStub.returns({
      canonicalUrl: 'https://www.test.com/abc'
    });

    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage').returns('qwerty654321');
  });

  afterEach(() => {
    server.restore();
    clock.restore();
    getRefererInfoStub.restore();
    getDataFromLocalStorageStub.restore();
  });

  it('init is successfull, when clientSiteId is defined', () => {
    expect(mgidSubmodule.init({params: {clientSiteId: 123}})).to.be.true;
  });

  it('init is unsuccessfull, when clientSiteId is not defined', () => {
    expect(mgidSubmodule.init({})).to.be.false;
  });

  it('getBidRequestData send all params to our endpoint and succesfully modifies ortb2', () => {
    const responseObj = {
      userSegments: ['100', '200'],
      userSegtax: 5,
      siteSegments: ['300', '400'],
      siteSegtax: 7,
      muid: 'qwerty654321',
    };

    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {
          site: {
            content: {
              language: 'en',
            }
          }
        },
      }
    };

    let onDone = sinon.stub();

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {
        gdpr: {
          gdprApplies: true,
          consentString: 'testConsent',
        },
        usp: '1YYY',
      }
    );

    server.requests[0].respond(
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(responseObj)
    );

    const requestUrl = new URL(server.requests[0].url);
    expect(requestUrl.host).to.be.eq('servicer.mgid.com');
    expect(requestUrl.searchParams.get('gdprApplies')).to.be.eq('true');
    expect(requestUrl.searchParams.get('consentData')).to.be.eq('testConsent');
    expect(requestUrl.searchParams.get('uspString')).to.be.eq('1YYY');
    expect(requestUrl.searchParams.get('muid')).to.be.eq('qwerty654321');
    expect(requestUrl.searchParams.get('clientSiteId')).to.be.eq('123');
    expect(requestUrl.searchParams.get('cxurl')).to.be.eq('https://www.test.com/abc');
    expect(requestUrl.searchParams.get('cxlang')).to.be.eq('en');

    assert.deepInclude(
      reqBidsConfigObj.ortb2Fragments.global,
      {
        site: {
          content: {
            language: 'en',
            data: [
              {
                name: 'www.mgid.com',
                ext: {
                  segtax: 7
                },
                segment: [
                  { id: '300' },
                  { id: '400' },
                ]
              }
            ],
          }
        },
        user: {
          data: [
            {
              name: 'www.mgid.com',
              ext: {
                segtax: 5
              },
              segment: [
                { id: '100' },
                { id: '200' },
              ]
            }
          ],
        },
      });
  });

  it('getBidRequestData doesn\'t send params (consent and cxlang), if we haven\'t received them', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {}
    );

    server.requests[0].respond(
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({})
    );

    const requestUrl = new URL(server.requests[0].url);
    expect(requestUrl.host).to.be.eq('servicer.mgid.com');
    expect(requestUrl.searchParams.get('gdprApplies')).to.be.null;
    expect(requestUrl.searchParams.get('consentData')).to.be.null;
    expect(requestUrl.searchParams.get('uspString')).to.be.null;
    expect(requestUrl.searchParams.get('muid')).to.be.eq('qwerty654321');
    expect(requestUrl.searchParams.get('clientSiteId')).to.be.eq('123');
    expect(requestUrl.searchParams.get('cxurl')).to.be.eq('https://www.test.com/abc');
    expect(requestUrl.searchParams.get('cxlang')).to.be.null;
    expect(onDone.calledOnce).to.be.true;
  });

  it('getBidRequestData send gdprApplies event if it is false', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {
        gdpr: {
          gdprApplies: false,
          consentString: 'testConsent',
        },
        usp: '1YYY',
      }
    );

    server.requests[0].respond(
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({})
    );

    const requestUrl = new URL(server.requests[0].url);
    expect(requestUrl.host).to.be.eq('servicer.mgid.com');
    expect(requestUrl.searchParams.get('gdprApplies')).to.be.eq('false');
    expect(requestUrl.searchParams.get('consentData')).to.be.eq('testConsent');
    expect(requestUrl.searchParams.get('uspString')).to.be.eq('1YYY');
    expect(requestUrl.searchParams.get('muid')).to.be.eq('qwerty654321');
    expect(requestUrl.searchParams.get('clientSiteId')).to.be.eq('123');
    expect(requestUrl.searchParams.get('cxurl')).to.be.eq('https://www.test.com/abc');
    expect(requestUrl.searchParams.get('cxlang')).to.be.null;
    expect(onDone.calledOnce).to.be.true;
  });

  it('getBidRequestData use og:url for cxurl, if it is available', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    let metaStub = sinon.stub(document, 'getElementsByTagName').returns([
      { getAttribute: () => 'og:test', content: 'fake' },
      { getAttribute: () => 'og:url', content: 'https://realOgUrl.com/' }
    ]);

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {}
    );

    server.requests[0].respond(
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({})
    );

    const requestUrl = new URL(server.requests[0].url);
    expect(requestUrl.searchParams.get('cxurl')).to.be.eq('https://realOgUrl.com/');
    expect(onDone.calledOnce).to.be.true;

    metaStub.restore();
  });

  it('getBidRequestData use topMostLocation for cxurl, if nothing else left', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    getRefererInfoStub.returns({
      topmostLocation: 'https://www.test.com/topMost'
    });

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {}
    );

    server.requests[0].respond(
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({})
    );

    const requestUrl = new URL(server.requests[0].url);
    expect(requestUrl.searchParams.get('cxurl')).to.be.eq('https://www.test.com/topMost');
    expect(onDone.calledOnce).to.be.true;
  });

  it('getBidRequestData won\'t modify ortb2 if response is broken', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {}
    );

    server.requests[0].respond(
      200,
      {'Content-Type': 'application/json'},
      '{'
    );

    assert.deepEqual(reqBidsConfigObj.ortb2Fragments.global, {});
    expect(onDone.calledOnce).to.be.true;
  });

  it('getBidRequestData won\'t modify ortb2 if response status is not 200', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {}
    );

    server.requests[0].respond(
      204,
      {'Content-Type': 'application/json'},
      '{}'
    );

    assert.deepEqual(reqBidsConfigObj.ortb2Fragments.global, {});
    expect(onDone.calledOnce).to.be.true;
  });

  it('getBidRequestData won\'t modify ortb2 if response results in error', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123}},
      {}
    );

    server.requests[0].respond(
      500,
      {'Content-Type': 'application/json'},
      '{}'
    );

    assert.deepEqual(reqBidsConfigObj.ortb2Fragments.global, {});
    expect(onDone.calledOnce).to.be.true;
  });

  it('getBidRequestData won\'t modify ortb2 if response time hits timeout', () => {
    let reqBidsConfigObj = {
      ortb2Fragments: {
        global: {},
      }
    };

    let onDone = sinon.stub();

    mgidSubmodule.getBidRequestData(
      reqBidsConfigObj,
      onDone,
      {params: {clientSiteId: 123, timeout: 500}},
      {}
    );

    clock.tick(510);

    assert.deepEqual(reqBidsConfigObj.ortb2Fragments.global, {});
    expect(onDone.calledOnce).to.be.true;
  });
});
