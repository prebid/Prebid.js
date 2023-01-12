import { arcspanSubmodule } from 'modules/arcspanRtdProvider.js';
import { deepAccess, deepSetValue, mergeDeep } from '../../../src/utils.js';
import { config } from 'src/config.js';
import { expect } from 'chai';

describe('arcspanRtdProvider', function () {
  describe('init', function () {
    afterEach(function () {
      var collection = document.head.getElementsByTagName('script');
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].src.endsWith('as.js')) {
          collection[i].remove();
        }
      }
      window.arcobj1 = {};
      window.arcobj2 = {};
    });

    it('successfully initializes with a valid silo ID', function () {
      expect(arcspanSubmodule.init(getGoodConfig())).to.equal(true);

      var collection = document.head.getElementsByTagName('script');
      var scriptFound = false;
      var error = false;
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].src === 'https://silo13.p7cloud.net/as.js') {
          scriptFound = true;
          break;
        }
        if (collection[i].src.endsWith('as.js')) {
          error = true;
          break;
        }
      }
      expect(scriptFound).to.equal(true);
      expect(error).to.equal(false);
    });

    it('fails to initialize with a missing silo ID', function () {
      expect(arcspanSubmodule.init(getBadConfig())).to.equal(false);

      var collection = document.head.getElementsByTagName('script');
      var scriptFound = false;
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].src.endsWith('as.js')) {
          scriptFound = true;
          break;
        }
      }
      expect(scriptFound).to.equal(false);
    });

    it('drops localhost script for test silo', function () {
      expect(arcspanSubmodule.init(getTestConfig())).to.equal(true);

      var collection = document.head.getElementsByTagName('script');
      var scriptFound = false;
      var error = false;
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].src === 'https://localhost:8080/as.js') {
          scriptFound = true;
          break;
        }
        if (collection[i].src.endsWith('as.js')) {
          error = true;
          break;
        }
      }
      expect(scriptFound).to.equal(true);
      expect(error).to.equal(false);
    });
  });

  describe('alterBidRequests', function () {
    afterEach(function () {
      window.arcobj1 = {};
      window.arcobj2 = {};
    });

    it('alters the bid request 1', function () {
      setIAB({
        raw: {
          images: [
            'Religion & Spirituality',
            'Medical Health>Substance Abuse',
            'Religion & Spirituality>Astrology',
            'Medical Health',
            'Events & Attractions',
          ],
        },
        codes: {
          images: ['IAB23-10', 'IAB7', 'IAB7-42', 'IAB15-1'],
        },
        newcodes: {
          images: ['150', '453', '311', '456', '286'],
        },
      });

      var reqBidsConfigObj = {};
      reqBidsConfigObj.ortb2Fragments = {};
      reqBidsConfigObj.ortb2Fragments.global = {};
      arcspanSubmodule.getBidRequestData(reqBidsConfigObj, function () {
        expect(reqBidsConfigObj.ortb2Fragments.global.site.name).to.equal(
          'arcspan'
        );
        expect(reqBidsConfigObj.ortb2Fragments.global.site.keywords).to.equal(
          'Religion & Spirituality,Medical Health>Substance Abuse,Religion & Spirituality>Astrology,Medical Health,Events & Attractions'
        );
        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].ext.segtax).to.equal(6);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.cat).to.eql([
          'IAB23_10',
          'IAB7',
          'IAB7_42',
          'IAB15_1',
        ]);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.sectioncat).to.eql([
          'IAB23_10',
          'IAB7',
          'IAB7_42',
          'IAB15_1'
        ]);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.pagecat).to.eql([
          'IAB23_10',
          'IAB7',
          'IAB7_42',
          'IAB15_1',
        ]);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].segment).to.eql([
          { id: '150' },
          { id: '453' },
          { id: '311' },
          { id: '456' },
          { id: '286' }
        ]);
      });
    });

    it('alters the bid request 2', function () {
      setIAB({
        raw: { text: ['Sports', 'Sports>Soccer'] },
        codes: { text: ['IAB17', 'IAB17-44'] },
        newcodes: { text: ['483', '533'] },
      });

      var reqBidsConfigObj = {};
      reqBidsConfigObj.ortb2Fragments = {};
      reqBidsConfigObj.ortb2Fragments.global = {};
      arcspanSubmodule.getBidRequestData(reqBidsConfigObj, function () {
        expect(reqBidsConfigObj.ortb2Fragments.global.site.name).to.equal(
          'arcspan'
        );
        expect(reqBidsConfigObj.ortb2Fragments.global.site.keywords).to.equal(
          'Sports,Sports>Soccer'
        );
        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].ext.segtax).to.equal(6);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.cat).to.eql([
          'IAB17',
          'IAB17_44',
        ]);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.sectioncat).to.eql([
          'IAB17',
          'IAB17_44'
        ]);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.pagecat).to.eql([
          'IAB17',
          'IAB17_44',
        ]);
        expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].segment).to.eql([
          { id: '483' },
          { id: '533' }
        ]);
      });
    });
  });
});

function getGoodConfig() {
  return {
    name: 'arcspan',
    waitForIt: true,
    params: {
      silo: 13,
    },
  };
}

function getBadConfig() {
  return {
    name: 'arcspan',
    waitForIt: true,
    params: {
      notasilo: 1,
    },
  };
}

function getTestConfig() {
  return {
    name: 'arcspan',
    waitForIt: true,
    params: {
      silo: 'test',
    },
  };
}

function setIAB(vjson) {
  window.arcobj2 = {};
  window.arcobj2.cat = 0;
  if (typeof vjson.codes != 'undefined') {
    window.arcobj2.cat = 1;
    if (typeof vjson.codes.images != 'undefined') {
      vjson.codes.images.forEach(function f(e, i) {
        vjson.codes.images[i] = e.replace('-', '_');
      });
    }
    if (typeof vjson.codes.text != 'undefined') {
      vjson.codes.text.forEach(function f(e, i) {
        vjson.codes.text[i] = e.replace('-', '_');
      });
    }
    window.arcobj2.sampled = 1;
    window.arcobj1 = {};
    window.arcobj1.page_iab_codes = vjson.codes;
    window.arcobj1.page_iab = vjson.raw;
    window.arcobj1.page_iab_newcodes = vjson.newcodes;
  }
}
