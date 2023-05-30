export const ERR_TYPE = 0; // field has wrong type (only objects, enums, and arrays of objects or enums are checked)
export const ERR_UNKNOWN_FIELD = 1; // field is not defined in ORTB 2.5 spec
export const ERR_ENUM = 2; // field is an enum and its value is not one of those listed in the ORTB 2.5 spec

// eslint-disable-next-line symbol-description
export const extend = Symbol();

export function Obj(primitiveFields, spec = {}) {
  const scan = (path, parent, field, value, onError) => {
    if (value == null || typeof value !== 'object') {
      onError(ERR_TYPE, path, parent, field, value);
      return;
    }
    Object.entries(value).forEach(([k, v]) => {
      if (v == null) return;
      const kpath = path == null ? k : `${path}.${k}`;
      if (spec.hasOwnProperty(k)) {
        spec[k](kpath, value, k, v, onError);
        return;
      }
      if (k !== 'ext' && !primitiveFields.includes(k)) {
        onError(ERR_UNKNOWN_FIELD, kpath, value, k, v);
      }
    });
  };
  scan[extend] = (extraPrimitives, specOverride = {}) =>
    Obj(primitiveFields.concat(extraPrimitives), Object.assign({}, spec, specOverride));
  return scan;
}

export const ID = Obj(['id']);
export const Named = ID[extend](['name']);

export function Arr(def) {
  return (path, parent, field, value, onError) => {
    if (!Array.isArray(value)) {
      onError(ERR_TYPE, path, parent, field, value);
    } else {
      value.forEach((item, i) => def(`${path}.${i}`, value, i, item, onError));
    }
  };
}

export function IntEnum(min, max) {
  return (path, parent, field, value, onError) => {
    const errno = (() => {
      if (typeof value !== 'number') return ERR_TYPE;
      if (isNaN(value) || value > max || value < min) return ERR_ENUM;
    })();
    if (errno != null) {
      onError(errno, path, parent, field, value);
    }
  };
}
