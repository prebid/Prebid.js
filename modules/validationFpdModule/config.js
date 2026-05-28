import { ConnectionType, DeviceType, IPLocationService, LocationType } from 'iab-adcom/enum';

/**
 * Data type map
 */
const TYPES = {
  string: 'string',
  object: 'object',
  number: 'number',
  integer: 'integer',
};

const SIGNAL = Object.freeze({
  NO: 0,
  YES: 1
});

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
      ua: { type: TYPES.string },
      dnt: { type: TYPES.integer, enum: SIGNAL },
      lmt: { type: TYPES.integer, enum: SIGNAL },
      ip: { type: TYPES.string },
      ipv6: { type: TYPES.string },
      devicetype: { type: TYPES.integer, enum: DeviceType },
      make: { type: TYPES.string },
      model: { type: TYPES.string },
      os: { type: TYPES.string },
      osv: { type: TYPES.string },
      hwv: { type: TYPES.string },
      h: { type: TYPES.number },
      w: { type: TYPES.number },
      ppi: { type: TYPES.number },
      pxratio: { type: TYPES.number },
      js: { type: TYPES.integer, enum: SIGNAL },
      geofetch: { type: TYPES.integer, enum: SIGNAL },
      flashver: { type: TYPES.string },
      language: { type: TYPES.string },
      carrier: { type: TYPES.string },
      mccmnc: { type: TYPES.string },
      connectiontype: { type: TYPES.integer, enum: ConnectionType },
      ifa: { type: TYPES.string },
      didsha1: { type: TYPES.string },
      didmd5: { type: TYPES.string },
      dpidsha1: { type: TYPES.string },
      dpidmd5: { type: TYPES.string },
      macsha1: { type: TYPES.string },
      macmd5: { type: TYPES.string },
      ext: { type: TYPES.object },
      geo: {
        type: TYPES.object,
        isArray: false,
        children: {
          lat: { type: TYPES.number },
          lon: { type: TYPES.number },
          type: { type: TYPES.integer, enum: LocationType },
          accuracy: { type: TYPES.number },
          lastfix: { type: TYPES.number },
          ipservice: { type: TYPES.integer, enum: IPLocationService },
          country: { type: TYPES.string },
          region: { type: TYPES.string },
          regionfips104: { type: TYPES.string },
          metro: { type: TYPES.string },
          city: { type: TYPES.string },
          zip: { type: TYPES.string },
          utcoffset: { type: TYPES.number },
          ext: { type: TYPES.object }
        }
      }
    }
  },
  site: {
    type: TYPES.object,
    children: {
      name: { type: TYPES.string },
      domain: { type: TYPES.string },
      page: { type: TYPES.string },
      ref: { type: TYPES.string },
      keywords: { type: TYPES.string },
      search: { type: TYPES.string },
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
      publisher: {
        type: TYPES.object,
        isArray: false,
        children: {
          id: { type: TYPES.string },
          name: { type: TYPES.string },
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
