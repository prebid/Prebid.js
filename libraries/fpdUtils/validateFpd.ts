import { ORTB_MAP } from './ortbMap.js';

/**
 * Utility functions the validator depends on. These are expected to be the
 * corresponding exports from `src/utils.js`, injected by the caller so that
 * this library stays decoupled from core.
 */
export type FpdValidatorDeps = {
  logWarn: (...args: any[]) => void;
  isNumber: (val: unknown) => val is number;
  isEmpty: (val: unknown) => boolean;
  deepAccess: (obj: any, path: string) => any;
};

export type FpdValidatorOptions = {
  /**
   * Whether the validator removes invalid data from its input. This only affects
   * the wording of the warnings: `true` (the default) reports data as "Filtered";
   * `false` reports it as "Invalid", for callers that inspect without altering the data.
   */
  filtered?: boolean;
};

/**
 * Build an ortb2 first-party-data validator.
 * @param deps utility functions from `src/utils.js`
 * @param deps.logWarn warning logger
 * @param deps.isNumber number type guard
 * @param deps.isEmpty empty-value check
 * @param deps.deepAccess dotted-path accessor
 * @param options validator options
 * @param options.filtered whether invalid data is removed (controls warning wording)
 * @returns `validateFpd` and `filterArrayData` bound to the injected utilities
 */
export function fpdValidator({ logWarn, isNumber, isEmpty, deepAccess }: FpdValidatorDeps, { filtered = true }: FpdValidatorOptions = {}) {
  const label = filtered ? 'Filtered' : 'Invalid';
  function isEmptyData(data) {
    let check = true;

    if (typeof data === 'object' && !isEmpty(data)) {
      check = false;
    } else if (typeof data !== 'object' && (isNumber(data) || data)) {
      check = false;
    }

    return check;
  }

  function getRequiredData(obj, required, parent, i) {
    let check = true;

    required.forEach(key => {
      if (!obj[key] || isEmptyData(obj[key])) {
        check = false;
        logWarn(`${label} ${parent}[] value at index ${i} in ortb2 data: missing required property ${key}`);
      }
    });

    return check;
  }

  function typeValidation(data, mapping) {
    let check = false;

    switch (mapping.type) {
      case 'string':
        if (typeof data === 'string') check = true;
        break;
      case 'number':
        if (typeof data === 'number' && isFinite(data)) check = true;
        break;
      case 'object':
        if (typeof data === 'object') {
          if ((Array.isArray(data) && mapping.isArray) || (!Array.isArray(data) && !mapping.isArray)) check = true;
        }
        break;
    }

    return check;
  }

  function filterArrayData(arr, child, path, parent, optout = false) {
    arr = arr.filter((index, i) => {
      const check = typeValidation(index, { type: child.type, isArray: child.isArray });

      if (check && Array.isArray(index) === Boolean(child.isArray)) {
        return true;
      }

      logWarn(`${label} ${parent}[] value at index ${i} in ortb2 data: expected type ${child.type}`);
      return false;
    }).filter((index, i) => {
      let requiredCheck = true;
      const mapping = deepAccess(ORTB_MAP, path);

      if (mapping && mapping.required) requiredCheck = getRequiredData(index, mapping.required, parent, i);

      if (requiredCheck) return true;
      return false;
    }).reduce((result, value, i) => {
      let typeBool = false;
      const mapping = deepAccess(ORTB_MAP, path);

      switch (child.type) {
        case 'string':
          result.push(value);
          typeBool = true;
          break;
        case 'object':
          if (mapping && mapping.children) {
            const validObject = validateFpd(value, path + '.children.', parent + '.', optout);
            if (Object.keys(validObject).length) {
              const requiredCheck = getRequiredData(validObject, mapping.required, parent, i);

              if (requiredCheck) {
                result.push(validObject);
                typeBool = true;
              }
            }
          } else {
            result.push(value);
            typeBool = true;
          }
          break;
      }

      if (!typeBool) logWarn(`${label} ${parent}[] value at index ${i}  in ortb2 data: expected type ${child.type}`);

      return result;
    }, []);

    return arr;
  }

  function validateFpd(fpd, path = '', parent = '', optout = false) {
    if (!fpd) return {};

    const validObject = Object.assign({}, Object.keys(fpd).filter(key => {
      const mapping = deepAccess(ORTB_MAP, path + key);

      if (!mapping || !mapping.invalid) return key;

      logWarn(`${label} ${parent}${key} property in ortb2 data: invalid property`);
      return false;
    }).filter(key => {
      const mapping = deepAccess(ORTB_MAP, path + key);
      const typeBool = (mapping) ? typeValidation(fpd[key], { type: mapping.type, isArray: mapping.isArray }) : true;

      if (typeBool || !mapping) return key;

      logWarn(`${label} ${parent}${key} property in ortb2 data: expected type ${(mapping.isArray) ? 'array' : mapping.type}`);
      return false;
    }).reduce((result, key) => {
      const mapping = deepAccess(ORTB_MAP, path + key);

      if (mapping) {
        if (mapping.optoutApplies && optout) {
          logWarn(`${label} ${parent}${key} data: pubcid optout found`);
          return result;
        }

        const modified = (mapping.type === 'object' && !mapping.isArray)
          ? validateFpd(fpd[key], path + key + '.children.', parent + key + '.', optout)
          : (mapping.isArray && mapping.childType)
              ? filterArrayData(fpd[key], { type: mapping.childType, isArray: mapping.childisArray }, path + key, parent + key, optout) : fpd[key];

        (!isEmptyData(modified)) ? result[key] = modified
          : logWarn(`${label} ${parent}${key} property in ortb2 data: empty data found`);
      } else {
        result[key] = fpd[key];
      }

      return result;
    }, {}));

    return validObject;
  }

  return { validateFpd, filterArrayData };
}
