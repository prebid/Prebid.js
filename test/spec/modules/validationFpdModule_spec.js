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

    it('validates additional OpenRTB site and content fields with IAB enum values', function () {
      const duplicate = utils.deepClone(ortb2);
      duplicate.site = {
        id: 'site-id',
        cattax: 6,
        mobile: 1,
        privacypolicy: 0,
        inventorypartnerdomain: 'partner.example',
        kwarray: ['sports', 'news'],
        ext: { inventory: 'premium' },
        content: {
          id: 'content-id',
          episode: 3,
          cattax: 7,
          cat: ['IAB1'],
          prodq: 1,
          context: 5,
          qagmediarating: 2,
          livestream: 0,
          sourcerelationship: 1,
          embeddable: 1,
          kwarray: ['article'],
          producer: {
            id: 'producer-id',
            cattax: 6,
            cat: ['IAB2'],
            domain: 'producer.example'
          },
          data: [{
            id: 'provider-id',
            name: 'content',
            segment: [{ id: 'test', name: 'seg', value: 'value', ext: { foo: 'bar' } }],
            cids: ['cid-1']
          }],
          network: { id: 'net-id', name: 'network', domain: 'network.example' },
          channel: { id: 'channel-id', name: 'channel', domain: 'channel.example' }
        },
        publisher: {
          id: 'pub-id',
          cattax: 6,
          cat: ['IAB3'],
          name: 'publisher'
        }
      };

      const validated = validateFpd(duplicate);
      expect(validated.site).to.deep.equal(duplicate.site);
    });

    it('filters invalid additional OpenRTB site and content field types and enum values', function () {
      const duplicate = utils.deepClone(ortb2);
      duplicate.site = {
        id: 123,
        cattax: 99,
        mobile: 2,
        privacypolicy: '1',
        inventorypartnerdomain: ['partner.example'],
        kwarray: ['sports', 12],
        content: {
          episode: '3',
          cattax: 99,
          cat: ['IAB1', 2],
          prodq: 99,
          context: 99,
          qagmediarating: 99,
          livestream: '0',
          sourcerelationship: 2,
          embeddable: 2,
          kwarray: ['article', {}],
          producer: {
            cattax: '6',
            cat: ['IAB2', false],
            domain: ['producer.example']
          },
          data: [{
            name: 'content',
            segment: [{ id: 'test', name: 1, value: 2, ext: 'bad' }],
            cids: ['cid-1', 1]
          }],
          network: { id: 1, name: 'network', domain: ['network.example'] },
          channel: { id: 'channel-id', name: 2, domain: 'channel.example' }
        },
        publisher: {
          cattax: '6',
          cat: ['IAB3', {}],
          name: 'publisher'
        }
      };

      const validated = validateFpd(duplicate);
      expect(validated.site).to.deep.equal({
        kwarray: ['sports'],
        content: {
          cat: ['IAB1'],
          kwarray: ['article'],
          producer: {
            cat: ['IAB2']
          },
          data: [{
            name: 'content',
            segment: [{ id: 'test' }],
            cids: ['cid-1']
          }],
          network: { name: 'network' },
          channel: { id: 'channel-id', domain: 'channel.example' }
        },
        publisher: {
          cat: ['IAB3'],
          name: 'publisher'
        }
      });
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
