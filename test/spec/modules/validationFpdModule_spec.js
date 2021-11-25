import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {
  filterArrayData,
  validateFpd
} from 'modules/validationFpdModule/index.js';

describe('the first party data validation module', function () {
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
