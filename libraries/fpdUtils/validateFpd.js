import { ORTB_MAP } from './ortbMap.js';

function deepAccess(obj, path) {
  if (obj == null || path == null || path === '') return obj;
  return path.split('.').filter(Boolean).reduce((acc, key) => acc?.[key], obj);
}

function isEmpty(object) {
  if (!object) return true;
  if (Array.isArray(object) || typeof object === 'string') {
    return object.length === 0;
  }
  return Object.keys(object).length === 0;
}

function isNumber(object) {
  return typeof object === 'number';
}

function fpdWarn(...args) {
  // eslint-disable-next-line no-console
  console.warn(...args);
}

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
      fpdWarn(`Filtered ${parent}[] value at index ${i} in ortb2 data: missing required property ${key}`);
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

export function filterArrayData(arr, child, path, parent, optout = false) {
  arr = arr.filter((index, i) => {
    const check = typeValidation(index, { type: child.type, isArray: child.isArray });

    if (check && Array.isArray(index) === Boolean(child.isArray)) {
      return true;
    }

    fpdWarn(`Filtered ${parent}[] value at index ${i} in ortb2 data: expected type ${child.type}`);
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

    if (!typeBool) fpdWarn(`Filtered ${parent}[] value at index ${i}  in ortb2 data: expected type ${child.type}`);

    return result;
  }, []);

  return arr;
}

export function validateFpd(fpd, path = '', parent = '', optout = false) {
  if (!fpd) return {};

  const validObject = Object.assign({}, Object.keys(fpd).filter(key => {
    const mapping = deepAccess(ORTB_MAP, path + key);

    if (!mapping || !mapping.invalid) return key;

    fpdWarn(`Filtered ${parent}${key} property in ortb2 data: invalid property`);
    return false;
  }).filter(key => {
    const mapping = deepAccess(ORTB_MAP, path + key);
    const typeBool = (mapping) ? typeValidation(fpd[key], { type: mapping.type, isArray: mapping.isArray }) : true;

    if (typeBool || !mapping) return key;

    fpdWarn(`Filtered ${parent}${key} property in ortb2 data: expected type ${(mapping.isArray) ? 'array' : mapping.type}`);
    return false;
  }).reduce((result, key) => {
    const mapping = deepAccess(ORTB_MAP, path + key);

    if (mapping) {
      if (mapping.optoutApplies && optout) {
        fpdWarn(`Filtered ${parent}${key} data: pubcid optout found`);
        return result;
      }

      const modified = (mapping.type === 'object' && !mapping.isArray)
        ? validateFpd(fpd[key], path + key + '.children.', parent + key + '.', optout)
        : (mapping.isArray && mapping.childType)
            ? filterArrayData(fpd[key], { type: mapping.childType, isArray: mapping.childisArray }, path + key, parent + key, optout) : fpd[key];

      (!isEmptyData(modified)) ? result[key] = modified
        : fpdWarn(`Filtered ${parent}${key} property in ortb2 data: empty data found`);
    } else {
      result[key] = fpd[key];
    }

    return result;
  }, {}));

  return validObject;
}
