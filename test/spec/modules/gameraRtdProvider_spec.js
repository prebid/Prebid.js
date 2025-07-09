import { submodule } from 'src/hook.js';
import { getGlobal } from 'src/prebidGlobal.js';
import * as utils from 'src/utils.js';
import { subModuleObj } from 'modules/gameraRtdProvider.js';

describe('gameraRtdProvider', function () {
  let logErrorSpy;

  beforeEach(function () {
    logErrorSpy = sinon.spy(utils, 'logError');
  });

  afterEach(function () {
    logErrorSpy.restore();
  });

  describe('subModuleObj', function () {
    it('should have the correct module name', function () {
      expect(subModuleObj.name).to.equal('gamera');
    });

    it('successfully instantiates and returns true', function () {
      expect(subModuleObj.init()).to.equal(true);
    });
  });

  describe('getBidRequestData', function () {
    const reqBidsConfigObj = {
      adUnits: [{
        code: 'test-div',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: 'homepage-top-rect',
              adUnitSpecificAttribute: '123',
            }
          }
        },
        bids: [{ bidder: 'test' }]
      }],
      ortb2Fragments: {
        global: {
          site: {
            name: 'example',
            domain: 'page.example.com',
            // OpenRTB 2.5 spec / Content Taxonomy
            cat: ['IAB2'],
            sectioncat: ['IAB2-2'],
            pagecat: ['IAB2-2'],

            page: 'https://page.example.com/here.html',
            ref: 'https://ref.example.com',
            keywords: 'power tools, drills',
            search: 'drill',
            content: {
              userrating: '4',
              data: [{
                name: 'www.dataprovider1.com', // who resolved the segments
                ext: {
                  segtax: 7, // taxonomy used to encode the segments
                  cids: ['iris_c73g5jq96mwso4d8']
                },
                // the bare minimum are the IDs. These IDs are the ones from the new IAB Content Taxonomy v3
                segment: [{ id: '687' }, { id: '123' }]
              }]
            },
            ext: {
              data: { // fields that aren't part of openrtb 2.6
                pageType: 'article',
                category: 'repair'
              }
            }
          },
          // this is where the user data is placed
          user: {
            keywords: 'a,b',
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '1'
              }]
            }],
            ext: {
              data: {
                registered: true,
                interests: ['cars']
              }
            }
          }
        }
      }
    };

    let callback;

    beforeEach(function () {
      callback = sinon.spy();
      window.gamera = undefined;
    });

    it('should queue command when gamera.getPrebidSegments is not available', function () {
      subModuleObj.getBidRequestData(reqBidsConfigObj, callback);

      expect(window.gamera).to.exist;
      expect(window.gamera.cmd).to.be.an('array');
      expect(window.gamera.cmd.length).to.equal(1);
      expect(callback.called).to.be.false;

      // our callback should be executed if command queue is flushed
      window.gamera.cmd.forEach(command => command());
      expect(callback.calledOnce).to.be.true;
    });

    it('should call enrichAuction directly when gamera.getPrebidSegments is available', function () {
      window.gamera = {
        getPrebidSegments: () => ({})
      };

      subModuleObj.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.be.true;
    });

    it('should handle errors gracefully', function () {
      window.gamera = {
        getPrebidSegments: () => {
          throw new Error('Test error');
        }
      };

      subModuleObj.getBidRequestData(reqBidsConfigObj, callback);

      expect(logErrorSpy.calledWith('gameraRtdProvider', 'Error getting segments:')).to.be.true;
      expect(callback.calledOnce).to.be.true;
    });

    describe('segment enrichment', function () {
      const mockSegments = {
        user: {
          data: [{
            name: 'gamera.ai',
            ext: {
              segtax: 4,
            },
            segment: [{ id: 'user-1' }]
          }]
        },
        site: {
          keywords: 'gamera,article,keywords',
          content: {
            data: [{
              name: 'gamera.ai',
              ext: {
                segtax: 7,
              },
              segment: [{ id: 'site-1' }]
            }]
          }
        },
        adUnits: {
          'test-div': {
            key: 'value',
            ext: {
              data: {
                gameraSegment: 'ad-1',
              }
            }
          }
        }
      };

      beforeEach(function () {
        window.gamera = {
          getPrebidSegments: () => mockSegments
        };
      });

      it('should enrich ortb2Fragments with user data', function () {
        subModuleObj.getBidRequestData(reqBidsConfigObj, callback);

        expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.deep.include(mockSegments.user.data[0]);

        // check if existing attributes are not overwritten
        expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].ext.segtax).to.equal(4);
        expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment[0].id).to.equal('1');
        expect(reqBidsConfigObj.ortb2Fragments.global.user.keywords).to.equal('a,b');
        expect(reqBidsConfigObj.ortb2Fragments.global.user.ext.data.registered).to.equal(true);
      });

      it('should enrich ortb2Fragments with site data', function () {
        subModuleObj.getBidRequestData(reqBidsConfigObj, callback);

        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data).to.deep.include(mockSegments.site.content.data[0]);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.keywords).to.equal('gamera,article,keywords');

        // check if existing attributes are not overwritten
        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].ext.segtax).to.equal(7);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].segment[0].id).to.equal('687');
        expect(reqBidsConfigObj.ortb2Fragments.global.site.ext.data.category).to.equal('repair');
        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.userrating).to.equal('4');
      });

      it('should enrich adUnits with segment data', function () {
        subModuleObj.getBidRequestData(reqBidsConfigObj, callback);

        expect(reqBidsConfigObj.adUnits[0].ortb2Imp.key).to.equal('value');
        expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.gameraSegment).to.equal('ad-1');

        // check if existing attributes are not overwritten
        expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.adUnitSpecificAttribute).to.equal('123');
        expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.pbadslot).to.equal('homepage-top-rect');
      });
    });
  });
});
