import {
  expect
} from 'chai';
import {
  spec
} from 'modules/reforgeBidAdapter.js';

describe('The reforge adapter', function () {
  function getValidBidObject() {
    return {
      bidId: '2a23281f1dffa7',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      },
      params: {
        id: 'c33d3e84b93d4e2a44b4f22434ef99441678',
        at: 2,
        tmax: 410,
        cur: [
          'USD'
        ],
        bcat: [
          'IAB26',
          'IAB25',
          'IAB24'
        ],
        imp: [
          {
            id: '1',
            instl: 0,
            bidfloor: 0,
            bidfloorcur: 'USD',
            banner: {
              w: 300,
              h: 250,
              id: '1',
              btype: [
                4
              ],
              battr: [
                8,
                10
              ],
              topframe: 0,
              api: [
                3,
                5
              ],
              pos: 0,
              wmax: 300,
              hmax: 250
            },
            secure: 1
          }
        ],
        app: {
          id: '633a673ef641',
          name: 'Weather- The Weather Channel',
          bundle: 'com.baloota.dumpster',
          cat: [
            'IAB15',
            'IAB15-10'
          ],
          publisher: {
            id: '80862'
          },
          storeurl: 'https://itunes.apple.com/app/id295646461'
        },
        device: {
          dnt: 0,
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          ip: '132.154.88.63',
          geo: {
            lat: 41.9005012512207,
            lon: -84.04460144042969,
            type: 1,
            country: 'IND'
          },
          dpidsha1: '3F6024142B7507B5096F6682E849F813BD1FDB76',
          dpidmd5: '7427557F92409725DB975392832DE653',
          make: 'Apple',
          model: 'iPhone',
          os: 'iOS',
          osv: '12.2',
          devicetype: 4,
          js: 1,
          connectiontype: 2,
          carrier: 'WIFI',
          ifa: '3c098d88-3b09-42c2-86c2-954236d26a19'
        },
        user: {
          id: '3c098d88-3b09-42c2-86c2-954236d26a87'
        },
        ext: {
          udi: {
            idfa: '3c098d88-3b09-42c2-86c2-954236d26a86'
          },
          fd: 0,
          utctimestamp: '1561101479962',
          utcdatetime: '2019-06-21 07:17:59'
        }
      }

    };
  };

  describe('isBidRequestValid', function () {
    var bid;

    beforeEach(function () {
      bid = getValidBidObject();
    });

    // it('should fail validation if the bid isn\'t defined or not an object', function () {
    //   var result = spec.isBidRequestValid();

    //   expect(result).to.equal(false);

    //   result = spec.isBidRequestValid('not an object');

    //   expect(result).to.equal(false);
    // });

    it('should succeed validation with all the right parameters', function () {
      expect(spec.isBidRequestValid(getValidBidObject())).to.equal(true);
    });

    // it('should succeed validation with mediaType and outstream_function or outstream_options', function () {
    //   bid.mediaType = 'banner';
    //   bid.params.outstream_function = 'outstream_func';

    //   expect(spec.isBidRequestValid(bid)).to.equal(true);

    //   delete bid.params.outstream_function;
    //   bid.params.outstream_options = {
    //     slot: 'yourelementid'
    //   };

    //   expect(spec.isBidRequestValid(bid)).to.equal(true);
    // });

    // it('should succeed with ad_unit outstream and outstream function set', function () {
    //   bid.params.ad_unit = 'outstream';
    //   bid.params.outstream_function = function () {};
    //   expect(spec.isBidRequestValid(bid)).to.equal(true);
    // });

    // it('should succeed with mediaTypes_video_context outstream, options set for outstream and slot provided', function () {
    //   bid.mediaTypes.video.context = 'outstream';
    //   bid.params.outstream_options = {
    //     slot: 'yourelementid'
    //   };
    //   expect(spec.isBidRequestValid(bid)).to.equal(true);
    // });

    // it('should fail without banner', function () {
    //   delete bid.mediaTypes.banner;
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail without playerSize', function () {
    //   delete bid.mediaTypes.video.playerSize;
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail without tagId', function () {
    //   delete bid.params.tagId;
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail without publisherId', function () {
    //   delete bid.params.publisherId;
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail without siteId', function () {
    //   delete bid.params.siteId;
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail without bidfloor', function () {
    //   delete bid.params.bidfloor;
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail without bidfloorcur', function () {
    //   delete bid.params.bidfloorcur;
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail with context outstream but no options set for outstream', function () {
    //   bid.mediaTypes.video.context = 'outstream';
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should fail with context outstream, options set for outstream but no slot provided', function () {
    //   bid.mediaTypes.video.context = 'outstream';
    //   bid.params.outstream_options = {};
    //   expect(spec.isBidRequestValid(bid)).to.equal(false);
    // });

    // it('should succeed with context outstream, options set for outstream but no outstream_function is set', function () {
    //   bid.mediaTypes.video.context = 'outstream';
    //   bid.params.outstream_options = {
    //     slot: 'yourelementid'
    //   };
    //   expect(spec.isBidRequestValid(bid)).to.equal(true);
    // });
  });

  describe('buildRequests', function () {
    var bid,
      bidRequestObj;

    beforeEach(function () {
      bid = getValidBidObject();
      bidRequestObj = {
        refererInfo: {
          referer: 'prebid.js'
        }
      };
    });

    // it('should build a very basic request', function () {
    //   var request = spec.buildRequests([bid], bidRequestObj)[0];
    //   expect(request.method).to.equal('POST');
    //   expect(request.url).to.equal('http://use.reforge.in/bid?rtb_seat_id=0011&secret_key=wzP8eKAVkc&type=prebid&appid=40');
    //   expect(request.bidRequest).to.equal(bidRequestObj);
    //   expect(request.data.imp.id).to.match(/\d+/);
    //   expect(request.data.imp.secure).to.equal(0);

    //   expect(request.data.imp.video).to.deep.equal({
    //     ext: {
    //       sdk_name: 'Prebid 1+'
    //     },
    //     h: '360',
    //     w: '640',
    //     mimes: [
    //       'application/javascript', 'video/mp4', 'video/webm'
    //     ],
    //     api: [2],
    //     delivery: [2],
    //     linearity: 1,
    //     maxbitrate: 3500,
    //     maxduration: 500,
    //     minbitrate: 0,
    //     minduration: 0,
    //     protocols: [
    //       2, 3, 5, 6
    //     ],
    //     startdelay: 0,
    //     placement: 1,
    //     pos: 1
    //   });

    //   expect(request.data.site).to.deep.equal({
    //     content: 'content',
    //     id: '__name__',
    //     page: 'prebid.js',
    //     cat: '',
    //     domain: '',
    //     publisher: {
    //       id: '__name__'
    //     }
    //   });
    // });

    // it('should change request parameters based on options sent', function () {
    //   var request = spec.buildRequests([bid], bidRequestObj)[0];

    //   expect(request.data.imp.video.ext).to.deep.equal({
    //     sdk_name: 'Prebid 1+'
    //   });

    //   expect(request.data.imp.video).to.contain({
    //     placement: 1
    //   });

    //   bid.mediaTypes.video.context = 'outstream';

    //   bid.params = {
    //     outstream_options: {
    //       foo: 'bar'
    //     },
    //     outstream_function: '987',
    //     mimes: 'foo',
    //     linearity: 2,
    //     minduration: 5,
    //     maxduration: 10,
    //     startdelay: 1,
    //     minbitrate: 50,
    //     maxbitrate: 500,
    //     delivery: [1],
    //     pos: 2,
    //     api: [1],
    //     protocols: [
    //       2, 3, 5
    //     ],
    //     bidfloor: 55,
    //     bidfloorcur: 'foo',
    //     at: 1,
    //     cur: ['FOO']
    //   };

    //   request = spec.buildRequests([bid], bidRequestObj)[0];

    //   expect(request.data.imp.video.ext).to.deep.equal({
    //     sdk_name: 'Prebid 1+'
    //   });

    //   expect(request.data.imp.video).to.contain({
    //     minduration: 5,
    //     maxduration: 10
    //   });

    //   expect(request.data.imp.video.startdelay).to.equal(1);

    //   expect(request.data.imp.video).to.contain({
    //     placement: 3
    //   });

    //   expect(request.data.imp.bidfloor).to.equal(55);

    //   expect(request.data.imp.bidfloorcur).to.equal('foo');

    //   expect(request.data.imp.video.linearity).to.equal(2);

    //   expect(request.data.imp.video.minbitrate).to.equal(50);

    //   expect(request.data.imp.video.maxbitrate).to.equal(500);
    // });

    // it('should pass GDPR params', function () {
    //   var request;

    //   bidRequestObj.gdprConsent = {
    //     gdprApplies: true,
    //     consentString: 'foo'
    //   }

    //   request = spec.buildRequests([bid], bidRequestObj)[0];

    //   expect(request.data.regs.ext.gdpr).to.equal(1);
    //   expect(request.data.user.ext.consent).to.be.an('string');
    //   expect(request.data.user.ext.consent).to.equal('foo');
    // });

    // it('should pass emq params', function () {
    //   var request;

    //   bid.params.user = {
    //     data: [{
    //       id: 'emq',
    //       name: 'emq',
    //       segment: [{
    //         name: 'emq',
    //         value: 'foo'
    //       }]
    //     }]
    //   }

    //   request = spec.buildRequests([bid], bidRequestObj)[0];

    //   expect(request.data.user.data).to.deep.equal([{
    //     id: 'emq',
    //     name: 'emq',
    //     segment: {
    //       name: 'emq',
    //       value: 'foo'
    //     }
    //   }]);
    // });

    // it('should pass crumbs params', function () {
    //   var request;

    //   bid.crumbs = {
    //     pubcid: 'pubcid_1'
    //   };

    //   request = spec.buildRequests([bid], bidRequestObj)[0];

    //   expect(request.data.user.ext).to.contain({
    //     fpc: 'pubcid_1'
    //   });
    // });

    // it('should pass linearity params', function () {
    //   var request;

    //   bid.params.linearity = 3

    //   request = spec.buildRequests([bid], bidRequestObj)[0];

    //   expect(request.data.imp.video.linearity).to.equal(3);
    // });

    // it('should pass min and max duration params', function () {
    //   var request;

    //   bid.params.minduration = 3
    //   bid.params.maxduration = 15

    //   request = spec.buildRequests([bid], bidRequestObj)[0];

    //   expect(request.data.imp.video.minduration).to.equal(3);
    //   expect(request.data.imp.video.maxduration).to.equal(15);
    // });
  });

  describe('interpretResponse', function () {
    var serverResponse, bidderRequestObj;

    beforeEach(function () {
      bidderRequestObj = {
        bidRequest: {
          bids: [{
            mediaTypes: {
              banner: {
                sizes: [
                  [300, 250]
                ]
              }
            },
            bidId: '2a23281f1dffa7',
            params: {
              id: 'c33d3e84b93d4e2a44b4f22434ef99441678',
              at: 2,
              tmax: 410,
              cur: [
                'USD'
              ],
              bcat: [
                'IAB26',
                'IAB25',
                'IAB24'
              ],
              imp: [
                {
                  id: '1',
                  instl: 0,
                  bidfloor: 0,
                  bidfloorcur: 'USD',
                  banner: {
                    w: 300,
                    h: 250,
                    id: '1',
                    btype: [
                      4
                    ],
                    battr: [
                      8,
                      10
                    ],
                    topframe: 0,
                    api: [
                      3,
                      5
                    ],
                    pos: 0,
                    wmax: 300,
                    hmax: 250
                  },
                  secure: 1
                }
              ],
              app: {
                id: '633a673ef641',
                name: 'Weather- The Weather Channel',
                bundle: 'com.baloota.dumpster',
                cat: [
                  'IAB15',
                  'IAB15-10'
                ],
                publisher: {
                  id: '80862'
                },
                storeurl: 'https://itunes.apple.com/app/id295646461'
              },
              device: {
                dnt: 0,
                ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                ip: '132.154.88.63',
                geo: {
                  lat: 41.9005012512207,
                  lon: -84.04460144042969,
                  type: 1,
                  country: 'IND'
                },
                dpidsha1: '3F6024142B7507B5096F6682E849F813BD1FDB76',
                dpidmd5: '7427557F92409725DB975392832DE653',
                make: 'Apple',
                model: 'iPhone',
                os: 'iOS',
                osv: '12.2',
                devicetype: 4,
                js: 1,
                connectiontype: 2,
                carrier: 'WIFI',
                ifa: '3c098d88-3b09-42c2-86c2-954236d26a19'
              },
              user: {
                id: '3c098d88-3b09-42c2-86c2-954236d26a87'
              },
              ext: {
                udi: {
                  idfa: '3c098d88-3b09-42c2-86c2-954236d26a86'
                },
                fd: 0,
                utctimestamp: '1561101479962',
                utcdatetime: '2019-06-21 07:17:59'
              }
            }
          }]
        }
      };

      serverResponse = {
        body: {
          id: 'bS9195DFN716bZbkdE360P85fIfe2EJ73fd187vhN27MbwK3b3667219enbasGbR',
          seatbid: [{
            bid: [{
              id: 'cdnp.GenericBuysidePartner5e04b0bc51e9d7.80602994',
              impid: 182,
              price: 0.15001,
              adid: 'cdnp.GenericBuysidePartner5e04b0bc51e9d7.80602994',
              adm: "<script src='http:\/\/abc.in\/win?i=Qgdb76g6hiY_0&f=js'><\/script><img class='impression_trackers' src='https:\/\/usei.reforge.in\/delivery\/impress?zoneid=23245&buyerid=0055&type=banner&pubid=237&pub_pack=com.nemo.vidmate&extra3=f1f254a57c6e7f138c6081a3ee6fb266&fromdsp=1&winbid=${AUCTION_PRICE}' height='0' width='0' \/>",
              adomain: [
                'reforge.in'
              ],
              cid: '22553_93988',
              crid: '23245_93988'
            }],
            seat: 'reforge'
          }],
          cur: 'USD'
        }
      };
    });

    // it('should return an array of bid responses', function () {
    //   var responses = spec.interpretResponse(serverResponse, bidderRequestObj);
    //   expect(responses).to.be.an('array').with.length(2);
    //   expect(responses[0].requestId).to.equal(123);
    //   expect(responses[0].currency).to.equal('USD');
    //   expect(responses[0].cpm).to.equal(12);
    //   expect(responses[0].creativeId).to.equal(321);
    //   expect(responses[0].ttl).to.equal(360);
    //   expect(responses[0].netRevenue).to.equal(true);
    //   expect(responses[0].mediaType).to.equal('video');
    //   expect(responses[0].width).to.equal(400);
    //   expect(responses[0].height).to.equal(300);
    //   expect(responses[1].requestId).to.equal(124);
    //   expect(responses[1].currency).to.equal('USD');
    //   expect(responses[1].cpm).to.equal(13);
    //   expect(responses[1].creativeId).to.equal(654);
    //   expect(responses[1].ttl).to.equal(360);
    //   expect(responses[1].netRevenue).to.equal(true);
    //   expect(responses[1].mediaType).to.equal('video');
    //   expect(responses[1].width).to.equal(200);
    //   expect(responses[1].height).to.equal(100);
    // });
  });

  // describe('oustreamRender', function () {
  //   var serverResponse, bidderRequestObj;

  //   beforeEach(function () {
  //     bidderRequestObj = {
  //       bidRequest: {
  //         bids: [{
  //           mediaTypes: {
  //             video: {
  //               context: 'outstream',
  //               playerSize: [
  //                 ['400', '300']
  //               ]
  //             }
  //           },
  //           bidId: 123,
  //           params: {
  //             player_width: 400,
  //             player_height: 300,
  //             content_page_url: 'prebid.js',
  //             ad_mute: 1,
  //             outstream_options: {
  //               slot: 'slot123'
  //             },
  //             outstream_function: 'function',
  //           }
  //         }]
  //       }
  //     };

  //     serverResponse = {
  //       body: {
  //         id: 12345,
  //         seatbid: [{
  //           bid: [{
  //             impid: 123,
  //             cur: 'USD',
  //             price: 12,
  //             adomain: ['abc.com'],
  //             crid: 321,
  //             w: 400,
  //             h: 300,
  //             ext: {
  //               slot: 'slot123'
  //             }
  //           }]
  //         }]
  //       }
  //     };
  //   });

  //   it('should attempt to insert the EASI script', function () {
  //     var scriptTag;
  //     sinon.stub(window.document, 'getElementById').returns({
  //       appendChild: sinon.stub().callsFake(function (script) {
  //         scriptTag = script
  //       })
  //     });
  //     var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

  //     responses[0].renderer.render(responses[0]);

  //     expect(scriptTag.getAttribute('type')).to.equal('text/javascript');

  //     window.document.getElementById.restore();
  //   });
  // });
})
