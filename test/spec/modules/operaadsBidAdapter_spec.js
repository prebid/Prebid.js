import {expect} from 'chai';
import {spec} from 'modules/operaadsBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from 'src/mediaTypes.js';

describe('Opera Ads Bid Adapter', function () {
  describe('Test isBidRequestValid', function () {
    it('undefined bid should return false', function () {
      expect(spec.isBidRequestValid()).to.be.false;
    });

    it('null bid should return false', function () {
      expect(spec.isBidRequestValid(null)).to.be.false;
    });

    it('bid.params should be set', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('bid.params.placementId should be set', function () {
      expect(spec.isBidRequestValid({
        params: { endpointId: 'ep12345678', publisherId: 'pub12345678' }
      })).to.be.false;
    });

    it('bid.params.publisherId should be set', function () {
      expect(spec.isBidRequestValid({
        params: { placementId: 's12345678', endpointId: 'ep12345678' }
      })).to.be.false;
    });

    it('bid.params.endpointId should be set', function () {
      expect(spec.isBidRequestValid({
        params: { placementId: 's12345678', publisherId: 'pub12345678' }
      })).to.be.false;
    });

    it('valid bid should return true', function () {
      expect(spec.isBidRequestValid({
        params: { placementId: 's12345678', endpointId: 'ep12345678', publisherId: 'pub12345678' }
      })).to.be.true;
    });
  });

  describe('Test buildRequests', function () {
    const bidderRequest = {
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      auctionStart: Date.now(),
      bidderCode: 'myBidderCode',
      bidderRequestId: '15246a574e859f',
      refererInfo: {
        page: 'http://example.com',
        stack: ['http://example.com']
      },
      gdprConsent: {
        gdprApplies: true,
        consentString: 'IwuyYwpjmnsauyYasIUWwe'
      },
      uspConsent: 'Oush3@jmUw82has',
      timeout: 3000
    };

    it('build request object', function () {
      const bidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          }
        },
        {
          adUnitCode: 'test-native',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f4622',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            native: {
              title: {
                required: true,
                len: 20,
              },
              image: {
                required: true,
                sizes: [300, 250],
                aspect_ratios: [{
                  ratio_width: 1,
                  ratio_height: 1
                }]
              },
              icon: {
                required: true,
                sizes: [60, 60],
                aspect_ratios: [{
                  ratio_width: 1,
                  ratio_height: 1
                }]
              },
              sponsoredBy: {
                required: true,
                len: 20
              },
              body: {
                required: true,
                len: 140
              },
              cta: {
                required: true,
                len: 20,
              }
            }
          },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          }
        },
        {
          adUnitCode: 'test-native2',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f4632',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            native: {
              title: {},
              image: {},
              icon: {},
              sponsoredBy: {},
              body: {},
              cta: {}
            }
          },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          }
        },
        {
          adUnitCode: 'test-native3',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f4633',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            native: {},
          },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          }
        },
        {
          adUnitCode: 'test-video',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f4623',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [[640, 480]],
              mimes: ['video/mp4'],
              protocols: [2, 3, 5, 6],
              startdelay: 0,
              skip: 1,
              playbackmethod: [1, 2, 3, 4],
              delivery: [1],
              api: [1, 2, 5],
            }
          },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          }
        },
        {
          adUnitCode: 'test-video',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f4643',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            video: {}
          },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          }
        }
      ];

      let reqs;

      expect(function () {
        reqs = spec.buildRequests(bidRequests, bidderRequest);
      }).to.not.throw();

      expect(reqs).to.be.an('array').that.have.lengthOf(bidRequests.length);

      for (let i = 0, len = reqs.length; i < len; i++) {
        const req = reqs[i];
        const bidRequest = bidRequests[i];

        expect(req.method).to.equal('POST');
        expect(req.url).to.equal('https://s.oa.opera.com/ortb/v2/' +
          bidRequest.params.publisherId + '?ep=' + bidRequest.params.endpointId);

        expect(req.options).to.be.an('object');
        expect(req.options.contentType).to.contain('application/json');
        expect(req.options.customHeaders).to.be.an('object');
        expect(req.options.customHeaders['x-openrtb-version']).to.equal(2.5);

        expect(req.originalBidRequest).to.equal(bidRequest);

        expect(req.data).to.be.a('string');

        let requestData;
        expect(function () {
          requestData = JSON.parse(req.data);
        }).to.not.throw();

        expect(requestData.id).to.exist;
        expect(requestData.tmax).to.equal(bidderRequest.timeout);
        expect(requestData.test).to.equal(0);
        expect(requestData.imp).to.be.an('array').that.have.lengthOf(1);
        expect(requestData.device).to.be.an('object');
        expect(requestData.site).to.be.an('object');
        expect(requestData.site.id).to.equal(bidRequest.params.publisherId);
        expect(requestData.site.domain).to.not.be.empty;
        expect(requestData.site.page).to.equal(bidderRequest.refererInfo.page);
        expect(requestData.at).to.equal(1);
        expect(requestData.bcat).to.be.an('array').that.is.empty;
        expect(requestData.cur).to.be.an('array').that.not.be.empty;
        expect(requestData.user).to.be.an('object');

        const impItem = requestData.imp[0];
        expect(impItem).to.be.an('object');
        expect(impItem.id).to.equal(bidRequest.bidId);
        expect(impItem.tagid).to.equal(bidRequest.params.placementId);
        expect(impItem.bidfloor).to.be.a('number');

        if (bidRequest.mediaTypes.banner) {
          expect(impItem.banner).to.be.an('object');
        } else if (bidRequest.mediaTypes.native) {
          expect(impItem.native).to.be.an('object');
        } else if (bidRequest.mediaTypes.video) {
          expect(impItem.video).to.be.an('object');
        } else {
          expect.fail('should not happen');
        }
      }
    });

    describe('test fulfilling inventory information', function () {
      const bidRequest = {
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'operaads',
        bidderRequestId: '15246a574e859f',
        mediaTypes: {
          banner: {sizes: [[300, 250]]}
        },
        params: {
          placementId: 's12345678',
          publisherId: 'pub12345678',
          endpointId: 'ep12345678'
        }
      }

      const getRequest = function () {
        let reqs;
        expect(function () {
          reqs = spec.buildRequests([bidRequest], bidderRequest);
        }).to.not.throw();
        return JSON.parse(reqs[0].data);
      }

      it('test default case', function () {
        const requestData = getRequest();
        expect(requestData.site).to.be.an('object');
        expect(requestData.site.id).to.equal(bidRequest.params.publisherId);
        expect(requestData.site.domain).to.not.be.empty;
        expect(requestData.site.page).to.equal(bidderRequest.refererInfo.page);
      });

      it('test a case with site information specified', function () {
        bidRequest.params = {
          placementId: 's12345678',
          publisherId: 'pub12345678',
          endpointId: 'ep12345678',
          site: {
            name: 'test-site-1',
            domain: 'www.test.com'
          }
        }
        const requestData = getRequest();
        expect(requestData.site).to.be.an('object');
        expect(requestData.site.id).to.equal(bidRequest.params.publisherId);
        expect(requestData.site.name).to.equal('test-site-1');
        expect(requestData.site.domain).to.equal('www.test.com');
        expect(requestData.site.page).to.equal(bidderRequest.refererInfo.page);
      });

      it('test a case with app information specified', function () {
        bidRequest.params = {
          placementId: 's12345678',
          publisherId: 'pub12345678',
          endpointId: 'ep12345678',
          app: {
            name: 'test-app-1'
          }
        }
        const requestData = getRequest();
        expect(requestData.app).to.be.an('object');
        expect(requestData.app.id).to.equal(bidRequest.params.publisherId);
        expect(requestData.app.name).to.equal('test-app-1');
        expect(requestData.app.domain).to.not.be.empty;
      });

      it('test a case with both site and app information specified', function () {
        bidRequest.params = {
          placementId: 's12345678',
          publisherId: 'pub12345678',
          endpointId: 'ep12345678',
          site: {
            name: 'test-site-2',
            page: 'test-page'
          },
          app: {
            name: 'test-app-1'
          }
        }
        const requestData = getRequest();
        expect(requestData.site).to.be.an('object');
        expect(requestData.site.id).to.equal(bidRequest.params.publisherId);
        expect(requestData.site.name).to.equal('test-site-2');
        expect(requestData.site.page).to.equal('test-page');
        expect(requestData.site.domain).to.not.be.empty;
      });
    });

    it('test getBidFloor', function() {
      const bidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          },
          getFloor: function() {
            return {
              currency: 'USD',
              floor: 0.1
            }
          }
        }
      ];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      expect(reqs).to.be.an('array').that.have.lengthOf(1);

      for (const req of reqs) {
        let requestData;
        expect(function () {
          requestData = JSON.parse(req.data);
        }).to.not.throw();

        expect(requestData.imp).to.be.an('array').that.have.lengthOf(1);
        expect(requestData.imp[0].bidfloor).to.be.equal(0.1);
        expect(requestData.imp[0].bidfloorcur).to.be.equal('USD');
      }
    });

    it('bcat in params should be used', function () {
      const bidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678',
            bcat: ['IAB1-1']
          }
        }
      ];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      expect(reqs).to.be.an('array').that.have.lengthOf(1);

      for (const req of reqs) {
        let requestData;
        expect(function () {
          requestData = JSON.parse(req.data);
        }).to.not.throw();

        expect(requestData.bcat).to.be.an('array').that.includes('IAB1-1');
      }
    });

    it('sharedid should be used', function () {
      const bidRequests = [{
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'operaads',
        bidderRequestId: '15246a574e859f',
        mediaTypes: {
          banner: { sizes: [[300, 250]] }
        },
        params: {
          placementId: 's12345678',
          publisherId: 'pub12345678',
          endpointId: 'ep12345678'
        },
        userId: {
          sharedid: {
            id: '01F5DEQW731Q2VKT031KBKMW5W'
          }
        },
        userIdAsEids: [{
          source: 'pubcid.org',
          uids: [{
            atype: 1,
            id: '01F5DEQW731Q2VKT031KBKMW5W'
          }]
        }]
      }];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      let requestData;
      expect(function () {
        requestData = JSON.parse(reqs[0].data);
      }).to.not.throw();

      expect(requestData.user.buyeruid).to.equal(bidRequests[0].userId.sharedid.id);
    });

    it('pubcid should be used when sharedid is empty', function () {
      const bidRequests = [{
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'operaads',
        bidderRequestId: '15246a574e859f',
        mediaTypes: {
          banner: { sizes: [[300, 250]] }
        },
        params: {
          placementId: 's12345678',
          publisherId: 'pub12345678',
          endpointId: 'ep12345678'
        },
        userId: {
          'pubcid': '21F5DEQW731Q2VKT031KBKMW5W'
        },
        userIdAsEids: [{
          source: 'pubcid.org',
          uids: [{
            atype: 1,
            id: '21F5DEQW731Q2VKT031KBKMW5W'
          }]
        }]
      }];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      let requestData;
      expect(function () {
        requestData = JSON.parse(reqs[0].data);
      }).to.not.throw();

      expect(requestData.user.buyeruid).to.equal(bidRequests[0].userId.pubcid);
    });

    it('random uid will be generate when userId is empty', function () {
      const bidRequests = [{
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'operaads',
        bidderRequestId: '15246a574e859f',
        mediaTypes: {
          banner: { sizes: [[300, 250]] }
        },
        params: {
          placementId: 's12345678',
          publisherId: 'pub12345678',
          endpointId: 'ep12345678'
        }
      }];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      let requestData;
      expect(function () {
        requestData = JSON.parse(reqs[0].data);
      }).to.not.throw();

      expect(requestData.user.buyeruid).to.not.be.empty;
    })
  });

  describe('Test adapter request', function () {
    const adapter = newBidder(spec);

    it('adapter.callBids exists and is a function', function () {
      expect(adapter.callBids).to.be.a('function');
    });
  });

  describe('Test response interpretResponse', function () {
    it('Test banner interpretResponse', function () {
      const serverResponse = {
        body: {
          'id': 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '003004d9c05c6bc7fec0',
                  'impid': '22c4871113f461',
                  'price': 1.04,
                  'nurl': 'https://s.oa.opera.com/win',
                  'lurl': 'https://s.oa.opera.com/loss',
                  'adm': '<img src="https://res.adx.opera.com/xxx.jpeg" width="300" height="250" />',
                  'adomain': [
                    'opera.com',
                  ],
                  'cid': '0.49379027',
                  'crid': '0.49379027',
                  'cat': [
                    'IAB9-31',
                    'IAB8'
                  ],
                  'language': 'EN',
                  'h': 300,
                  'w': 250,
                  'exp': 500,
                  'ext': {}
                }
              ],
              'seat': 'adv4199760017536'
            }
          ],
          'bidid': '003004d9c05c6bc7fec0',
          'cur': 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        originalBidRequest: {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          params: {
            placementId: 's12345678',
            publisherId: 'pub123456',
            endpointId: 'ep1234566'
          },
          src: 'client',
          transactionId: '4781e6ac-93c4-42ba-86fe-ab5f278863cf'
        }
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bid = serverResponse.body.seatbid[0].bid[0];
      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(BANNER);
      expect(bidResponse.requestId).to.equal(bid.impid);
      expect(bidResponse.cpm).to.equal(parseFloat(bid.price).toFixed(2))
      expect(bidResponse.currency).to.equal(serverResponse.body.cur);
      expect(bidResponse.creativeId).to.equal(bid.crid || bid.id);
      expect(bidResponse.netRevenue).to.be.true;
      expect(bidResponse.nurl).to.equal(bid.nurl);
      expect(bidResponse.lurl).to.equal(bid.lurl);

      expect(bidResponse.meta).to.be.an('object');
      expect(bidResponse.meta.mediaType).to.equal(BANNER);
      expect(bidResponse.meta.primaryCatId).to.equal('IAB9-31');
      expect(bidResponse.meta.secondaryCatIds).to.deep.equal(['IAB8']);
      expect(bidResponse.meta.advertiserDomains).to.deep.equal(bid.adomain);
      expect(bidResponse.meta.clickUrl).to.equal(bid.adomain[0]);

      expect(bidResponse.ad).to.equal(bid.adm);
      expect(bidResponse.width).to.equal(bid.w);
      expect(bidResponse.height).to.equal(bid.h);
    });

    it('Test video interpretResponse', function () {
      const serverResponse = {
        body: {
          'id': 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '003004d9c05c6bc7fec0',
                  'impid': '22c4871113f461',
                  'price': 1.04,
                  'nurl': 'https://s.oa.opera.com/win',
                  'lurl': 'https://s.oa.opera.com/loss',
                  'adm': '<VAST version="2.0"><Ad id="static"><InLine><AdSystem>Static VAST Template</AdSystem><AdTitle>Static VAST Tag</AdTitle><Impression>http://example.com/pixel.gif?asi=[ADSERVINGID]</Impression><Creatives><Creative><Linear><Duration>00:00:08</Duration><TrackingEvents><Tracking event="start">http://example.com/pixel.gif</Tracking><Tracking event="firstQuartile">http://example.com/pixel.gif</Tracking><Tracking event="midpoint">http://example.com/pixel.gif</Tracking><Tracking event="thirdQuartile">http://example.com/pixel.gif</Tracking><Tracking event="complete">http://example.com/pixel.gif</Tracking><Tracking event="pause">http://example.com/pixel.gif</Tracking><Tracking event="mute">http://example.com/pixel.gif</Tracking><Tracking event="fullscreen">http://example.com/pixel.gif</Tracking></TrackingEvents><VideoClicks><ClickThrough>http://www.jwplayer.com/</ClickThrough><ClickTracking>http://example.com/pixel.gif?r=[REGULATIONS]&gdpr=[GDPRCONSENT]&pu=[PAGEURL]&da=[DEVICEUA]</ClickTracking></VideoClicks><MediaFiles><MediaFile type="video/mp4" bitrate="300" width="480" height="270"> http://example.com/uploads/myPrerollVideo.mp4</MediaFile></MediaFiles><Icons><Icon program="AdChoices" height="16" width="16" xPosition="right" yPosition="top"><StaticResource creativeType="image/png"> https://example.com/adchoices-sm.png</StaticResource><Iconclicks><IconClickThrough>https://sample-url.com</IconClickThrough></IconClicks></Icon></Icons></Linear></Creative></Creatives></InLine></Ad></VAST>',
                  'adomain': [
                    'opera.com',
                  ],
                  'cid': '0.49379027',
                  'crid': '0.49379027',
                  'cat': [
                    'IAB9-31',
                    'IAB8'
                  ],
                  'language': 'EN',
                  'h': 300,
                  'w': 250,
                  'exp': 500,
                  'ext': {}
                }
              ],
              'seat': 'adv4199760017536'
            }
          ],
          'bidid': '003004d9c05c6bc7fec0',
          'cur': 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        originalBidRequest: {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: { video: { context: 'outstream' } },
          params: {
            placementId: 's12345678',
            publisherId: 'pub123456',
            endpointId: 'ep1234566'
          },
          src: 'client',
          transactionId: '4781e6ac-93c4-42ba-86fe-ab5f278863cf'
        }
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bid = serverResponse.body.seatbid[0].bid[0];
      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(VIDEO);
      expect(bidResponse.vastXml).to.equal(bid.adm);
      expect(bidResponse.width).to.equal(bid.w);
      expect(bidResponse.height).to.equal(bid.h);

      expect(bidResponse.adResponse).to.be.an('object');
      expect(bidResponse.renderer).to.be.an('object');
    });

    it('Test native interpretResponse', function () {
      const serverResponse = {
        body: {
          'id': 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '003004d9c05c6bc7fec0',
                  'impid': '22c4871113f461',
                  'price': 1.04,
                  'nurl': 'https://s.oa.opera.com/win',
                  'lurl': 'https://s.oa.opera.com/loss',
                  'adm': '{"native":{"ver":"1.1","assets":[{"id":1,"required":1,"title":{"text":"The first personal browser"}},{"id":2,"required":1,"img":{"url":"https://res.adx.opera.com/xxx.png","w":720,"h":1280}},{"id":3,"required":1,"img":{"url":"https://res.adx.opera.com/xxx.png","w":60,"h":60}},{"id":4,"required":1,"data":{"value":"Download Opera","len":14}},{"id":5,"required":1,"data":{"value":"Opera","len":5}},{"id":6,"required":1,"data":{"value":"Download","len":8}}],"link":{"url":"https://www.opera.com/mobile/opera","clicktrackers":["https://thirdpart-click.tracker.com","https://t-odx.op-mobile.opera.com/click"]},"imptrackers":["https://thirdpart-imp.tracker.com","https://t-odx.op-mobile.opera.com/impr"],"jstracker":"<script src=\\"https://t-odx.op-mobile.opera.com/jstracker\\"></script>"}}',
                  'adomain': [
                    'opera.com',
                  ],
                  'cid': '0.49379027',
                  'crid': '0.49379027',
                  'cat': [
                    'IAB9-31',
                    'IAB8'
                  ],
                  'language': 'EN',
                  'h': 300,
                  'w': 250,
                  'exp': 500,
                  'ext': {}
                }
              ],
              'seat': 'adv4199760017536'
            }
          ],
          'bidid': '003004d9c05c6bc7fec0',
          'cur': 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        originalBidRequest: {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: { native: { } },
          params: {
            placementId: 's12345678',
            publisherId: 'pub123456',
            endpointId: 'ep1234566'
          },
          src: 'client',
          transactionId: '4781e6ac-93c4-42ba-86fe-ab5f278863cf'
        }
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(NATIVE)
      expect(bidResponse.native).to.be.an('object');
      expect(bidResponse.native.clickUrl).is.not.empty;
      expect(bidResponse.native.clickTrackers).to.have.lengthOf(2);
      expect(bidResponse.native.impressionTrackers).to.have.lengthOf(2);
      expect(bidResponse.native.javascriptTrackers).to.have.lengthOf(1);
    });

    it('Test empty server response', function () {
      const bidResponses = spec.interpretResponse({}, {});

      expect(bidResponses).to.be.an('array').that.is.empty;
    });

    it('Test empty bid response', function () {
      const bidResponses = spec.interpretResponse({ body: { seatbid: null } }, {});

      expect(bidResponses).to.be.an('array').that.is.empty;
    });
  });

  describe('Test getUserSyncs with both iframe and pixel disabled', function () {
    it('getUserSyncs should return an empty array', function () {
      const syncOptions = {};
      expect(spec.getUserSyncs(syncOptions)).to.be.an('array').that.is.empty;
    });
  });

  describe('Test getUserSyncs with iframe enabled', function () {
    it('getUserSyncs should return array', function () {
      const syncOptions = {
        iframeEnabled: true
      }
      const userSyncPixels = spec.getUserSyncs(syncOptions)
      expect(userSyncPixels).to.have.lengthOf(1);
      expect(userSyncPixels[0].url).to.equal('https://s.oa.opera.com/usersync/page')
    });
  });

  describe('Test getUserSyncs with pixel enabled', function () {
    it('getUserSyncs should return array', function () {
      const serverResponse = {
        body: {
          'pixels': [
            'https://b1.com/usersync',
            'https://b2.com/usersync'
          ]
        }
      };
      const syncOptions = {
        pixelEnabled: true
      }
      const userSyncPixels = spec.getUserSyncs(syncOptions, [serverResponse])
      expect(userSyncPixels).to.have.lengthOf(2);
      expect(userSyncPixels[0].url).to.equal('https://b1.com/usersync')
      expect(userSyncPixels[1].url).to.equal('https://b2.com/usersync')
    });
  });

  describe('Test onTimeout', function () {
    it('onTimeout should not throw', function () {
      expect(spec.onTimeout()).to.not.throw;
    });
  });

  describe('Test onBidWon', function () {
    it('onBidWon should not throw', function () {
      expect(spec.onBidWon({nurl: '#', originalCpm: '1.04', currency: 'USD'})).to.not.throw;
    });
  });

  describe('Test onSetTargeting', function () {
    it('onSetTargeting should not throw', function () {
      expect(spec.onSetTargeting()).to.not.throw;
    });
  });
});
