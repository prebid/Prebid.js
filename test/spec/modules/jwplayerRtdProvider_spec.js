import { fetchTargetingForMediaId, getVatFromCache, extractPublisherParams,
  formatTargetingResponse, getVatFromPlayer, enrichAdUnits, addTargetingToBid,
  fetchTargetingInformation, jwplayerSubmodule, getContentId, getContentSegments, getContentData, addOrtbSiteContent } from 'modules/jwplayerRtdProvider.js';
import { server } from 'test/mocks/xhr.js';
import { config as prebidConfig } from 'src/config.js';
import {deepClone} from '../../../src/utils.js';

describe('jwplayerRtdProvider', function() {
  const testIdForSuccess = 'test_id_for_success';
  const testIdForFailure = 'test_id_for_failure';
  const validSegments = ['test_seg_1', 'test_seg_2'];
  const responseHeader = {'Content-Type': 'application/json'};

  describe('Fetch targeting for mediaID tests', function () {
    let request;

    describe('Fetch succeeds', function () {
      beforeEach(function () {
        fetchTargetingForMediaId(testIdForSuccess);
        request = server.requests[0];
      });

      afterEach(function () {
        server.respond();
      });

      it('should reach out to media endpoint', function () {
        expect(request.url).to.be.eq(`https://cdn.jwplayer.com/v2/media/${testIdForSuccess}`);
      });

      it('should write to cache when successful', function () {
        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            playlist: [
              {
                file: 'test.mp4',
                jwpseg: validSegments
              }
            ]
          })
        );

        const targetingInfo = getVatFromCache(testIdForSuccess);

        const validTargeting = {
          segments: validSegments,
          mediaID: testIdForSuccess
        };

        expect(targetingInfo).to.deep.equal(validTargeting);
      });
    });

    describe('Fetch fails', function () {
      beforeEach(function () {
        fetchTargetingForMediaId(testIdForFailure);
        request = server.requests[0]
      });

      it('should not write to cache when response is malformed', function() {
        request.respond('{]');
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when playlist is absent', function() {
        request.respond({});
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when segments are absent', function() {
        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            playlist: [
              {
                file: 'test.mp4'
              }
            ]
          })
        );
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when request errors', function() {
        request.error();
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });
    });
  });

  describe('Format targeting response', function () {
    it('should exclude segment key when absent', function () {
      const targeting = formatTargetingResponse({ mediaID: 'test' });
      expect(targeting).to.not.have.property('segments');
    });

    it('should exclude content block when mediaId is absent', function () {
      const targeting = formatTargetingResponse({ segments: ['test'] });
      expect(targeting).to.not.have.property('content');
    });

    it('should return proper format', function () {
      const segments = ['123'];
      const mediaID = 'test';
      const expectedContentId = 'jw_' + mediaID;
      const expectedContent = {
        id: expectedContentId
      };
      const targeting = formatTargetingResponse({
        segments,
        mediaID
      });
      expect(targeting).to.have.deep.property('segments', segments);
      expect(targeting).to.have.deep.property('content', expectedContent);
    });
  });

  describe('Get VAT from player', function () {
    const mediaIdWithSegment = 'media_ID_1';
    const mediaIdNoSegment = 'media_ID_2';
    const mediaIdForCurrentItem = 'media_ID_current';
    const mediaIdNotCached = 'media_test_ID';

    const validPlayerID = 'player_test_ID_valid';
    const invalidPlayerID = 'player_test_ID_invalid';

    it('returns null when jwplayer.js is absent from page', function () {
      const targeting = getVatFromPlayer(invalidPlayerID, mediaIdNotCached);
      expect(targeting).to.be.null;
    });

    describe('When jwplayer.js is on page', function () {
      const playlistItemWithSegmentMock = {
        mediaid: mediaIdWithSegment,
        jwpseg: validSegments
      };

      const targetingForMediaWithSegment = {
        segments: validSegments,
        mediaID: mediaIdWithSegment
      };

      const playlistItemNoSegmentMock = {
        mediaid: mediaIdNoSegment
      };

      const currentItemSegments = ['test_seg_3', 'test_seg_4'];
      const currentPlaylistItemMock = {
        mediaid: mediaIdForCurrentItem,
        jwpseg: currentItemSegments
      };
      const targetingForCurrentItem = {
        segments: currentItemSegments,
        mediaID: mediaIdForCurrentItem
      };

      const playerInstanceMock = {
        getPlaylist: function () {
          return [playlistItemWithSegmentMock, playlistItemNoSegmentMock];
        },

        getPlaylistItem: function () {
          return currentPlaylistItemMock;
        }
      };

      const jwplayerMock = function(playerID) {
        if (playerID === validPlayerID) {
          return playerInstanceMock;
        } else {
          return {};
        }
      };

      beforeEach(function () {
        window.jwplayer = jwplayerMock;
      });

      it('returns null when player ID does not match player on page', function () {
        const targeting = getVatFromPlayer(invalidPlayerID, mediaIdNotCached);
        expect(targeting).to.be.null;
      });

      it('returns segments when media ID matches a playlist item with segments', function () {
        const targeting = getVatFromPlayer(validPlayerID, mediaIdWithSegment);
        expect(targeting).to.deep.equal(targetingForMediaWithSegment);
      });

      it('caches segments when media ID matches a playist item with segments', function () {
        getVatFromPlayer(validPlayerID, mediaIdWithSegment);
        const vat = getVatFromCache(mediaIdWithSegment);
        expect(vat.segments).to.deep.equal(validSegments);
      });

      it('returns segments of current item when media ID is missing', function () {
        const targeting = getVatFromPlayer(validPlayerID);
        expect(targeting).to.deep.equal(targetingForCurrentItem);
      });

      it('caches segments from the current item', function () {
        getVatFromPlayer(validPlayerID);

        window.jwplayer = null;
        const targeting = getVatFromCache(mediaIdForCurrentItem);
        expect(targeting).to.deep.equal(targetingForCurrentItem);
      });

      it('returns undefined segments when segments are absent', function () {
        const targeting = getVatFromPlayer(validPlayerID, mediaIdNoSegment);
        expect(targeting).to.deep.equal({
          mediaID: mediaIdNoSegment,
          segments: undefined
        });
      });

      describe('Get Bid Request Data', function () {
        it('executes immediately while request is active if player has item', function () {
          const bidRequestSpy = sinon.spy();
          const fakeServer = sinon.createFakeServer();
          fakeServer.respondImmediately = false;
          fakeServer.autoRespond = false;

          fetchTargetingForMediaId(mediaIdWithSegment);

          const bid = {};
          const adUnit = {
            ortb2Imp: {
              ext: {
                data: {
                  jwTargeting: {
                    mediaID: mediaIdWithSegment,
                    playerID: validPlayerID
                  }
                }
              }
            },
            bids: [
              bid
            ]
          };
          const expectedContentId = 'jw_' + mediaIdWithSegment;
          const expectedTargeting = {
            segments: validSegments,
            content: {
              id: expectedContentId
            }
          };
          jwplayerSubmodule.getBidRequestData({ adUnits: [adUnit] }, bidRequestSpy);
          expect(bidRequestSpy.calledOnce).to.be.true;
          expect(bid.rtd.jwplayer).to.have.deep.property('targeting', expectedTargeting);
          fakeServer.respond();
          expect(bidRequestSpy.calledOnce).to.be.true;
        });
      });
    });
  });

  describe('Enrich ad units', function () {
    const contentIdForSuccess = 'jw_' + testIdForSuccess;
    const expectedTargetingForSuccess = {
      segments: validSegments,
      content: {
        id: contentIdForSuccess
      }
    };
    let bidRequestSpy;
    let fakeServer;
    let clock;

    beforeEach(function () {
      bidRequestSpy = sinon.spy();

      fakeServer = sinon.createFakeServer();
      fakeServer.respondImmediately = false;
      fakeServer.autoRespond = false;

      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
      fakeServer.respond();
    });

    it('adds targeting when pending request succeeds', function () {
      fetchTargetingForMediaId(testIdForSuccess);
      const bids = [
        {
          id: 'bid1'
        },
        {
          id: 'bid2'
        }
      ];
      const adUnit = {
        ortb2Imp: {
          ext: {
            data: {
              jwTargeting: {
                mediaID: testIdForSuccess
              }
            }
          }
        },
        bids
      };

      enrichAdUnits([adUnit]);
      const bid1 = bids[0];
      const bid2 = bids[1];
      expect(bid1).to.not.have.property('rtd');
      expect(bid2).to.not.have.property('rtd');

      const request = fakeServer.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          playlist: [
            {
              file: 'test.mp4',
              jwpseg: validSegments
            }
          ]
        })
      );

      expect(bid1.rtd.jwplayer).to.have.deep.property('targeting', expectedTargetingForSuccess);
      expect(bid2.rtd.jwplayer).to.have.deep.property('targeting', expectedTargetingForSuccess);
    });

    it('immediately adds cached targeting', function () {
      fetchTargetingForMediaId(testIdForSuccess);
      const bids = [
        {
          id: 'bid1'
        },
        {
          id: 'bid2'
        }
      ];
      const adUnit = {
        ortb2Imp: {
          ext: {
            data: {
              jwTargeting: {
                mediaID: testIdForSuccess
              }
            }
          }
        },
        bids
      };
      const request = fakeServer.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          playlist: [
            {
              file: 'test.mp4',
              jwpseg: validSegments
            }
          ]
        })
      );

      enrichAdUnits([adUnit]);
      const bid1 = bids[0];
      const bid2 = bids[1];
      expect(bid1.rtd.jwplayer).to.have.deep.property('targeting', expectedTargetingForSuccess);
      expect(bid2.rtd.jwplayer).to.have.deep.property('targeting', expectedTargetingForSuccess);
    });

    it('adds content block when segments are absent and no request is pending', function () {
      const expectedTargetingForFailure = {
        content: {
          id: 'jw_' + testIdForFailure
        }
      };
      const bids = [
        {
          id: 'bid1'
        },
        {
          id: 'bid2'
        }
      ];
      const adUnit = {
        ortb2Imp: {
          ext: {
            data: {
              jwTargeting: {
                mediaID: testIdForFailure
              }
            }
          }
        },
        bids
      };

      enrichAdUnits([adUnit]);
      const bid1 = bids[0];
      const bid2 = bids[1];
      expect(bid1.rtd.jwplayer).to.have.deep.property('targeting', expectedTargetingForFailure);
      expect(bid2.rtd.jwplayer).to.have.deep.property('targeting', expectedTargetingForFailure);
    });

    it('should write to config', function () {
      fetchTargetingForMediaId(testIdForSuccess);
      const bids = [
        {
          id: 'bid1'
        },
        {
          id: 'bid2'
        }
      ];
      const adUnit = {
        ortb2Imp: {
          ext: {
            data: {
              jwTargeting: {
                mediaID: testIdForSuccess
              }
            }
          }
        },
        bids
      };

      const ortb2Fragments = {global: {}};
      enrichAdUnits([adUnit], ortb2Fragments);
      const bid1 = bids[0];
      const bid2 = bids[1];
      expect(bid1).to.not.have.property('rtd');
      expect(bid2).to.not.have.property('rtd');

      const request = fakeServer.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          playlist: [
            {
              file: 'test.mp4',
              jwpseg: validSegments
            }
          ]
        })
      );

      expect(ortb2Fragments.global).to.have.property('site');
      expect(ortb2Fragments.global.site).to.have.property('content');
      expect(ortb2Fragments.global.site.content).to.have.property('id', 'jw_' + testIdForSuccess);
      expect(ortb2Fragments.global.site.content).to.have.property('data');
      const data = ortb2Fragments.global.site.content.data;
      expect(data).to.have.length(1);
      const datum = data[0];
      expect(datum).to.have.property('name', 'jwplayer.com');
      expect(datum).to.have.property('ext');
      expect(datum.ext).to.have.property('segtax', 502);
      expect(datum.segment).to.have.length(2);
      const segment1 = datum.segment[0];
      const segment2 = datum.segment[1];
      expect(segment1).to.have.property('id', 'test_seg_1');
      expect(segment2).to.have.property('id', 'test_seg_2');
    });

    it('should remove obsolete jwplayer data', function () {
      fetchTargetingForMediaId(testIdForSuccess);
      const bids = [
        {
          id: 'bid1'
        }
      ];
      const adUnit = {
        ortb2Imp: {
          ext: {
            data: {
              jwTargeting: {
                mediaID: testIdForSuccess
              }
            }
          }
        },
        bids
      };

      const ortb2Fragments = {
        global: {
          site: {
            content: {
              id: 'randomContentId',
              data: [{
                name: 'random',
                segment: [{id: 'random'}]
              }, {
                name: 'jwplayer.com',
                segment: [{id: 'randomJwPlayer'}]
              }, {
                name: 'random2',
                segment: [{id: 'random2'}]
              }]
            }
          }
        }
      };

      enrichAdUnits([adUnit], ortb2Fragments);
      const bid1 = bids[0];
      expect(bid1).to.not.have.property('rtd');

      const request = fakeServer.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          playlist: [
            {
              file: 'test.mp4',
              jwpseg: validSegments
            }
          ]
        })
      );

      expect(ortb2Fragments.global).to.have.property('site');
      expect(ortb2Fragments.global.site).to.have.property('content');
      expect(ortb2Fragments.global.site.content).to.have.property('id', 'jw_' + testIdForSuccess);
      expect(ortb2Fragments.global.site.content).to.have.property('data');
      const data = ortb2Fragments.global.site.content.data;
      expect(data).to.have.length(3);

      const randomDatum = data[0];
      expect(randomDatum).to.have.property('name', 'random');
      expect(randomDatum.segment).to.deep.equal([{id: 'random'}]);

      const randomDatum2 = data[1];
      expect(randomDatum2).to.have.property('name', 'random2');
      expect(randomDatum2.segment).to.deep.equal([{id: 'random2'}]);

      const jwplayerDatum = data[2];
      expect(jwplayerDatum).to.have.property('name', 'jwplayer.com');
      expect(jwplayerDatum).to.have.property('ext');
      expect(jwplayerDatum.ext).to.have.property('segtax', 502);
      expect(jwplayerDatum.segment).to.have.length(2);
      const segment1 = jwplayerDatum.segment[0];
      const segment2 = jwplayerDatum.segment[1];
      expect(segment1).to.have.property('id', 'test_seg_1');
      expect(segment2).to.have.property('id', 'test_seg_2');
    });
  });

  describe('Extract Publisher Params', function () {
    const config = { mediaID: 'test' };

    it('should exclude adUnits that do not support instream video and do not specify jwTargeting', function () {
      const oustreamAdUnit = { mediaTypes: { video: { context: 'outstream' } } };
      const oustreamTargeting = extractPublisherParams(oustreamAdUnit, config);
      expect(oustreamTargeting).to.be.undefined;

      const bannerAdUnit = { mediaTypes: { banner: {} } };
      const bannerTargeting = extractPublisherParams(bannerAdUnit, config);
      expect(bannerTargeting).to.be.undefined;

      const targeting = extractPublisherParams({}, config);
      expect(targeting).to.be.undefined;
    });

    it('should include ad unit when media type is video and is instream', function () {
      const adUnit = { mediaTypes: { video: { context: 'instream' } } };
      const targeting = extractPublisherParams(adUnit, config);
      expect(targeting).to.deep.equal(config);
    });

    it('should include banner ad units that specify jwTargeting', function() {
      const adUnit = { mediaTypes: { banner: {} }, ortb2Imp: { ext: { data: { jwTargeting: {} } } } };
      const targeting = extractPublisherParams(adUnit, config);
      expect(targeting).to.deep.equal(config);
    });

    it('should include outstream ad units that specify jwTargeting', function() {
      const adUnit = { mediaTypes: { video: { context: 'outstream' } }, ortb2Imp: { ext: { data: { jwTargeting: {} } } } };
      const targeting = extractPublisherParams(adUnit, config);
      expect(targeting).to.deep.equal(config);
    });

    it('should fallback to config when empty jwTargeting is defined in ad unit', function () {
      const adUnit = { ortb2Imp: { ext: { data: { jwTargeting: {} } } } };
      const targeting = extractPublisherParams(adUnit, config);
      expect(targeting).to.deep.equal(config);
    });

    it('should prioritize adUnit properties ', function () {
      const expectedMediaID = 'test_media_id';
      const expectedPlayerID = 'test_player_id';
      const config = { playerID: 'bad_id', mediaID: 'bad_id' };

      const adUnit = { ortb2Imp: { ext: { data: { jwTargeting: { mediaID: expectedMediaID, playerID: expectedPlayerID } } } } };
      const targeting = extractPublisherParams(adUnit, config);
      expect(targeting).to.have.property('mediaID', expectedMediaID);
      expect(targeting).to.have.property('playerID', expectedPlayerID);
    });

    it('should use config properties as fallbacks', function () {
      const expectedMediaID = 'test_media_id';
      const expectedPlayerID = 'test_player_id';
      const config = { playerID: expectedPlayerID, mediaID: 'bad_id' };

      const adUnit = { ortb2Imp: { ext: { data: { jwTargeting: { mediaID: expectedMediaID } } } } };
      const targeting = extractPublisherParams(adUnit, config);
      expect(targeting).to.have.property('mediaID', expectedMediaID);
      expect(targeting).to.have.property('playerID', expectedPlayerID);
    });

    it('should return undefined when Publisher Params are absent', function () {
      const targeting = extractPublisherParams({}, null);
      expect(targeting).to.be.undefined;
    })
  });

  describe('Get content id', function() {
    it('prefixes jw_ to the media id', function () {
      const mediaId = 'mediaId';
      const contentId = getContentId(mediaId);
      expect(contentId).to.equal('jw_mediaId');
    });

    it('returns undefined when media id is empty', function () {
      let contentId = getContentId();
      expect(contentId).to.be.undefined;
      contentId = getContentId('');
      expect(contentId).to.be.undefined;
      contentId = getContentId(null);
      expect(contentId).to.be.undefined;
    });
  });

  describe('Get Content Segments', function () {
    it('returns undefined when segments are empty', function () {
      let contentSegments = getContentSegments(null);
      expect(contentSegments).to.be.undefined;
      contentSegments = getContentSegments(undefined);
      expect(contentSegments).to.be.undefined;
      contentSegments = getContentSegments([]);
      expect(contentSegments).to.be.undefined;
    });

    it('returns proper format', function () {
      const segment1 = 'segment1';
      const segment2 = 'segment2';
      const segment3 = 'segment3';
      const contentSegments = getContentSegments([segment1, segment2, segment3]);
      expect(contentSegments[0]).to.deep.equal({ id: segment1 });
      expect(contentSegments[1]).to.deep.equal({ id: segment2 });
      expect(contentSegments[2]).to.deep.equal({ id: segment3 });
    });
  });

  describe('Get Content Data', function () {
    it('should return proper format', function () {
      const testMediaId = 'test_media_id';
      const testSegments = [{ id: 1 }, { id: 2 }];
      const contentData = getContentData(testMediaId, testSegments);
      expect(contentData).to.have.property('name', 'jwplayer.com');
      expect(contentData.ext).to.have.property('segtax', 502);
      expect(contentData.ext).to.have.property('cids');
      expect(contentData.ext.cids).to.have.length(1);
      expect(contentData.ext.cids[0]).to.equal(testMediaId);
      expect(contentData.segment).to.deep.equal(testSegments);
    });

    it('should only set segtax and segment when segments are provided', function () {
      const testMediaId = 'test_media_id';
      const contentData = getContentData(testMediaId);
      expect(contentData).to.have.property('name', 'jwplayer.com');
      expect(contentData.ext.segtax).to.be.undefined;
      expect(contentData.ext).to.have.property('cids');
      expect(contentData.ext.cids).to.have.length(1);
      expect(contentData.ext.cids[0]).to.equal(testMediaId);
      expect(contentData.segment).to.be.undefined;
    });

    it('should only set cids when a media id is provided', function () {
      const testSegments = [{ id: 1 }, { id: 2 }];
      const contentData = getContentData(null, testSegments);
      expect(contentData).to.have.property('name', 'jwplayer.com');
      expect(contentData.ext).to.have.property('segtax', 502);
      expect(contentData.ext).to.not.have.property('cids');
      expect(contentData.segment).to.deep.equal(testSegments);
    });

    it('should return undefined when no params are provided', function () {
      expect(getContentData()).to.be.undefined;
    });
  });

  describe(' Add Ortb Site Content', function () {
    it('should maintain object structure when id and data params are empty', function () {
      const ortb2 = {
        site: {
          content: {
            id: 'randomId'
          },
          random: {
            random_sub: 'randomSub'
          }
        },
        app: {
          content: {
            id: 'appId'
          }
        }
      }
      const copy = deepClone(ortb2);
      addOrtbSiteContent(copy);
      expect(copy).to.eql(ortb2);
    });

    it('should create a structure compliant with the oRTB 2 spec', function() {
      const ortb2 = {}
      const expectedId = 'expectedId';
      const expectedData = { datum: 'datum' };
      addOrtbSiteContent(ortb2, expectedId, expectedData);
      expect(ortb2).to.have.nested.property('site.content.id', expectedId);
      expect(ortb2).to.have.nested.property('site.content.data');
      expect(ortb2.site.content.data[0]).to.be.deep.equal(expectedData);
    });

    it('should respect existing structure when adding adding fields', function () {
      const ortb2 = {
        site: {
          content: {
            id: 'oldId'
          },
          random: {
            random_sub: 'randomSub'
          }
        },
        app: {
          content: {
            id: 'appId'
          }
        }
      };

      const expectedId = 'expectedId';
      const expectedData = { datum: 'datum' };
      addOrtbSiteContent(ortb2, expectedId, expectedData);
      expect(ortb2).to.have.nested.property('site.random.random_sub', 'randomSub');
      expect(ortb2).to.have.nested.property('app.content.id', 'appId');
      expect(ortb2).to.have.nested.property('site.content.id', expectedId);
      expect(ortb2).to.have.nested.property('site.content.data');
      expect(ortb2.site.content.data[0]).to.be.deep.equal(expectedData);
    });

    it('should set content id', function () {
      const ortb2 = {};
      const expectedId = 'expectedId';
      addOrtbSiteContent(ortb2, expectedId);
      expect(ortb2).to.have.nested.property('site.content.id', expectedId);
    });

    it('should override content id', function () {
      const ortb2 = {
        site: {
          content: {
            id: 'oldId'
          }
        }
      };

      const expectedId = 'expectedId';
      addOrtbSiteContent(ortb2, expectedId);
      expect(ortb2).to.have.nested.property('site.content.id', expectedId);
    });

    it('should keep previous content id when not set', function () {
      const previousId = 'oldId';
      const ortb2 = {
        site: {
          content: {
            id: previousId,
            data: [{ datum: 'first_datum' }]
          }
        }
      };

      addOrtbSiteContent(ortb2, null, { datum: 'new_datum' });
      expect(ortb2).to.have.nested.property('site.content.id', previousId);
    });

    it('should set content data', function () {
      const ortb2 = {};
      const expectedData = { datum: 'datum' };
      addOrtbSiteContent(ortb2, null, expectedData);
      expect(ortb2).to.have.nested.property('site.content.data');
      expect(ortb2.site.content.data).to.have.length(1);
      expect(ortb2.site.content.data[0]).to.be.deep.equal(expectedData);
    });

    it('should append content data', function () {
      const ortb2 = {
        site: {
          content: {
            data: [{ datum: 'first_datum' }]
          }
        }
      };

      const expectedData = { datum: 'datum' };
      addOrtbSiteContent(ortb2, null, expectedData);
      expect(ortb2).to.have.nested.property('site.content.data');
      expect(ortb2.site.content.data).to.have.length(2);
      expect(ortb2.site.content.data.pop()).to.be.deep.equal(expectedData);
    });

    it('should keep previous data when not set', function () {
      const expectedId = 'expectedId';
      const expectedData = { datum: 'first_datum' };
      const ortb2 = {
        site: {
          content: {
            data: [expectedData]
          }
        }
      };

      addOrtbSiteContent(ortb2, expectedId);
      expect(ortb2).to.have.nested.property('site.content.data');
      expect(ortb2.site.content.data).to.have.length(1);
      expect(ortb2.site.content.data[0]).to.be.deep.equal(expectedData);
      expect(ortb2).to.have.nested.property('site.content.id', expectedId);
    });
  });

  describe('Add Targeting to Bid', function () {
    const targeting = {foo: 'bar'};

    it('creates realTimeData when absent from Bid', function () {
      const targeting = {foo: 'bar'};
      const bid = {};
      addTargetingToBid(bid, targeting);
      expect(bid).to.have.property('rtd');
      expect(bid).to.have.nested.property('rtd.jwplayer.targeting', targeting);
    });

    it('adds to existing realTimeData', function () {
      const otherRtd = {
        targeting: {
          seg: 'rtd seg'
        }
      };

      const bid = {
        rtd: {
          otherRtd
        }
      };

      addTargetingToBid(bid, targeting);
      expect(bid).to.have.property('rtd');
      const rtd = bid.rtd;
      expect(rtd).to.have.property('jwplayer');
      expect(rtd).to.have.nested.property('jwplayer.targeting', targeting);

      expect(rtd).to.have.deep.property('otherRtd', otherRtd);
    });

    it('adds to existing realTimeData.jwplayer', function () {
      const otherInfo = { seg: 'rtd seg' };
      const bid = {
        rtd: {
          jwplayer: {
            otherInfo
          }
        }
      };
      addTargetingToBid(bid, targeting);

      expect(bid).to.have.property('rtd');
      const rtd = bid.rtd;
      expect(rtd).to.have.property('jwplayer');
      expect(rtd).to.have.nested.property('jwplayer.otherInfo', otherInfo);
      expect(rtd).to.have.nested.property('jwplayer.targeting', targeting);
    });

    it('overrides existing jwplayer.targeting', function () {
      const otherInfo = { seg: 'rtd seg' };
      const bid = {
        rtd: {
          jwplayer: {
            targeting: {
              otherInfo
            }
          }
        }
      };
      addTargetingToBid(bid, targeting);

      expect(bid).to.have.property('rtd');
      const rtd = bid.rtd;
      expect(rtd).to.have.property('jwplayer');
      expect(rtd).to.have.nested.property('jwplayer.targeting', targeting);
    });

    it('creates jwplayer when absent from realTimeData', function () {
      const bid = { rtd: {} };
      addTargetingToBid(bid, targeting);

      expect(bid).to.have.property('rtd');
      const rtd = bid.rtd;
      expect(rtd).to.have.property('jwplayer');
      expect(rtd).to.have.nested.property('jwplayer.targeting', targeting);
    });
  });

  describe('jwplayerSubmodule', function () {
    it('successfully instantiates', function () {
      expect(jwplayerSubmodule.init()).to.equal(true);
    });

    describe('Get Bid Request Data', function () {
      const validMediaIDs = ['media_ID_1', 'media_ID_2', 'media_ID_3'];
      let bidRequestSpy;
      let fakeServer;
      let clock;
      let bidReqConfig;

      beforeEach(function () {
        bidReqConfig = {
          adUnits: [
            {
              ortb2Imp: {
                ext: {
                  data: {
                    jwTargeting: {
                      mediaID: validMediaIDs[0]
                    }
                  }
                }
              },
              bids: [
                {}, {}
              ]
            },
            {
              ortb2Imp: {
                ext: {
                  data: {
                    jwTargeting: {
                      mediaID: validMediaIDs[1]
                    }
                  }
                }
              },
              bids: [
                {}, {}
              ]
            }
          ]
        };

        bidRequestSpy = sinon.spy();

        fakeServer = sinon.createFakeServer();
        fakeServer.respondImmediately = false;
        fakeServer.autoRespond = false;

        clock = sinon.useFakeTimers();
      });

      afterEach(function () {
        clock.restore();
        fakeServer.respond();
      });

      it('executes callback immediately when ad units are missing', function () {
        jwplayerSubmodule.getBidRequestData({ adUnits: [] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('executes callback immediately when no requests are pending', function () {
        fetchTargetingInformation({
          mediaIDs: []
        });
        jwplayerSubmodule.getBidRequestData(bidReqConfig, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('executes callback only after requests in adUnit complete', function() {
        fetchTargetingInformation({
          mediaIDs: validMediaIDs
        });
        jwplayerSubmodule.getBidRequestData(bidReqConfig, bidRequestSpy);
        expect(bidRequestSpy.notCalled).to.be.true;

        const req1 = fakeServer.requests[0];
        const req2 = fakeServer.requests[1];
        const req3 = fakeServer.requests[2];

        req1.respond();
        expect(bidRequestSpy.notCalled).to.be.true;

        req2.respond();
        expect(bidRequestSpy.calledOnce).to.be.true;

        req3.respond();
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('sets targeting data in proper structure', function () {
        const bid = {};
        const adUnitWithMediaId = {
          ortb2Imp: {
            ext: {
              data: {
                jwTargeting: {
                  mediaID: testIdForSuccess
                }
              }
            }
          },
          bids: [
            bid
          ]
        };
        const adUnitEmpty = {
          code: 'test_ad_unit_empty'
        };
        const expectedContentId = 'jw_' + testIdForSuccess;
        const expectedTargeting = {
          segments: validSegments,
          content: {
            id: expectedContentId
          }
        };
        jwplayerSubmodule.getBidRequestData({ adUnits: [adUnitWithMediaId, adUnitEmpty] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
        expect(bid.rtd.jwplayer).to.have.deep.property('targeting', expectedTargeting);
      });

      it('excludes segments when absent', function () {
        const adUnitCode = 'test_ad_unit';
        const bid = {};
        const adUnit = {
          ortb2Imp: {
            ext: {
              data: {
                jwTargeting: {
                  mediaID: testIdForFailure
                }
              }
            }
          },
          bids: [ bid ]
        };
        const expectedContentId = 'jw_' + adUnit.ortb2Imp.ext.data.jwTargeting.mediaID;
        const expectedTargeting = {
          content: {
            id: expectedContentId
          }
        };

        jwplayerSubmodule.getBidRequestData({ adUnits: [ adUnit ] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
        expect(bid.rtd.jwplayer.targeting).to.not.have.property('segments');
        expect(bid.rtd.jwplayer.targeting).to.not.have.property('segments');
        expect(bid.rtd.jwplayer).to.have.deep.property('targeting', expectedTargeting);
      });

      it('does not modify bid when jwTargeting block is absent', function () {
        const adUnitCode = 'test_ad_unit';
        const bid1 = {};
        const bid2 = {};
        const bid3 = {};
        const adUnitWithMediaId = {
          code: adUnitCode,
          mediaID: testIdForSuccess,
          bids: [ bid1 ]
        };
        const adUnitEmpty = {
          code: 'test_ad_unit_empty',
          bids: [ bid2 ]
        };

        const adUnitEmptyfpd = {
          code: 'test_ad_unit_empty_fpd',
          ortb2Imp: {
            ext: {
              id: 'sthg'
            }
          },
          bids: [ bid3 ]
        };

        jwplayerSubmodule.getBidRequestData({ adUnits: [adUnitWithMediaId, adUnitEmpty, adUnitEmptyfpd] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
        expect(bid1).to.not.have.property('rtd');
        expect(bid2).to.not.have.property('rtd');
        expect(bid3).to.not.have.property('rtd');
      });
    });
  });
});
