import { expect } from 'chai';
import {
  spec,
  getPmgUID,
  storage,
  THIRD_PARTY_COOKIE_ORIGIN,
  COOKIE_KEY_MGUID,
  getCurrentTimeToUTCString
} from 'modules/mediagoBidAdapter.js';
import { getPageTitle, getPageDescription, getPageKeywords, getConnectionDownLink } from '../../../libraries/fpdUtils/pageInfo.js';
import { transformSizesOrtb } from '../../../libraries/sizeUtils/tranformSize.js';
import * as utils from 'src/utils.js';

describe('mediago:BidAdapterTests', function () {
  const bidRequestData = {
    bidderCode: 'mediago',
    auctionId: '7fae02a9-0195-472f-ba94-708d3bc2c0d9',
    bidderRequestId: '4fec04e87ad785',
    bids: [
      {
        bidder: 'mediago',
        params: {
          token: '85a6b01e41ac36d49744fad726e3655d',
          siteId: 'siteId_01',
          zoneId: 'zoneId_01',
          publisher: '52',
          position: 'left',
          referrer: 'https://trace.mediago.io',
          bidfloor: 0.01,
          ortb2Imp: {
            ext: {
              gpid: 'adslot_gpid',
              tid: 'tid_01',
              data: {
                browsi: {
                  browsiViewability: 'NA'
                },
                adserver: {
                  name: 'adserver_name',
                  adslot: 'adslot_name'
                },
                pbadslot: '/12345/my-gpt-tag-0'
              }
            }
          }
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
            pos: 'left'
          }
        },
        ortb2: {
          site: {
            cat: ['IAB2'],
            keywords: 'power tools, drills, tools=industrial',
            content: {
              keywords: 'video, source=streaming'
            },
            publisher: {
              domain: 'mediago.io'
            },
          },
          user: {
            ext: {
              data: {}
            }
          }
        },
        adUnitCode: 'regular_iframe',
        transactionId: '7b26fdae-96e6-4c35-a18b-218dda11397d',
        sizes: [[300, 250]],
        bidId: '54d73f19c9d47a',
        bidderRequestId: '4fec04e87ad785',
        auctionId: '883a346a-6d62-4adb-a600-0f3a869061d1',
        src: 'client',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0
      }
    ],
    gdprConsent: {
      consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==',
      gdprApplies: true,
      apiVersion: 2,
      vendorData: {
        purpose: {
          consents: {
            1: false
          }
        }
      }
    },
    userIdAsEids: [
      { source: 'adserver.org', uids: [{ id: 'sample-userid' }] },
      { source: 'criteo.com', uids: [{ id: 'sample-criteo-userid' }] },
      { source: 'netid.de', uids: [{ id: 'sample-netId-userid' }] },
      { source: 'liveramp.com', uids: [{ id: 'sample-idl-userid' }] },
      { source: 'uidapi.com', uids: [{ id: 'sample-uid2-value' }] },
      { source: 'puburl.com', uids: [{ id: 'pubid1' }] },
      { source: 'puburl2.com', uids: [{ id: 'pubid2' }, { id: 'pubid2-123' }] }
    ]
  };
  let request = [];

  it('mediago:validate_pub_params', function () {
    expect(
      spec.isBidRequestValid({
        bidder: 'mediago',
        params: {
          token: ['85a6b01e41ac36d49744fad726e3655d'],
          publisher: ['test_publisher']
        }
      })
    ).to.equal(true);
  });

  it('mediago:validate_generated_params', function () {
    request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    const req_data = JSON.parse(request.data);
    expect(req_data.imp).to.have.lengthOf(1);

    const banner = req_data.imp[0].banner;
    expect(banner.w).to.equal(300);
    expect(banner.h).to.equal(250);
    expect(banner.format).to.deep.equal([{ w: 300, h: 250 }]);
  });

  it('mediago:validate_transactionId_in_request', function () {
    request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    const req_data = JSON.parse(request.data);
    expect(req_data.imp[0].ext.transactionId).to.equal('7b26fdae-96e6-4c35-a18b-218dda11397d');
  });

  it('mediago:validate_pbjs_source_and_version_in_request', function () {
    request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    const req_data = JSON.parse(request.data);
    expect(req_data.ext.pbjsversion).to.be.a('string');
    expect(req_data.ext.pbjsversion.length).to.be.above(0);
  });

  describe('mediago: buildRequests', function() {
    describe('getPmgUID function', function() {
      let sandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(storage, 'getCookie');
        sandbox.stub(storage, 'setCookie');
        sandbox.stub(utils, 'generateUUID').returns('new-uuid');
        sandbox.stub(storage, 'cookiesAreEnabled');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should generate new UUID and set cookie when no existing cookie', () => {
        storage.cookiesAreEnabled.callsFake(() => true);
        storage.getCookie.callsFake(() => null);
        const uid = getPmgUID();
        expect(uid).to.equal('new-uuid');
        expect(storage.setCookie.calledOnce).to.be.true;
      });

      it('should return existing UUID from cookie without setting new one', () => {
        storage.cookiesAreEnabled.callsFake(() => true);
        storage.getCookie.callsFake(() => 'existing-uuid');
        const uid = getPmgUID();
        expect(uid).to.equal('existing-uuid');
        expect(storage.setCookie.called).to.be.false;
      });

      it('should return undefined when cookies are not enabled', () => {
        storage.cookiesAreEnabled.callsFake(() => false);
        const uid = getPmgUID();
        expect(uid).to.be.undefined;
        expect(storage.setCookie.called).to.be.false;
      });

      it('should ignore gdprConsent parameter (not used by implementation)', () => {
        storage.cookiesAreEnabled.callsFake(() => true);
        storage.getCookie.callsFake(() => null);
        expect(getPmgUID({ gdprApplies: true, consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==' })).to.equal('new-uuid');
        expect(getPmgUID({ gdprApplies: false })).to.equal('new-uuid');
        expect(getPmgUID(undefined)).to.equal('new-uuid');
      });
    });

    describe('buyeruid and user.id logic', function() {
      let sandbox;

      const makeBidRequests = (overrides = {}) => [{
        bidder: 'mediago',
        params: { token: 'test-token' },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]],
        bidId: 'bid-1',
        adUnitCode: 'ad-1',
        userIdAsEids: [],
        ...overrides
      }];

      const baseBidderRequest = {
        bidderRequestId: 'req-1',
        refererInfo: { domain: 'example.com', page: 'https://example.com' },
        timeout: 2000,
        ortb2: {},
      };

      beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(storage, 'getCookie');
        sandbox.stub(storage, 'setCookie');
        sandbox.stub(storage, 'cookiesAreEnabled').returns(true);
        sandbox.stub(utils, 'generateUUID').returns('generated-uuid');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should use mguid cookie as buyeruid when available', () => {
        storage.getCookie.callsFake((key) => {
          if (key === '__mguid_') return 'mguid-value';
          if (key === '__pmguid_') return 'pmguid-value';
          return null;
        });

        const bidRequests = makeBidRequests();
        spec.isBidRequestValid(bidRequests[0]);
        const payload = JSON.parse(spec.buildRequests(bidRequests, baseBidderRequest).data);
        expect(payload.user.buyeruid).to.equal('mguid-value');
      });

      it('should leave buyeruid undefined when mguid is not available', () => {
        storage.getCookie.callsFake((key) => {
          if (key === '__pmguid_') return 'pmguid-value';
          return null;
        });

        const bidRequests = makeBidRequests();
        spec.isBidRequestValid(bidRequests[0]);
        const payload = JSON.parse(spec.buildRequests(bidRequests, baseBidderRequest).data);
        expect(payload.user.buyeruid).to.be.undefined;
      });

      it('should use crumbs.pubcid as user.id with highest priority', () => {
        storage.getCookie.returns(null);
        const bidRequests = makeBidRequests({
          crumbs: { pubcid: 'crumbs-pubcid-value' },
          userIdAsEids: [{ source: 'pubcid.org', uids: [{ id: 'eids-pubcid-value' }] }],
        });
        spec.isBidRequestValid(bidRequests[0]);
        const payload = JSON.parse(spec.buildRequests(bidRequests, baseBidderRequest).data);
        expect(payload.user.id).to.equal('crumbs-pubcid-value');
      });

      it('should fallback to pubcid.org eid when crumbs.pubcid is absent', () => {
        storage.getCookie.returns(null);
        const bidRequests = makeBidRequests({
          userIdAsEids: [{ source: 'pubcid.org', uids: [{ id: 'eids-pubcid-value' }] }],
        });
        spec.isBidRequestValid(bidRequests[0]);
        const payload = JSON.parse(spec.buildRequests(bidRequests, baseBidderRequest).data);
        expect(payload.user.id).to.equal('eids-pubcid-value');
      });

      it('should fallback to sharedid.org when both crumbs.pubcid and pubcid.org are absent', () => {
        storage.getCookie.returns(null);
        const bidRequests = makeBidRequests({
          userIdAsEids: [{ source: 'sharedid.org', uids: [{ id: 'eids-sharedid-value' }] }],
        });
        spec.isBidRequestValid(bidRequests[0]);
        const payload = JSON.parse(spec.buildRequests(bidRequests, baseBidderRequest).data);
        expect(payload.user.id).to.equal('eids-sharedid-value');
      });

      it('should have undefined user.id when no pubcid source is available', () => {
        storage.getCookie.returns(null);
        const bidRequests = makeBidRequests({
          userIdAsEids: [{ source: 'criteo.com', uids: [{ id: 'criteo-id' }] }],
        });
        spec.isBidRequestValid(bidRequests[0]);
        const payload = JSON.parse(spec.buildRequests(bidRequests, baseBidderRequest).data);
        expect(payload.user.id).to.be.undefined;
      });
    });
  });

  it('mediago:validate_response_params', function () {
    let adm =
      '<link rel="stylesheet" href="https://cdn.mediago.io/js/style/style_banner_300*250.css"><div id="mgcontainer-99afea272c2b0e8626489674ddb7a0bb" class="mediago-placement imgTopTitleBottom" style="position:relative;width:298px;height:248px;overflow:hidden"><a href="https://trace.mediago.io/api/bidder/track?tn=39934c2bda4debbe4c680be1dd02f5d3&price=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&evt=102&rid=6e28cfaf115a354ea1ad8e1304d6d7b8&campaignid=1339145&impid=44-300x250-1&offerid=24054386&test=0&time=1660789795&cp=jZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM&clickid=44_6e28cfaf115a354ea1ad8e1304d6d7b8_44-300x250-1&acid=599&trackingid=99afea272c2b0e8626489674ddb7a0bb&uid=a865b9ae-fa9e-4c09-8204-2db99ac7c8f7&jt=2&url=oxZA2i2aUVY76Xy2t3HffaK_ZtBDsgFwFc_Nbnw-bz3yCxmoUyZvATKnFc9ZkUfT1eQizhtczCwDzjHwwwDgTehUnp1EwdY4g1LRcuOwlRpXnVTt3zPQdaVx5nVDw25by7lQ0q469LCv2eEFDTAv_FOuVT32WiOx_ArOIlxCnDGpjPLUNyxm3cTZFGOJn4B7&bm=2&la=en&cn=us&cid=3998296&info=Si3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk&sid=128__110__1__12__28__38__163__96__58__24__47__99&sp=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&scp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&acu=USD&scu=USD&sgcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&gprice=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&gcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&ah=&pb=&de=wjh.popin.cc&cat=&iv=0" target="_blank" class="mediago-placement-track" style="display: inline-block;"><img alt="Ranger\'s spot giant lion - vet is shocked when looking at the ultrasound" src="https://d2cli4kgl5uxre.cloudfront.net/ML/ff32b6f9b3bbc45c00b78b6674a2952e__scv1__300x175.png" style="height:70%;width:100%;border-width:0;border:none;"><h3 class="title" style="font-size:16px;">Ranger\'s spot giant lion - vet is shocked when looking at the ultrasound</h3></a><span class="source"><a class="sourcename" href="//www.mediago.io" target="_blank"><span>Ad</span> </a><a class="mgmgsrcnameadslabelurl" href="//www.mediago.io/privacy" target="_blank"><span>soo-healthy</span></a></span></div>';
    let temp = '%3Cscr';
    temp += 'ipt%3E';
    temp +=
      '!function()%7B%22use%20strict%22%3Bfunction%20f(t)%7Breturn(f%3D%22function%22%3D%3Dtypeof%20Symbol%26%26%22symbol%22%3D%3Dtypeof%20Symbol.iterator%3Ffunction(t)%7Breturn%20typeof%20t%7D%3Afunction(t)%7Breturn%20t%26%26%22function%22%3D%3Dtypeof%20Symbol%26%26t.constructor%3D%3D%3DSymbol%26%26t!%3D%3DSymbol.prototype%3F%22symbol%22%3Atypeof%20t%7D)(t)%7Dfunction%20l(t)%7Bvar%20e%3D0%3Carguments.length%26%26void%200!%3D%3Dt%3Ft%3A%7B%7D%3Btry%7Be.random_t%3D(new%20Date).getTime()%2Cg(function(t)%7Bvar%20e%3D1%3Carguments.length%26%26void%200!%3D%3Darguments%5B1%5D%3Farguments%5B1%5D%3A%22%22%3Bif(%22object%22!%3D%3Df(t))return%20e%3Bvar%20n%3Dfunction(t)%7Bfor(var%20e%2Cn%3D%5B%5D%2Co%3D0%2Ci%3DObject.keys(t)%3Bo%3Ci.length%3Bo%2B%2B)e%3Di%5Bo%5D%2Cn.push(%22%22.concat(e%2C%22%3D%22).concat(t%5Be%5D))%3Breturn%20n%7D(t).join(%22%26%22)%2Co%3De.indexOf(%22%23%22)%2Ci%3De%2Ct%3D%22%22%3Breturn-1!%3D%3Do%26%26(i%3De.slice(0%2Co)%2Ct%3De.slice(o))%2Cn%26%26(i%26%26-1!%3D%3Di.indexOf(%22%3F%22)%3Fi%2B%3D%22%26%22%2Bn%3Ai%2B%3D%22%3F%22%2Bn)%2Ci%2Bt%7D(e%2C%22https%3A%2F%2Ftrace.mediago.io%2Fapi%2Flog%2Ftrack%22))%7Dcatch(t)%7B%7D%7Dfunction%20g(t%2Ce%2Cn)%7B(t%3Dt%3Ft.split(%22%3B%3B%3B%22)%3A%5B%5D).map(function(t)%7Btry%7B0%3C%3Dt.indexOf(%22%2Fapi%2Fbidder%2Ftrack%22)%26%26n%26%26(t%2B%3D%22%26inIframe%3D%22.concat(!(!self.frameElement%7C%7C%22IFRAME%22!%3Dself.frameElement.tagName)%7C%7Cwindow.frames.length!%3Dparent.frames.length%7C%7Cself!%3Dtop)%2Ct%2B%3D%22%26pos_x%3D%22.concat(n.left%2C%22%26pos_y%3D%22).concat(n.top%2C%22%26page_w%3D%22).concat(n.page_width%2C%22%26page_h%3D%22).concat(n.page_height))%7Dcatch(t)%7Bl(%7Btn%3As%2Cwinloss%3A1%2Cfe%3A2%2Cpos_err_c%3A1002%2Cpos_err_m%3At.toString()%7D)%7Dvar%20e%3Dnew%20Image%3Be.src%3Dt%2Ce.style.display%3D%22none%22%2Ce.style.visibility%3D%22hidden%22%2Ce.width%3D0%2Ce.height%3D0%2Cdocument.body.appendChild(e)%7D)%7Dvar%20d%3D%5B%22https%3A%2F%2Ftrace.mediago.io%2Fapi%2Fbidder%2Ftrack%3Ftn%3D39934c2bda4debbe4c680be1dd02f5d3%26price%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26evt%3D101%26rid%3D6e28cfaf115a354ea1ad8e1304d6d7b8%26campaignid%3D1339145%26impid%3D44-300x250-1%26offerid%3D24054386%26test%3D0%26time%3D1660789795%26cp%3DjZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM%26acid%3D599%26trackingid%3D99afea272c2b0e8626489674ddb7a0bb%26uid%3Da865b9ae-fa9e-4c09-8204-2db99ac7c8f7%26bm%3D2%26la%3Den%26cn%3Dus%26cid%3D3998296%26info%3DSi3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk%26sid%3D128__110__1__12__28__38__163__96__58__24__47__99%26sp%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26scp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26acu%3DUSD%26scu%3DUSD%26sgcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26gprice%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26gcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26ah%3D%26de%3Dwjh.popin.cc%26iv%3D0%22%2C%22%24%7BITRACKER2%7D%22%2C%22%24%7BITRACKER3%7D%22%2C%22%24%7BITRACKER4%7D%22%2C%22%24%7BITRACKER5%7D%22%2C%22%24%7BITRACKER6%7D%22%5D%2Cp%3D%5B%22https%3A%2F%2Ftrace.mediago.io%2Fapi%2Fbidder%2Ftrack%3Ftn%3D39934c2bda4debbe4c680be1dd02f5d3%26price%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26evt%3D104%26rid%3D6e28cfaf115a354ea1ad8e1304d6d7b8%26campaignid%3D1339145%26impid%3D44-300x250-1%26offerid%3D24054386%26test%3D0%26time%3D1660789795%26cp%3DjZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM%26acid%3D599%26trackingid%3D99afea272c2b0e8626489674ddb7a0bb%26uid%3Da865b9ae-fa9e-4c09-8204-2db99ac7c8f7%26sid%3D128__110__1__12__28__38__163__96__58__24__47__99%26format%3D%26crid%3Dff32b6f9b3bbc45c00b78b6674a2952e%26bm%3D2%26la%3Den%26cn%3Dus%26cid%3D3998296%26info%3DSi3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk%26sp%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26scp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26acu%3DUSD%26scu%3DUSD%26sgcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26gprice%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26gcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26ah%3D%26de%3Dwjh.popin.cc%26iv%3D0%22%2C%22%24%7BVTRACKER2%7D%22%2C%22%24%7BVTRACKER3%7D%22%2C%22%24%7BVTRACKER4%7D%22%2C%22%24%7BVTRACKER5%7D%22%2C%22%24%7BVTRACKER6%7D%22%5D%2Cs%3D%22f9f2b1ef23fe2759c2cad0953029a94b%22%2Cn%3Ddocument.getElementById(%22mgcontainer-99afea272c2b0e8626489674ddb7a0bb%22)%3Bn%26%26function()%7Bvar%20a%3Dn.getElementsByClassName(%22mediago-placement-track%22)%3Bif(a%26%26a.length)%7Bvar%20t%2Ce%3Dfunction(t)%7Bvar%20e%2Cn%2Co%2Ci%2Cc%2Cr%3B%22object%22%3D%3D%3Df(r%3Da%5Bt%5D)%26%26(e%3Dfunction(t)%7Btry%7Bvar%20e%3Dt.getBoundingClientRect()%2Cn%3De%26%26e.top%7C%7C-1%2Co%3De%26%26e.left%7C%7C-1%2Ci%3Ddocument.body.scrollWidth%7C%7C-1%2Ce%3Ddocument.body.scrollHeight%7C%7C-1%3Breturn%7Btop%3An.toFixed(0)%2Cleft%3Ao.toFixed(0)%2Cpage_width%3Ai%2Cpage_height%3Ae%7D%7Dcatch(o)%7Breturn%20l(%7Btn%3As%2Cwinloss%3A1%2Cfe%3A2%2Cpos_err_c%3A1001%2Cpos_err_m%3Ao.toString()%7D)%2C%7Btop%3A%22-1%22%2Cleft%3A%22-1%22%2Cpage_width%3A%22-1%22%2Cpage_height%3A%22-1%22%7D%7D%7D(r)%2C(n%3Dd%5Bt%5D)%26%26g(n%2C0%2Ce)%2Co%3Dp%5Bt%5D%2Ci%3D!1%2C(c%3Dfunction()%7BsetTimeout(function()%7Bvar%20t%2Ce%3B!i%26%26(t%3Dr%2Ce%3Dwindow.innerHeight%7C%7Cdocument.documentElement.clientHeight%7C%7Cdocument.body.clientHeight%2C(t.getBoundingClientRect()%26%26t.getBoundingClientRect().top)%3C%3De-.75*(t.offsetHeight%7C%7Ct.clientHeight))%3F(i%3D!0%2Co%26%26g(o))%3Ac()%7D%2C500)%7D)())%7D%3Bfor(t%20in%20a)e(t)%7D%7D()%7D()';
    temp += '%3B%3C%2Fscri';
    temp += 'pt%3E';
    adm += decodeURIComponent(temp);
    const serverResponse = {
      body: {
        id: 'mgprebidjs_0b6572fc-ceba-418f-b6fd-33b41ad0ac8a',
        seatbid: [
          {
            bid: [
              {
                id: '6e28cfaf115a354ea1ad8e1304d6d7b8',
                impid: '54d73f19c9d47a',
                price: 0.087581,
                adm: adm,
                cid: '1339145',
                crid: 'ff32b6f9b3bbc45c00b78b6674a2952e',
                w: 300,
                h: 250
              }
            ]
          }
        ],
        cur: 'USD'
      }
    };

    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);

    const bid = bids[0];
    expect(bid.creativeId).to.equal('ff32b6f9b3bbc45c00b78b6674a2952e');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });
});

describe('mediago: getUserSyncs', function() {
  const COOKY_SYNC_IFRAME_URL = 'https://cdn.mediago.io/js/cookieSync.html';
  const IFRAME_ENABLED = { iframeEnabled: true, pixelEnabled: false };
  const IFRAME_DISABLED = { iframeEnabled: false, pixelEnabled: false };
  const GDPR_CONSENT = { consentString: 'gdprConsentString', gdprApplies: true };
  const USP_CONSENT = { consentString: 'uspConsentString' };

  let syncParamUrl = `dm=${encodeURIComponent(location.origin || `https://${location.host}`)}`;
  syncParamUrl += '&gdpr=1&gdpr_consent=gdprConsentString&ccpa_consent=uspConsentString';
  const expectedIframeSyncs = [{ type: 'iframe', url: `${COOKY_SYNC_IFRAME_URL}?${syncParamUrl}` }];

  it('should return nothing if iframe is disabled', () => {
    const userSyncs = spec.getUserSyncs(IFRAME_DISABLED, undefined, GDPR_CONSENT, USP_CONSENT, undefined);
    expect(userSyncs).to.be.undefined;
  });

  it('should do userSyncs if iframe is enabled', () => {
    const userSyncs = spec.getUserSyncs(IFRAME_ENABLED, undefined, GDPR_CONSENT, USP_CONSENT, undefined);
    expect(userSyncs).to.deep.equal(expectedIframeSyncs);
  });
});

describe('mediago Bid Adapter Tests', function () {
  describe('buildRequests', () => {
    describe('getPageTitle function', function() {
      let sandbox;
      beforeEach(() => { sandbox = sinon.createSandbox(); });
      afterEach(() => { sandbox.restore(); });

      it('should return the top document title if available', function() {
        const fakeTopWindow = { document: { title: 'Top Document Title', querySelector: () => ({ content: 'og' }) } };
        expect(getPageTitle({ top: fakeTopWindow })).to.equal('Top Document Title');
      });

      it('should return og:title from top if title is empty', function() {
        const fakeTopWindow = {
          document: { title: '', querySelector: sandbox.stub().withArgs('meta[property="og:title"]').returns({ content: 'Top OG Title' }) }
        };
        expect(getPageTitle({ top: fakeTopWindow })).to.equal('Top OG Title');
      });

      it('should fallback to current document title', function() {
        document.title = 'Test Page Title';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns(null);
        expect(getPageTitle({ top: undefined })).to.equal('Test Page Title');
      });

      it('should fallback to current og:title if document.title is empty', function() {
        document.title = '';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns({ content: 'OG Title' });
        expect(getPageTitle({ top: undefined })).to.equal('OG Title');
      });

      it('should return empty string if nothing is found', function() {
        document.title = '';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns(null);
        expect(getPageTitle({ top: undefined })).to.equal('');
      });

      it('should handle top access exceptions and fallback to current document', function() {
        document.title = 'Current Document Title';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns(null);
        const fakeWindow = { get top() { throw new Error('Access denied'); } };
        expect(getPageTitle(fakeWindow)).to.equal('Current Document Title');
      });
    });

    describe('getPageDescription function', function() {
      let sandbox;
      beforeEach(() => { sandbox = sinon.createSandbox(); });
      afterEach(() => { sandbox.restore(); });

      it('should return top document description if available', function() {
        const fakeTopWindow = { document: { querySelector: sandbox.stub().withArgs('meta[name="description"]').returns({ content: 'Top Desc' }) } };
        expect(getPageDescription({ top: fakeTopWindow })).to.equal('Top Desc');
      });

      it('should return top og:description if description is not present', function() {
        const fakeTopWindow = { document: { querySelector: sandbox.stub().withArgs('meta[property="og:description"]').returns({ content: 'Top OG Desc' }) } };
        expect(getPageDescription({ top: fakeTopWindow })).to.equal('Top OG Desc');
      });

      it('should fallback to current document on top access exception', function() {
        sandbox.stub(document, 'querySelector').withArgs('meta[name="description"]').returns({ content: 'Current Desc' });
        const fakeWindow = { get top() { throw new Error('Access denied'); } };
        expect(getPageDescription(fakeWindow)).to.equal('Current Desc');
      });

      it('should fallback to current og:description if description is absent and top is inaccessible', function() {
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:description"]').returns({ content: 'Current OG Desc' });
        const fakeWindow = { get top() { throw new Error('Access denied'); } };
        expect(getPageDescription(fakeWindow)).to.equal('Current OG Desc');
      });
    });

    describe('getPageKeywords function', function() {
      let sandbox;
      beforeEach(() => { sandbox = sinon.createSandbox(); });
      afterEach(() => { sandbox.restore(); });

      it('should return top document keywords if available', function() {
        const fakeTopWindow = { document: { querySelector: sandbox.stub().withArgs('meta[name="keywords"]').returns({ content: 'k1, k2' }) } };
        expect(getPageKeywords({ top: fakeTopWindow })).to.equal('k1, k2');
      });

      it('should fallback to current document keywords on top access exception', function() {
        sandbox.stub(document, 'querySelector').withArgs('meta[name="keywords"]').returns({ content: 'k3, k4' });
        const fakeWindow = { get top() { throw new Error('Access denied'); } };
        expect(getPageKeywords(fakeWindow)).to.equal('k3, k4');
      });

      it('should return empty string if no keywords meta tag', function() {
        sandbox.stub(document, 'querySelector').withArgs('meta[name="keywords"]').returns(null);
        expect(getPageKeywords()).to.equal('');
      });
    });

    describe('getConnectionDownLink function', function() {
      it('should return downlink as string if available', function() {
        expect(getConnectionDownLink({ navigator: { connection: { downlink: 2.5 } } })).to.equal('2.5');
      });

      it('should return undefined if downlink/connection/navigator is missing', function() {
        expect(getConnectionDownLink({ navigator: { connection: {} } })).to.be.undefined;
        expect(getConnectionDownLink({ navigator: {} })).to.be.undefined;
        expect(getConnectionDownLink({})).to.be.undefined;
      });
    });

    describe('getUserSyncs with message event listener', function() {
      function messageHandler(event) {
        if (!event.data || event.origin !== THIRD_PARTY_COOKIE_ORIGIN) return;
        window.removeEventListener('message', messageHandler, true);
        event.stopImmediatePropagation();
        const response = event.data;
        if (!response.optout && response.mguid) {
          storage.setCookie(COOKIE_KEY_MGUID, response.mguid, getCurrentTimeToUTCString());
        }
      }

      let sandbox;
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(storage, 'setCookie');
        sandbox.stub(window, 'removeEventListener');
      });
      afterEach(() => { sandbox.restore(); });

      it('should set a cookie when a valid message is received', () => {
        const fakeEvent = {
          data: { optout: '', mguid: '12345' },
          origin: THIRD_PARTY_COOKIE_ORIGIN,
          stopImmediatePropagation: sinon.spy()
        };
        messageHandler(fakeEvent);
        expect(fakeEvent.stopImmediatePropagation.calledOnce).to.be.true;
        expect(window.removeEventListener.calledWith('message', messageHandler, true)).to.be.true;
        expect(storage.setCookie.calledWith(COOKIE_KEY_MGUID, '12345', sinon.match.string)).to.be.true;
      });

      it('should not do anything when an invalid message is received', () => {
        const fakeEvent = {
          data: null,
          origin: 'http://invalid-origin.com',
          stopImmediatePropagation: sinon.spy()
        };
        messageHandler(fakeEvent);
        expect(fakeEvent.stopImmediatePropagation.notCalled).to.be.true;
        expect(window.removeEventListener.notCalled).to.be.true;
        expect(storage.setCookie.notCalled).to.be.true;
      });
    });
  });
});

describe('mediago: transformSizesOrtb', function() {
  it('should transform sizes correctly', function() {
    expect(transformSizesOrtb([300, 250])).to.deep.equal([{ w: 300, h: 250 }]);
    expect(transformSizesOrtb([[300, 250], [728, 90]])).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    expect(transformSizesOrtb([])).to.deep.equal([]);
  });
});

describe('mediago: buildRequests with non-standard size', function() {
  it('should use fallback size when no standard size matches', function() {
    const bidRequestData = {
      bidderCode: 'mediago',
      auctionId: '7fae02a9-0195-472f-ba94-708d3bc2c0d9',
      bidderRequestId: '4fec04e87ad785',
      bids: [{
        bidder: 'mediago',
        params: { token: '85a6b01e41ac36d49744fad726e3655d', publisher: '52' },
        mediaTypes: { banner: { sizes: [[999, 888]] } },
        adUnitCode: 'test_ad_unit',
        sizes: [[999, 888]],
        bidId: 'bid123',
        bidderRequestId: '4fec04e87ad785',
        auctionId: '7fae02a9-0195-472f-ba94-708d3bc2c0d9',
        userIdAsEids: [],
      }],
    };

    spec.isBidRequestValid(bidRequestData.bids[0]);
    const request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    const reqData = JSON.parse(request.data);
    expect(reqData.imp[0].banner.w).to.equal(999);
    expect(reqData.imp[0].banner.h).to.equal(888);
    expect(reqData.imp[0].banner.format).to.deep.equal([{ w: 999, h: 888 }]);
  });
});

describe('mediago: onBidWon', function() {
  let sandbox;
  beforeEach(() => { sandbox = sinon.createSandbox(); sandbox.stub(utils, 'triggerPixel'); });
  afterEach(() => { sandbox.restore(); });

  it('should call triggerPixel when nurl exists', function() {
    spec.onBidWon({ nurl: 'https://trace.mediago.io/win?id=123' });
    expect(utils.triggerPixel.calledOnce).to.be.true;
    expect(utils.triggerPixel.calledWith('https://trace.mediago.io/win?id=123')).to.be.true;
  });

  it('should not call triggerPixel when nurl is empty', function() {
    spec.onBidWon({});
    expect(utils.triggerPixel.called).to.be.false;
  });
});

describe('mediago: Native Ad Support', function() {
  const nativeOrtbRequest = {
    ver: '1.2',
    assets: [
      { id: 1, required: 1, img: { type: 3, wmin: 275, hmin: 144 } },
      { id: 2, required: 1, title: { len: 100 } },
      { id: 3, required: 1, data: { type: 1 } }
    ],
    eventtrackers: [
      { event: 1, methods: [1, 2] },
      { event: 2, methods: [1] }
    ],
    plcmttype: 1,
    plcmtcnt: 1,
    privacy: 1
  };

  const nativeBidRequests = [{
    bidder: 'mediago',
    params: { token: '85a6b01e41ac36d49744fad726e3655d', publisher: '52' },
    mediaTypes: { native: {} },
    nativeOrtbRequest: nativeOrtbRequest,
    adUnitCode: 'native-ad-1',
    transactionId: 'native-txn-001',
    bidId: 'native-bid-1',
    bidderRequestId: 'native-req-1',
    auctionId: 'native-auction-1',
    userIdAsEids: [],
  }];

  const bidderRequest = {
    bidderRequestId: 'native-req-1',
    refererInfo: { domain: 'example.com', page: 'https://example.com/article' },
    timeout: 2000,
    ortb2: {},
  };

  describe('buildRequests with native mediaType', function() {
    beforeEach(() => { spec.isBidRequestValid(nativeBidRequests[0]); });

    it('should build native imp with correct structure', function() {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const imp = payload.imp[0];

      expect(payload.imp).to.have.lengthOf(1);
      expect(imp.banner).to.be.undefined;
      expect(imp.native).to.exist;
      expect(imp.native.ver).to.equal('1.2');
      expect(imp.id).to.equal('native-bid-1');
      expect(imp.bidfloor).to.be.a('number');
      expect(imp.bidfloorcur).to.be.undefined;
      expect(imp.secure).to.be.undefined;
      expect(imp.instl).to.be.undefined;
    });

    it('should serialize nativeOrtbRequest correctly in native.request', function() {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const parsed = JSON.parse(payload.imp[0].native.request);

      expect(parsed.ver).to.equal('1.2');
      expect(parsed.assets).to.have.lengthOf(3);
      expect(parsed.assets[0].img.type).to.equal(3);
      expect(parsed.assets[1].title.len).to.equal(100);
      expect(parsed.assets[2].data.type).to.equal(1);
      expect(parsed.eventtrackers).to.have.lengthOf(2);
      expect(parsed.eventtrackers[0].methods).to.deep.equal([1, 2]);
    });

    it('should include correct ext fields on native imp', function() {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest);
      const ext = JSON.parse(request.data).imp[0].ext;

      expect(ext.adUnitCode).to.equal('native-ad-1');
      expect(ext.publisher).to.equal('52');
    });

    it('should set _mediaTypeMap correctly', function() {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest);
      expect(request._mediaTypeMap).to.exist;
      expect(request._mediaTypeMap['native-bid-1']).to.equal('native');
    });

    it('should handle mixed banner and native ad units', function() {
      const mixedBidRequests = [
        {
          bidder: 'mediago',
          params: { token: '85a6b01e41ac36d49744fad726e3655d', publisher: '52' },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          sizes: [[300, 250]],
          adUnitCode: 'banner-ad-1',
          bidId: 'banner-bid-1',
          bidderRequestId: 'mixed-req-1',
          auctionId: 'mixed-auction-1',
          userIdAsEids: [],
        },
        {
          bidder: 'mediago',
          params: { token: '85a6b01e41ac36d49744fad726e3655d', publisher: '52' },
          mediaTypes: { native: {} },
          nativeOrtbRequest: nativeOrtbRequest,
          adUnitCode: 'native-ad-1',
          bidId: 'native-bid-1',
          bidderRequestId: 'mixed-req-1',
          auctionId: 'mixed-auction-1',
          userIdAsEids: [],
        }
      ];

      const request = spec.buildRequests(mixedBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.imp).to.have.lengthOf(2);
      expect(payload.imp[0].banner).to.exist;
      expect(payload.imp[0].native).to.be.undefined;
      expect(payload.imp[1].native).to.exist;
      expect(payload.imp[1].banner).to.be.undefined;
      expect(request._mediaTypeMap['banner-bid-1']).to.equal('banner');
      expect(request._mediaTypeMap['native-bid-1']).to.equal('native');
    });

    it('should pass tagid and transactionId from params/ortb2Imp', function() {
      const reqsWithExtras = [{
        ...nativeBidRequests[0],
        params: { token: '85a6b01e41ac36d49744fad726e3655d', publisher: '52', tagid: 'tag-123' },
        ortb2Imp: { ext: { tid: 'ortb2-tid-value' } }
      }];
      spec.isBidRequestValid(reqsWithExtras[0]);
      const payload = JSON.parse(spec.buildRequests(reqsWithExtras, bidderRequest).data);

      expect(payload.imp[0].tagid).to.equal('tag-123');
      expect(payload.imp[0].ext.transactionId).to.equal('ortb2-tid-value');
    });

    it('should return empty imp when nativeOrtbRequest is missing', function() {
      const reqsNoOrtb = [{ ...nativeBidRequests[0], nativeOrtbRequest: undefined }];
      spec.isBidRequestValid(reqsNoOrtb[0]);
      const payload = JSON.parse(spec.buildRequests(reqsNoOrtb, bidderRequest).data);
      expect(payload.imp[0]).to.deep.equal({});
    });

    it('should not have hardcoded ip in device and set test field correctly', function() {
      const request = spec.buildRequests(nativeBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.device.ip).to.be.undefined;
      expect(payload.test).to.equal(0);

      const reqsWithTest = [{ ...nativeBidRequests[0], params: { ...nativeBidRequests[0].params, test: 1 } }];
      spec.isBidRequestValid(reqsWithTest[0]);
      const payload2 = JSON.parse(spec.buildRequests(reqsWithTest, bidderRequest).data);
      expect(payload2.test).to.equal(1);
    });

    it('should include GDPR consent in native imp ext when present', function() {
      const gdprBidderRequest = {
        ...bidderRequest,
        gdprConsent: { consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==', gdprApplies: true }
      };
      const payload = JSON.parse(spec.buildRequests(nativeBidRequests, gdprBidderRequest).data);
      expect(payload.imp[0].ext.consent).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ+A==');
      expect(payload.imp[0].ext.gdpr).to.equal(1);
    });
  });

  describe('interpretResponse with native bids', function() {
    const nativeAdm = JSON.stringify({
      assets: [
        { id: 1, img: { type: 3, url: 'https://images.mediago.io/img/300x157.png', w: 300, h: 157 } },
        { id: 2, title: { text: 'Test Native Ad Title', len: 20 } },
        { id: 3, data: { type: 1, value: 'TestSponsor' } }
      ],
      link: { url: 'https://trace.mediago.io/ju/ic?tn=test&ap={AUCTION_PRICE}' },
      eventtrackers: [
        { event: 1, method: 1, url: 'https://trace.mediago.io/ju/imp?tn=test' },
        { event: 2, method: 1, url: 'https://trace.mediago.io/ju/view?tn=test' }
      ],
      privacy: 'https://cdn.mediago.io/js/officialWebsite/privacy.html'
    });

    const nativeServerResponse = {
      body: {
        id: 'mgprebidjs_native-req-1',
        seatbid: [{
          seat: 'MediaGo',
          bid: [{
            id: 'bid-response-1',
            impid: 'native-bid-1',
            price: 0.15,
            adm: nativeAdm,
            adomain: ['advertiser.com'],
            crid: 'creative-native-001',
            nurl: 'https://trace.mediago.io/ju/win?tn=test&ap=${AUCTION_PRICE}'
          }]
        }],
        cur: 'USD'
      }
    };

    const bidRequest = { _mediaTypeMap: { 'native-bid-1': 'native' } };

    it('should return correct native bid response with all fields', function() {
      const bids = spec.interpretResponse(nativeServerResponse, bidRequest);

      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.mediaType).to.equal('native');
      expect(bid.width).to.equal(1);
      expect(bid.height).to.equal(1);
      expect(bid.cpm).to.equal(0.15);
      expect(bid.creativeId).to.equal('creative-native-001');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.be.true;
      expect(bid.ttl).to.be.above(0);
      expect(bid.nurl).to.equal('https://trace.mediago.io/ju/win?tn=test&ap=${AUCTION_PRICE}');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should parse native ortb object correctly', function() {
      const bids = spec.interpretResponse(nativeServerResponse, bidRequest);
      const ortb = bids[0].native.ortb;

      expect(ortb.assets).to.have.lengthOf(3);
      expect(ortb.assets[0].img.url).to.equal('https://images.mediago.io/img/300x157.png');
      expect(ortb.assets[1].title.text).to.equal('Test Native Ad Title');
      expect(ortb.assets[2].data.value).to.equal('TestSponsor');
      expect(ortb.link.url).to.include('trace.mediago.io');
      expect(ortb.eventtrackers).to.have.lengthOf(2);
      expect(ortb.eventtrackers[0].event).to.equal(1);
      expect(ortb.privacy).to.equal('https://cdn.mediago.io/js/officialWebsite/privacy.html');
    });

    it('should handle adm wrapped with native key', function() {
      const wrappedAdm = JSON.stringify({
        native: {
          assets: [{ id: 1, img: { type: 3, url: 'https://images.mediago.io/img/wrapped.png', w: 300, h: 157 } }],
          link: { url: 'https://trace.mediago.io/ju/ic?wrapped=1' }
        }
      });
      const wrappedResponse = {
        body: { id: 'mgprebidjs_wrapped', seatbid: [{ bid: [{ id: 'bid-wrapped', impid: 'native-bid-1', price: 0.2, adm: wrappedAdm, crid: 'crid-w' }] }], cur: 'USD' }
      };
      const bids = spec.interpretResponse(wrappedResponse, bidRequest);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].native.ortb.assets[0].img.url).to.equal('https://images.mediago.io/img/wrapped.png');
      expect(bids[0].native.ortb.link.url).to.include('wrapped=1');
    });

    it('should skip bid when adm is invalid JSON', function() {
      const invalidResponse = {
        body: { id: 'mgprebidjs_invalid', seatbid: [{ bid: [{ id: 'bid-inv', impid: 'native-bid-1', price: 0.1, adm: 'not-valid-json{{{', crid: 'crid-inv' }] }], cur: 'USD' }
      };
      expect(spec.interpretResponse(invalidResponse, bidRequest)).to.have.lengthOf(0);
    });

    it('should default to banner when _mediaTypeMap is not provided', function() {
      const bids = spec.interpretResponse(nativeServerResponse, {});
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].ad).to.be.a('string');
      expect(bids[0].native).to.be.undefined;
    });

    it('should handle mixed banner and native responses', function() {
      const mixedResponse = {
        body: {
          id: 'mgprebidjs_mixed',
          seatbid: [{
            bid: [
              { id: 'bid-banner', impid: 'banner-bid-1', price: 0.5, adm: '<div>banner</div>', crid: 'crid-b', w: 300, h: 250 },
              { id: 'bid-native', impid: 'native-bid-1', price: 0.15, adm: nativeAdm, crid: 'crid-n' }
            ]
          }],
          cur: 'USD'
        }
      };
      const mixedBidRequest = { _mediaTypeMap: { 'banner-bid-1': 'banner', 'native-bid-1': 'native' } };
      const bids = spec.interpretResponse(mixedResponse, mixedBidRequest);

      expect(bids).to.have.lengthOf(2);
      const bannerBid = bids.find(b => b.requestId === 'banner-bid-1');
      expect(bannerBid.mediaType).to.equal('banner');
      expect(bannerBid.width).to.equal(300);
      expect(bannerBid.height).to.equal(250);

      const nativeBid = bids.find(b => b.requestId === 'native-bid-1');
      expect(nativeBid.mediaType).to.equal('native');
      expect(nativeBid.width).to.equal(1);
      expect(nativeBid.native.ortb.assets).to.have.lengthOf(3);
    });
  });
});
