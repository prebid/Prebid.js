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
  let bucket = config.buckets.find(bucket => {
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
    cpmStr = getCpmTarget(cpm, bucket.increment, bucket.precision, granularityMultiplier);
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

function getCpmTarget(cpm, increment, precision, granularityMultiplier) {
  if (typeof precision === 'undefined') {
    precision = _defaultPrecision;
  }
  let bucketSize = 1 / (increment * granularityMultiplier);
  return (Math.floor(cpm * bucketSize) / bucketSize).toFixed(precision);
}

export { getPriceBucketString, isValidPriceConfig };
