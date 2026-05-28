import { CategoryTaxonomy, ConnectionType, ContentContext, DeviceType, LocationType, MediaRating, ProductionQuality } from 'iab-adcom/enum';

/**
 * Data type map
 */
const TYPES = {
  string: 'string',
  object: 'object',
  number: 'number',
  integer: 'integer',
};

/**
 * Template to define what ortb2 attributes should be validated
 * Accepted fields:
 * -- invalid - {Boolean} if true, field is not valid
 * -- type - {String} valid data type of field
 * -- enum - {Object} valid values enum for the field
 * -- isArray - {Boolean} if true, field must be an array
 * -- childType - {String} used in conjuction with isArray: true, defines valid type of array indices
 * -- children - {Object} defines child properties needed to be validated (used only if type: object)
 * -- required - {Array} array of strings defining any required properties for object (used only if type: object)
 * -- optoutApplies - {Boolean} if true, optout logic will filter if applicable (currently only applies to user object)
 */
export const ORTB_MAP = {
  imp: {
    invalid: true
  },
  cur: {
    type: TYPES.object,
    isArray: true,
    childType: TYPES.string
  },
  device: {
    type: TYPES.object,
    children: {
      w: { type: TYPES.number },
      h: { type: TYPES.number },
      devicetype: { type: TYPES.integer, enum: DeviceType },
      connectiontype: { type: TYPES.integer, enum: ConnectionType },
      geo: {
        type: TYPES.object,
        isArray: false,
        children: {
          lat: { type: TYPES.number },
          lon: { type: TYPES.number },
          type: { type: TYPES.integer, enum: LocationType }
        }
      }
    }
  },
  site: {
    type: TYPES.object,
    children: {
      id: { type: TYPES.string },
      name: { type: TYPES.string },
      domain: { type: TYPES.string },
      cattax: { type: TYPES.integer, enum: CategoryTaxonomy },
      page: { type: TYPES.string },
      ref: { type: TYPES.string },
      keywords: { type: TYPES.string },
      kwarray: {
        type: TYPES.object,
        isArray: true,
        childType: TYPES.string
      },
      search: { type: TYPES.string },
      mobile: { type: TYPES.integer, enum: { NO: 0, YES: 1 } },
      privacypolicy: { type: TYPES.integer, enum: { NO: 0, YES: 1 } },
      inventorypartnerdomain: { type: TYPES.string },
      ext: {
        type: TYPES.object,
        isArray: false
      },
      cat: {
        type: TYPES.object,
        isArray: true,
        childType: TYPES.string
      },
      sectioncat: {
        type: TYPES.object,
        isArray: true,
        childType: TYPES.string
      },
      pagecat: {
        type: TYPES.object,
        isArray: true,
        childType: TYPES.string
      },
      content: {
        type: TYPES.object,
        isArray: false,
        children: {
          id: { type: TYPES.string },
          episode: { type: TYPES.integer },
          title: { type: TYPES.string },
          series: { type: TYPES.string },
          season: { type: TYPES.string },
          artist: { type: TYPES.string },
          genre: { type: TYPES.string },
          album: { type: TYPES.string },
          isrc: { type: TYPES.string },
          url: { type: TYPES.string },
          cattax: { type: TYPES.integer, enum: CategoryTaxonomy },
          cat: {
            type: TYPES.object,
            isArray: true,
            childType: TYPES.string
          },
          prodq: { type: TYPES.integer, enum: ProductionQuality },
          context: { type: TYPES.integer, enum: ContentContext },
          contentrating: { type: TYPES.string },
          userrating: { type: TYPES.string },
          qagmediarating: { type: TYPES.integer, enum: MediaRating },
          keywords: { type: TYPES.string },
          kwarray: {
            type: TYPES.object,
            isArray: true,
            childType: TYPES.string
          },
          livestream: { type: TYPES.integer, enum: { NO: 0, YES: 1 } },
          sourcerelationship: { type: TYPES.integer, enum: { INDIRECT: 0, DIRECT: 1 } },
          len: { type: TYPES.integer },
          language: { type: TYPES.string },
          langb: { type: TYPES.string },
          genres: {
            type: TYPES.object,
            isArray: true,
            childType: TYPES.string
          },
          gtax: { type: TYPES.integer },
          embeddable: { type: TYPES.integer, enum: { NO: 0, YES: 1 } },
          producer: {
            type: TYPES.object,
            isArray: false,
            children: {
              id: { type: TYPES.string },
              name: { type: TYPES.string },
              cattax: { type: TYPES.integer, enum: CategoryTaxonomy },
              cat: {
                type: TYPES.object,
                isArray: true,
                childType: TYPES.string
              },
              domain: { type: TYPES.string },
              ext: {
                type: TYPES.object,
                isArray: false
              }
            }
          },
          data: {
            type: TYPES.object,
            isArray: true,
            childType: TYPES.object,
            required: ['name', 'segment'],
            children: {
              id: { type: TYPES.string },
              segment: {
                type: TYPES.object,
                isArray: true,
                childType: TYPES.object,
                required: ['id'],
                children: {
                  id: { type: TYPES.string },
                  name: { type: TYPES.string },
                  value: { type: TYPES.string },
                  ext: {
                    type: TYPES.object,
                    isArray: false
                  }
                }
              },
              name: { type: TYPES.string },
              cids: {
                type: TYPES.object,
                isArray: true,
                childType: TYPES.string
              },
              ext: {
                type: TYPES.object,
                isArray: false
              },
            }
          },
          network: {
            type: TYPES.object,
            isArray: false,
            children: {
              id: { type: TYPES.string },
              name: { type: TYPES.string },
              domain: { type: TYPES.string },
              ext: {
                type: TYPES.object,
                isArray: false
              }
            }
          },
          channel: {
            type: TYPES.object,
            isArray: false,
            children: {
              id: { type: TYPES.string },
              name: { type: TYPES.string },
              domain: { type: TYPES.string },
              ext: {
                type: TYPES.object,
                isArray: false
              }
            }
          },
          ext: {
            type: TYPES.object,
            isArray: false
          }
        }
      },
      publisher: {
        type: TYPES.object,
        isArray: false,
        children: {
          id: { type: TYPES.string },
          name: { type: TYPES.string },
          cattax: { type: TYPES.integer, enum: CategoryTaxonomy },
          cat: {
            type: TYPES.object,
            isArray: true,
            childType: TYPES.string
          },
          domain: { type: TYPES.string },
          ext: {
            type: TYPES.object,
            isArray: false
          }
        }
      },
    }
  },
  user: {
    type: TYPES.object,
    children: {
      yob: {
        type: TYPES.number,
        optoutApplies: true
      },
      gender: {
        type: TYPES.string,
        optoutApplies: true
      },
      keywords: { type: TYPES.string },
      data: {
        type: TYPES.object,
        isArray: true,
        childType: TYPES.object,
        required: ['name', 'segment'],
        children: {
          segment: {
            type: TYPES.object,
            isArray: true,
            childType: TYPES.object,
            required: ['id'],
            children: {
              id: { type: TYPES.string }
            }
          },
          name: { type: TYPES.string },
          ext: { type: TYPES.object },
        }
      }
    }
  },
  bcat: {
    type: TYPES.object,
    isArray: true,
    childType: TYPES.string
  },
  badv: {
    type: TYPES.object,
    isArray: true,
    childType: TYPES.string
  },
  source: {
    type: TYPES.object,
    children: {
      ext: {
        type: TYPES.object,
        isArray: false
      },
      schain: {
        type: TYPES.object,
        children: {
          complete: { type: TYPES.number },
          ver: { type: TYPES.string },
          nodes: {
            type: TYPES.object,
            isArray: true,
            childType: TYPES.object,
            required: ['asi', 'sid', 'hp'],
            children: {
              asi: { type: TYPES.string },
              sid: { type: TYPES.string },
              hp: { type: TYPES.number },
              rid: { type: TYPES.string },
              name: { type: TYPES.string },
              domain: { type: TYPES.string },
              ext: { type: TYPES.object }
            }
          },
          ext: { type: TYPES.object }
        },
        required: ['complete', 'nodes', 'ver']
      }
    }
  }
}
