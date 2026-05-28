import { expect } from 'chai';
import * as utils from 'src/utils.js';
import {
  filterArrayData,
  validateFpd
} from 'modules/validationFpdModule/index.js';

describe('the first party data validation module', function () {
  const ortb2 = {
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

  const conf = {
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

  describe('filtering first party array data', function () {
    it('returns empty array if no valid data', function () {
      const arr = [{}];
      const path = 'site.children.cat';
      const child = { type: 'string' };
      const parent = 'site';
      const key = 'cat';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('filters invalid type of array data', function () {
      const arr = ['foo', { test: 1 }];
      const path = 'site.children.cat';
      const child = { type: 'string' };
      const parent = 'site';
      const key = 'cat';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal(['foo']);
    });

    it('filters all data for missing required children', function () {
      const arr = [{ test: 1 }];
      const path = 'site.children.content.children.data';
      const child = { type: 'object' };
      const parent = 'site';
      const key = 'data';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('filters all data for invalid required children types', function () {
      const arr = [{ name: 'foo', segment: 1 }];
      const path = 'site.children.content.children.data';
      const child = { type: 'object' };
      const parent = 'site';
      const key = 'data';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('returns only data with valid required nested children types', function () {
      const arr = [{ name: 'foo', segment: [{ id: '1' }, { id: 2 }, 'foobar'] }];
      const path = 'site.children.content.children.data';
      const child = { type: 'object' };
      const parent = 'site';
      const key = 'data';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([{ name: 'foo', segment: [{ id: '1' }] }]);
    });
  });

  describe('validating first party data', function () {
    it('filters user.data[0].ext for incorrect type', function () {
      let validated;
      const duplicate = utils.deepClone(ortb2);
      const expected = {
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
      const duplicate = utils.deepClone(ortb2);
      const expected = {
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
      const duplicate = utils.deepClone(ortb2);
      const expected = {
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

      duplicate.user.data[0].segment.push({ test: 3 });
      duplicate.user.data[0].segment[0] = { foo: 'bar' };

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters user.data[0].ext and site.content.data[0].segement[1] for invalid data', function () {
      let validated;
      const duplicate = utils.deepClone(ortb2);
      const expected = {
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

      duplicate.site.content.data[0].segment.push({ test: 3 });

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters device for invalid data types', function () {
      let validated;
      const duplicate = utils.deepClone(ortb2);
      duplicate.device = {
        h: '1',
        w: '1'
      }

      const expected = {
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

      duplicate.site.content.data[0].segment.push({ test: 3 });

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters device fields for invalid iab enum values and integer data types', function () {
      const duplicate = utils.deepClone(ortb2);
      duplicate.device = {
        h: 911,
        w: 1733,
        devicetype: 2.5,
        connectiontype: 99,
        geo: {
          lat: 12.34,
          lon: 56.78,
          type: '1'
        }
      };

      const expected = {
        device: {
          h: 911,
          w: 1733,
          geo: {
            lat: 12.34,
            lon: 56.78
          }
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

      const validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('keeps valid iab enum values in device fields', function () {
      const duplicate = utils.deepClone(ortb2);
      duplicate.device = {
        h: 911,
        w: 1733,
        devicetype: 2,
        connectiontype: 2,
        geo: {
          lat: 12.34,
          lon: 56.78,
          type: 1
        }
      };

      const validated = validateFpd(duplicate);
      expect(validated.device).to.deep.equal(duplicate.device);
    });

    it('filters expanded device fields for invalid OpenRTB types', function () {
      const duplicate = utils.deepClone(ortb2);
      duplicate.device = {
        ua: 'Mozilla/5.0',
        dnt: 1,
        lmt: 2,
        ip: 123,
        ipv6: '2001:db8::1',
        make: 'Apple',
        model: ['iPhone'],
        os: 'iOS',
        osv: 17,
        hwv: '15,2',
        h: 911,
        w: 1733,
        ppi: '460',
        pxratio: 3,
        js: 1,
        geofetch: 0,
        flashver: null,
        language: 'en',
        carrier: 'Example Carrier',
        mccmnc: 310260,
        ifa: 'ifa',
        didsha1: {},
        didmd5: 'did-md5',
        dpidsha1: 'dpid-sha1',
        dpidmd5: 10,
        macsha1: 'mac-sha1',
        macmd5: false,
        ext: { foo: 'bar' },
        geo: {
          lat: 12.34,
          lon: 56.78,
          accuracy: 10,
          lastfix: 'old',
          ipservice: 2,
          country: 'USA',
          region: 6,
          regionfips104: 'US06',
          metro: '807',
          city: 'LAX',
          zip: 90001,
          utcoffset: -480,
          ext: { source: 'test' }
        }
      };

      const validated = validateFpd(duplicate);
      expect(validated.device).to.deep.equal({
        ua: 'Mozilla/5.0',
        dnt: 1,
        ipv6: '2001:db8::1',
        make: 'Apple',
        os: 'iOS',
        hwv: '15,2',
        h: 911,
        w: 1733,
        pxratio: 3,
        js: 1,
        geofetch: 0,
        language: 'en',
        carrier: 'Example Carrier',
        ifa: 'ifa',
        didmd5: 'did-md5',
        dpidsha1: 'dpid-sha1',
        macsha1: 'mac-sha1',
        ext: { foo: 'bar' },
        geo: {
          lat: 12.34,
          lon: 56.78,
          accuracy: 10,
          ipservice: 2,
          country: 'USA',
          regionfips104: 'US06',
          metro: '807',
          city: 'LAX',
          utcoffset: -480,
          ext: { source: 'test' }
        }
      });
    });

    it('filters cur for invalid data type', function () {
      let validated;
      const duplicate = utils.deepClone(ortb2);
      duplicate.cur = 8;

      const expected = {
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

      duplicate.site.content.data[0].segment.push({ test: 3 });

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters bcat, badv for invalid data type', function () {
      const duplicate = utils.deepClone(ortb2);
      duplicate.badv = 'adadadbcd.com';
      duplicate.bcat = ['IAB25', 'IAB7-39'];

      const expected = {
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
        },
        bcat: ['IAB25', 'IAB7-39']
      };

      const validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters site.publisher object properties for invalid data type', function () {
      const duplicate = utils.deepClone(ortb2);
      duplicate.site.publisher = {
        id: '1',
        domain: ['xyz.com'],
        name: 'xyz',
      };

      const expected = {
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
          },
          publisher: {
            id: '1',
            name: 'xyz',
          }
        }
      };

      const validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });
  });
});
