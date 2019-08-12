import { isNumber, isStr, isArray, isPlainObject, hasOwn, logError } from './utils';

// validate the supply chanin object
// https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md

export function isSchainObjectValid(schainObject) {
  const schainErrorPrefix = 'Invalid schain object found: ';
  const shouldBeAString = ' should be a string';
  const shouldBeAnInteger = ' should be an Integer';
  const shouldBeAnObject = ' should be an object';
  const shouldBeAnArray = ' should be an Array';

  if (!isPlainObject(schainObject)) {
    logError(schainErrorPrefix + `schain` + shouldBeAnObject);
    return false;
  }

  // complete: Integer
  if (!isNumber(schainObject.complete) && !Number.isInteger(schainObject.complete)) {
    logError(schainErrorPrefix + `schain.complete` + shouldBeAnInteger);
    return false;
  }

  // ver: String
  if (!isStr(schainObject.ver)) {
    logError(schainErrorPrefix + `schain.ver` + shouldBeAString);
    return false;
  }

  // ext: Object [optional]
  if (hasOwn(schainObject, 'ext')) {
    if (!isPlainObject(schainObject.ext)) {
      logError(schainErrorPrefix + `schain.ext` + shouldBeAnObject);
      return false;
    }
  }

  // nodes: Array of objects
  if (!isArray(schainObject.nodes)) {
    logError(schainErrorPrefix + `schain.nodes` + shouldBeAnArray);
    return false;
  }

  // now validate each node
  let isEachNodeIsValid = true;
  schainObject.nodes.forEach(node => {
    // asi: String
    if (!isStr(node.asi)) {
      isEachNodeIsValid = isEachNodeIsValid && false;
      logError(schainErrorPrefix + `schain.nodes[].asi` + shouldBeAString);
    }

    // sid: String
    if (!isStr(node.sid)) {
      isEachNodeIsValid = isEachNodeIsValid && false;
      logError(schainErrorPrefix + `schain.nodes[].sid` + shouldBeAString);
    }

    // hp: Integer
    if (!isNumber(node.hp) && !Number.isInteger(node.hp)) {
      isEachNodeIsValid = isEachNodeIsValid && false;
      logError(schainErrorPrefix + `schain.nodes[].hp` + shouldBeAnInteger);
    }

    // rid: String [Optional]
    if (hasOwn(node, 'rid')) {
      if (!isStr(node.rid)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        logError(schainErrorPrefix + `schain.nodes[].rid` + shouldBeAString);
      }
    }

    // name: String [Optional]
    if (hasOwn(node, 'name')) {
      if (!isStr(node.name)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        logError(schainErrorPrefix + `schain.nodes[].name` + shouldBeAString);
      }
    }

    // domain: String [Optional]
    if (hasOwn(node, 'domain')) {
      if (!isStr(node.domain)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        logError(schainErrorPrefix + `schain.nodes[].domain` + shouldBeAString);
      }
    }

    // rid: String [Optional]
    if (hasOwn(node, 'ext')) {
      if (!isPlainObject(node.ext)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        logError(schainErrorPrefix + `schain.nodes[].ext` + shouldBeAnObject);
      }
    }
  });

  if (!isEachNodeIsValid) {
    return false;
  }

  return true;
}

export function copySchainObjectInAdunits(adUnits, schainObject) {
  // copy schain object in all adUnits as adUnit.bid.schain
  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      bid.schain = schainObject;
    });
  });
}
