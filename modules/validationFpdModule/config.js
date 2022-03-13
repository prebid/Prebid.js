/**
 * Data type map
 */
const TYPES = {
  string: 'string',
  object: 'object',
  number: 'number',
};

/**
 * Template to define what ortb2 attributes should be validated
 * Accepted fields:
 * -- invalid - {Boolean} if true, field is not valid
 * -- type - {String} valid data type of field
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
      h: { type: TYPES.number }
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
  }
}
