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

function getPriceBucketString(cpm, customConfig, currencyMultiplier) {
  currencyMultiplier = currencyMultiplier || 1;
  let cpmFloat = 0;
  cpmFloat = parseFloat(cpm);
  if (isNaN(cpmFloat)) {
    cpmFloat = '';
  }

  return {
    low: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _lgPriceConfig, currencyMultiplier),
    med: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _mgPriceConfig, currencyMultiplier),
    high: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _hgPriceConfig, currencyMultiplier),
    auto: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _autoPriceConfig, currencyMultiplier),
    dense: (cpmFloat === '') ? '' : getCpmStringValue(cpm, _densePriceConfig, currencyMultiplier),
    custom:  (cpmFloat === '') ? '' : getCpmStringValue(cpm, customConfig, currencyMultiplier)
  };
}

function getCpmStringValue(cpm, config, currencyMultiplier) {
  let cpmStr = '';
  if (!isValidPriceConfig(config)) {
    return cpmStr;
  }
  const cap = config.buckets.reduce((prev,curr) => {
    if (prev.max > curr.max) {
      return prev;
    }
    return curr;
  }, {
    'max': 0,
  });
  let bucket = config.buckets.find(bucket => {
    if (cpm > cap.max * currencyMultiplier) {
      const precision = bucket.precision || _defaultPrecision;
      cpmStr = (bucket.max * currencyMultiplier).toFixed(precision);
    } else if (cpm <= bucket.max * currencyMultiplier && cpm >= bucket.min * currencyMultiplier) {
      return bucket;
    }
  });
  if (bucket) {
    cpmStr = getCpmTarget(cpm, bucket.increment, bucket.precision, currencyMultiplier);
  }
  return cpmStr;
}

function isValidPriceConfig(config) {
  if (!config || !config.buckets || !Array.isArray(config.buckets)) {
    return false;
  }
  let isValid = true;
  config.buckets.forEach(bucket => {
    if(typeof bucket.min === 'undefined' || !bucket.max || !bucket.increment) {
      isValid = false;
    }
  });
  return isValid;
}

function getCpmTarget(cpm, increment, precision, currencyMultiplier) {
  if (!precision) {
    precision = _defaultPrecision;
  }
  let bucketSize = 1 / increment * currencyMultiplier;
  return (Math.floor(cpm * bucketSize) / bucketSize).toFixed(precision);
}

export { getPriceBucketString, isValidPriceConfig };
