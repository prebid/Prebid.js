import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import {getRefererInfo} from 'src/refererDetection.js';
import {
  filterArrayData,
  validateFpd,
  init,
  resetOrtb2
} from 'modules/firstPartyData/index.js';

let adapterManager = require('src/adapterManager').default;

/**
 * @param {Object} [opts]
 * @returns {Bid}
 */
function mockBid(opts) {
  let bidderCode = opts && opts.bidderCode;

  return {
    'ad': 'creative',
    'cpm': '1.99',
    'width': 300,
    'height': 250,
    'bidderCode': bidderCode || BIDDER_CODE,
    'requestId': utils.getUniqueIdentifierStr(),
    'creativeId': 'id',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 360,
    getSize: () => '300x250'
  };
}

/**
 * @param {Bid} bid
 * @param {Object} [opts]
 * @returns {BidRequest}
 */
function mockBidRequest(bid, opts) {
  if (!bid) {
    throw new Error('bid required');
  }
  let bidderCode = opts && opts.bidderCode;
  let adUnitCode = opts && opts.adUnitCode;
  let defaultMediaType = {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  }
  let mediaType = (opts && opts.mediaType) ? opts.mediaType : defaultMediaType;

  let requestId = utils.getUniqueIdentifierStr();

  return {
    'bidderCode': bidderCode || bid.bidderCode,
    'auctionId': '20882439e3238c',
    'bidderRequestId': requestId,
    'bids': [
      {
        'bidder': bidderCode || bid.bidderCode,
        'params': {
          'placementId': 'id'
        },
        'adUnitCode': adUnitCode || ADUNIT_CODE,
        'sizes': [[300, 250], [300, 600]],
        'bidId': bid.requestId,
        'bidderRequestId': requestId,
        'auctionId': '20882439e3238c',
        'mediaTypes': mediaType
      }
    ],
    'auctionStart': 1505250713622,
    'timeout': 3000
  };
}

describe('the first party data module', function () {
  let sandbox;

  let ortb2 = {
    device: {
      h: 911,
      w: 1733
    },
    user: {
      data: [{
        segment: [{
          id: 'foo'
        }],
        name: 'bar',
        ext: 'string'
      }]
    },
    site: {
      content: {
        data: [{
          segment: [{
            id: 'test'
          }],
          name: 'content',
          ext: {
            foo: 'bar'
          }
        }]
      }
    }
  };

  let conf = {
    device: {
      h: 500,
      w: 750
    },
    user: {
      keywords: 'test1, test2',
      gender: 'f',
      data: [{
        segment: [{
          id: 'test'
        }],
        name: 'alt'
      }]
    },
    site: {
      ref: 'domain.com',
      page: 'www.domain.com/test',
      ext: {
        data: {
          inventory: ['first']
        }
      }
    }
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
    resetOrtb2();
  });

  describe('filtering first party array data', function () {
    it('returns empty array if no valid data', function () {
      let arr = [{}];
      let path = 'site.children.cat';
      let child = {type: 'string'};
      let parent = 'site';
      let key = 'cat';
      let validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('filters invalid type of array data', function () {
      let arr = ['foo', {test: 1}];
      let path = 'site.children.cat';
      let child = {type: 'string'};
      let parent = 'site';
      let key = 'cat';
      let validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal(['foo']);
    });

    it('filters all data for missing required children', function () {
      let arr = [{test: 1}];
      let path = 'site.children.content.children.data';
      let child = {type: 'object'};
      let parent = 'site';
      let key = 'data';
      let validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('filters all data for invalid required children types', function () {
      let arr = [{name: 'foo', segment: 1}];
      let path = 'site.children.content.children.data';
      let child = {type: 'object'};
      let parent = 'site';
      let key = 'data';
      let validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('returns only data with valid required nested children types', function () {
      let arr = [{name: 'foo', segment: [{id: '1'}, {id: 2}, 'foobar']}];
      let path = 'site.children.content.children.data';
      let child = {type: 'object'};
      let parent = 'site';
      let key = 'data';
      let validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([{name: 'foo', segment: [{id: '1'}]}]);
    });
  });

  describe('validating first party data', function () {
    it('filters user.data[0].ext for incorrect type', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          h: 911,
          w: 1733
        },
        user: {
          data: [{
            segment: [{
              id: 'foo'
            }],
            name: 'bar'
          }]
        },
        site: {
          content: {
            data: [{
              segment: [{
                id: 'test'
              }],
              name: 'content',
              ext: {
                foo: 'bar'
              }
            }]
          }
        }
      };

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters user and site for empty data', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          h: 911,
          w: 1733
        }
      };

      duplicate.user.data = [];
      duplicate.site.content.data = [];

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters user for empty valid segment values', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          h: 911,
          w: 1733
        },
        site: {
          content: {
            data: [{
              segment: [{
                id: 'test'
              }],
              name: 'content',
              ext: {
                foo: 'bar'
              }
            }]
          }
        }
      };

      duplicate.user.data[0].segment.push({test: 3});
      duplicate.user.data[0].segment[0] = {foo: 'bar'};

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters user.data[0].ext and site.content.data[0].segement[1] for invalid data', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          h: 911,
          w: 1733
        },
        user: {
          data: [{
            segment: [{
              id: 'foo'
            }],
            name: 'bar'
          }]
        },
        site: {
          content: {
            data: [{
              segment: [{
                id: 'test'
              }],
              name: 'content',
              ext: {
                foo: 'bar'
              }
            }]
          }
        }
      };

      duplicate.site.content.data[0].segment.push({test: 3});

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters device for invalid data types', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      duplicate.device = {
        h: '1',
        w: '1'
      }

      let expected = {
        user: {
          data: [{
            segment: [{
              id: 'foo'
            }],
            name: 'bar'
          }]
        },
        site: {
          content: {
            data: [{
              segment: [{
                id: 'test'
              }],
              name: 'content',
              ext: {
                foo: 'bar'
              }
            }]
          }
        }
      };

      duplicate.site.content.data[0].segment.push({test: 3});

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters cur for invalid data type', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      duplicate.cur = 8;

      let expected = {
        device: {
          h: 911,
          w: 1733
        },
        user: {
          data: [{
            segment: [{
              id: 'foo'
            }],
            name: 'bar'
          }]
        },
        site: {
          content: {
            data: [{
              segment: [{
                id: 'test'
              }],
              name: 'content',
              ext: {
                foo: 'bar'
              }
            }]
          }
        }
      };

      duplicate.site.content.data[0].segment.push({test: 3});

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });
  });

  describe('first party data intitializing', function () {
    let width;
    let widthStub;
    let height;
    let heightStub;
    let querySelectorStub;
    let canonical;
    let keywords;

    before(function() {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      keywords = document.createElement('meta');
      keywords.name = 'keywords';
    });

    beforeEach(function() {
      querySelectorStub = sinon.stub(window.top.document, 'querySelector');
      querySelectorStub.withArgs("link[rel='canonical']").returns(canonical);
      querySelectorStub.withArgs("meta[name='keywords']").returns(keywords);
      widthStub = sinon.stub(window.top, 'innerWidth').get(function () {
        return width;
      });
      heightStub = sinon.stub(window.top, 'innerHeight').get(function () {
        return height;
      });
    });

    afterEach(function() {
      widthStub.restore();
      heightStub.restore();
      querySelectorStub.restore();
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      keywords = document.createElement('meta');
      keywords.name = 'keywords';
    });

    it('sets default referer and dimension values to ortb2 data', function () {
      let validated;

      width = 1120;
      height = 750;

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.be.undefined;
      expect(validated.site.domain).to.be.undefined;
      expect(validated.device).to.deep.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('sets page and domain values to ortb2 data if canonical link exists', function () {
      let validated;

      canonical.href = 'https://www.domain.com/path?query=12345';

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.device).to.deep.to.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('sets keyword values to ortb2 data if keywords meta exists', function () {
      let validated;

      keywords.content = 'value1,value2,value3';

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.be.undefined;
      expect(validated.site.domain).to.be.undefined;
      expect(validated.device).to.deep.to.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.equal('value1,value2,value3');
    });

    it('only sets values that do not exist in ortb2 config', function () {
      let validated;

      config.setConfig({ortb2: {site: {ref: 'https://testpage.com', domain: 'newDomain.com'}}});

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://testpage.com');
      expect(validated.site.page).to.be.undefined;
      expect(validated.site.domain).to.equal('newDomain.com');
      expect(validated.device).to.deep.to.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('filters ortb2 data that is set', function () {
      let validated;
      let conf = {
        ortb2: {
          user: {
            data: {},
            gender: 'f',
            age: 45
          },
          site: {
            content: {
              data: [{
                segment: {
                  test: 1
                },
                name: 'foo'
              }, {
                segment: [{
                  id: 'test'
                }, {
                  id: 3
                }],
                name: 'bar'
              }]
            }
          },
          device: {
            w: 1,
            h: 1
          }
        }
      };

      config.setConfig(conf);
      canonical.href = 'https://www.domain.com/path?query=12345';
      width = 1120;
      height = 750;

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.site.content.data).to.deep.equal([{segment: [{id: 'test'}], name: 'bar'}]);
      expect(validated.user.data).to.be.undefined;
      expect(validated.device).to.deep.to.equal({w: 1, h: 1});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('should not overwrite existing data with default settings', function () {
      let validated;
      let conf = {
        ortb2: {
          site: {
            ref: 'https://referer.com'
          }
        }
      };

      config.setConfig(conf);

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://referer.com');
    });

    it('should allow overwrite default data with setConfig', function () {
      let validated;
      let conf = {
        ortb2: {
          site: {
            ref: 'https://referer.com'
          }
        }
      };

      config.setConfig(conf);

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://referer.com');
    });

    it('should filter all data', function () {
      let validated;
      let conf = {
        imp: [],
        site: {
          name: 123,
          domain: 456,
          page: 789,
          ref: 987,
          keywords: ['keywords'],
          search: 654,
          cat: 'cat',
          sectioncat: 'sectioncat',
          pagecat: 'pagecat',
          content: {
            data: [{
              name: 1,
              segment: []
            }]
          }
        },
        user: {
          yob: 'twenty',
          gender: 0,
          keywords: ['foobar'],
          data: ['test']
        },
        device: [800, 450],
        cur: {
          adServerCurrency: 'USD'
        }
      };

      config.setConfig({'firstPartyData': {skipEnrichments: true}});

      config.setConfig({ortb2: conf});

      init();

      validated = config.getConfig('ortb2');
      expect(validated).to.deep.equal({});
    });

    it('should filter bidderConfig data', function () {
      let validated;
      let conf = {
        bidders: ['bidderA', 'bidderB'],
        config: {
          ortb2: {
            site: {
              keywords: 'other',
              ref: 'https://domain.com'
            },
            user: {
              keywords: 'test',
              data: [{
                segment: [{id: 4}],
                name: 't'
              }]
            }
          }
        }
      };

      config.setBidderConfig(conf);

      init();

      validated = config.getBidderConfig();
      expect(validated.bidderA.ortb2).to.not.be.undefined;
      expect(validated.bidderA.ortb2.user.data).to.be.undefined;
      expect(validated.bidderA.ortb2.user.keywords).to.equal('test');
      expect(validated.bidderA.ortb2.site.keywords).to.equal('other');
      expect(validated.bidderA.ortb2.site.ref).to.equal('https://domain.com');
    });

    it('should not filter bidderConfig data as it is valid', function () {
      let validated;
      let conf = {
        bidders: ['bidderA', 'bidderB'],
        config: {
          ortb2: {
            site: {
              keywords: 'other',
              ref: 'https://domain.com'
            },
            user: {
              keywords: 'test',
              data: [{
                segment: [{id: 'data1_id'}],
                name: 'data1'
              }]
            }
          }
        }
      };

      config.setBidderConfig(conf);

      init();

      validated = config.getBidderConfig();
      expect(validated.bidderA.ortb2).to.not.be.undefined;
      expect(validated.bidderA.ortb2.user.data).to.deep.equal([{segment: [{id: 'data1_id'}], name: 'data1'}]);
      expect(validated.bidderA.ortb2.user.keywords).to.equal('test');
      expect(validated.bidderA.ortb2.site.keywords).to.equal('other');
      expect(validated.bidderA.ortb2.site.ref).to.equal('https://domain.com');
    });

    it('should not set default values if skipEnrichments is turned on', function () {
      let validated;
      config.setConfig({'firstPartyData': {skipEnrichments: true}});

      let conf = {
        site: {
          keywords: 'other'
        },
        user: {
          keywords: 'test',
          data: [{
            segment: [{id: 'data1_id'}],
            name: 'data1'
          }]
        }
      }
      ;

      config.setConfig({ortb2: conf});

      init();

      validated = config.getConfig();
      expect(validated.ortb2).to.not.be.undefined;
      expect(validated.ortb2.device).to.be.undefined;
      expect(validated.ortb2.site.ref).to.be.undefined;
      expect(validated.ortb2.site.page).to.be.undefined;
      expect(validated.ortb2.site.domain).to.be.undefined;
    });

    it('should not validate ortb2 data if skipValidations is turned on', function () {
      let validated;
      config.setConfig({'firstPartyData': {skipValidations: true}});

      let conf = {
        site: {
          keywords: 'other'
        },
        user: {
          keywords: 'test',
          data: [{
            segment: [{id: 'nonfiltered'}]
          }]
        }
      }
      ;

      config.setConfig({ortb2: conf});

      init();

      validated = config.getConfig();
      expect(validated.ortb2).to.not.be.undefined;
      expect(validated.ortb2.user.data).to.deep.equal([{segment: [{id: 'nonfiltered'}]}]);
    });
  });
});
