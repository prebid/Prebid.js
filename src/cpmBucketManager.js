import find from 'core-js/library/fn/array/find';
const utils = require('src/utils');

const _defaultPrecision = 2;
const _lgPriceConfig = {
  'buckets': [{
    'min': 0,
    'max': 5,
    'increment': 0.5
  }]
};
const _mgPriceConfig = {
  'buckets': [{
    'min': 0,
    'max': 20,
    'increment': 0.1
  }]
};
const _hgPriceConfig = {
  'buckets': [{
    'min': 0,
    'max': 20,
    'increment': 0.01
  }]
};
const _densePriceConfig = {
  'buckets': [{
    'min': 0,
    'max': 3,
    'increment': 0.01
  },
  {
    'min': 3,
    'max': 8,
    'increment': 0.05
  },
  {
    'min': 8,
    'max': 20,
    'increment': 0.5
  }]
};
const _autoPriceConfig = {
  'buckets': [{
    'min': 0,
    'max': 5,
    'increment': 0.05
  },
  {
    'min': 5,
    'max': 10,
    'increment': 0.1
  },
  {
    'min': 10,
    'max': 20,
    'increment': 0.5
  }]
};

function getPriceBucketString(cpm, customConfig, granularityMultiplier = 1) {
  let cpmFloat = parseFloat(cpm);
  if (isNaN(cpmFloat)) {
    cpmFloat = '';
  }

  return {
    low: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _lgPriceConfig, granularityMultiplier),
    med: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _mgPriceConfig, granularityMultiplier),
    high: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _hgPriceConfig, granularityMultiplier),
    auto: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _autoPriceConfig, granularityMultiplier),
    dense: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _densePriceConfig, granularityMultiplier),
    custom: (cpmFloat === '') ? '' : getCpmStringValue(cpm, customConfig, granularityMultiplier)
  };
}

function getCpmStringValue(cpm, config, granularityMultiplier) {
  let cpmStr = '';
  if (!isValidPriceConfig(config)) {
    return cpmStr;
  }
  const cap = config.buckets.reduce((prev, curr) => {
    if (prev.max > curr.max) {
      return prev;
    }
    return curr;
  }, {
    'max': 0,
  });
  let bucket = find(config.buckets, bucket => {
    if (cpm > cap.max * granularityMultiplier) {
      // cpm exceeds cap, just return the cap.
      let precision = bucket.precision;
      if (typeof precision === 'undefined') {
        precision = _defaultPrecision;
      }
      cpmStr = (bucket.max * granularityMultiplier).toFixed(precision);
    } else if (cpm <= bucket.max * granularityMultiplier && cpm >= bucket.min * granularityMultiplier) {
      return bucket;
    }
  });
  if (bucket) {
    cpmStr = getCpmTarget(cpm, bucket, granularityMultiplier);
  }
  return cpmStr;
}

function isValidPriceConfig(config) {
  if (utils.isEmpty(config) || !config.buckets || !Array.isArray(config.buckets)) {
    return false;
  }
  let isValid = true;
  config.buckets.forEach(bucket => {
    if (typeof bucket.min === 'undefined' || !bucket.max || !bucket.increment) {
      isValid = false;
    }
  });
  return isValid;
}

function getCpmTarget(cpm, bucket, granularityMultiplier) {
  const precision = typeof bucket.precision !== 'undefined' ? bucket.precision : _defaultPrecision;
  const increment = bucket.increment * granularityMultiplier;
  const bucketMin = bucket.min * granularityMultiplier;

  // start increments at the bucket min and then add bucket min back to arrive at the correct rounding
  let cpmTarget = ((Math.floor((cpm - bucketMin) / increment)) * increment) + bucketMin;
  // force to 10 decimal places to deal with imprecise decimal/binary conversions
  //    (for example 0.1 * 3 = 0.30000000000000004)
  cpmTarget = Number(cpmTarget.toFixed(10));
  return cpmTarget.toFixed(precision);
}

export { getPriceBucketString, isValidPriceConfig };
