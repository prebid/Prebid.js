import {expect} from 'chai';
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
      const child = {type: 'string'};
      const parent = 'site';
      const key = 'cat';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('filters invalid type of array data', function () {
      const arr = ['foo', {test: 1}];
      const path = 'site.children.cat';
      const child = {type: 'string'};
      const parent = 'site';
      const key = 'cat';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal(['foo']);
    });

    it('filters all data for missing required children', function () {
      const arr = [{test: 1}];
      const path = 'site.children.content.children.data';
      const child = {type: 'object'};
      const parent = 'site';
      const key = 'data';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('filters all data for invalid required children types', function () {
      const arr = [{name: 'foo', segment: 1}];
      const path = 'site.children.content.children.data';
      const child = {type: 'object'};
      const parent = 'site';
      const key = 'data';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([]);
    });

    it('returns only data with valid required nested children types', function () {
      const arr = [{name: 'foo', segment: [{id: '1'}, {id: 2}, 'foobar']}];
      const path = 'site.children.content.children.data';
      const child = {type: 'object'};
      const parent = 'site';
      const key = 'data';
      const validated = filterArrayData(arr, child, path, parent, key);
      expect(validated).to.deep.equal([{name: 'foo', segment: [{id: '1'}]}]);
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

      duplicate.user.data[0].segment.push({test: 3});
      duplicate.user.data[0].segment[0] = {foo: 'bar'};

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

      duplicate.site.content.data[0].segment.push({test: 3});

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

      duplicate.site.content.data[0].segment.push({test: 3});

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
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

      duplicate.site.content.data[0].segment.push({test: 3});

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
