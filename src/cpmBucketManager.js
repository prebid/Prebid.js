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

function getPriceBucketString(cpm, customConfig) {
  let cpmFloat = 0;
  cpmFloat = parseFloat(cpm);
  if (isNaN(cpmFloat)) {
    cpmFloat = '';
  }

  return {
    low: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _lgPriceConfig),
    med: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _mgPriceConfig),
    high: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _hgPriceConfig),
    auto: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _autoPriceConfig),
    dense: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _densePriceConfig),
    custom: (cpmFloat === '') ? '' : getCpmStringValue(cpm, customConfig)
  };
}

function getCpmStringValue(cpm, config) {
  let cpmStr = '';
  if (!isValidePriceConfig(config)) {
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
    if (cpm > cap.max) {
      const precision = bucket.precision || _defaultPrecision;
      cpmStr = bucket.max.toFixed(precision);
    } else if (cpm <= bucket.max && cpm >= bucket.min) {
      return bucket;
    }
  });
  if (bucket) {
    cpmStr = getCpmTarget(cpm, bucket.increment, bucket.precision);
  }
  return cpmStr;
}

function isValidePriceConfig(config) {
  if (!config || !config.buckets || !Array.isArray(config.buckets)) {
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

function getCpmTarget(cpm, increment, precision) {
  if (!precision) {
    precision = _defaultPrecision;
  }
  let bucketSize = 1 / increment;
  return (Math.floor(cpm * bucketSize) / bucketSize).toFixed(precision);
}

export { getPriceBucketString, isValidePriceConfig };
