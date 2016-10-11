let customConfig;
const _lgPriceCap = 5.00;
const _mgPriceCap = 20.00;
const _hgPriceCap = 20.00;

function getPriceBucketString(cpm) {
  var cpmFloat = 0;
  var returnObj = {
    low: '',
    med: '',
    high: '',
    auto: '',
    dense: '',
    custom: ''
  };
  try {
    cpmFloat = parseFloat(cpm);
    if (cpmFloat) {
      //round to closest .5
      if (cpmFloat > _lgPriceCap) {
        returnObj.low = _lgPriceCap.toFixed(2);
      } else {
        returnObj.low = (Math.floor(cpm * 2) / 2).toFixed(2);
      }

      //round to closest .1
      if (cpmFloat > _mgPriceCap) {
        returnObj.med = _mgPriceCap.toFixed(2);
      } else {
        returnObj.med = (Math.floor(cpm * 10) / 10).toFixed(2);
      }

      //round to closest .01
      if (cpmFloat > _hgPriceCap) {
        returnObj.high = _hgPriceCap.toFixed(2);
      } else {
        returnObj.high = (Math.floor(cpm * 100) / 100).toFixed(2);
      }

      // round auto default sliding scale
      if (cpmFloat <= 5) {
        // round to closest .05
        returnObj.auto = (Math.floor(cpm * 20) / 20).toFixed(2);
      } else if (cpmFloat <= 10) {
        // round to closest .10
        returnObj.auto = (Math.floor(cpm * 10) / 10).toFixed(2);
      } else if (cpmFloat <= 20) {
        // round to closest .50
        returnObj.auto = (Math.floor(cpm * 2) / 2).toFixed(2);
      } else {
        // cap at 20.00
        returnObj.auto = '20.00';
      }

      // dense mode
      if (cpmFloat <= 3) {
        // round to closest .01
        returnObj.dense = (Math.floor(cpm * 100) / 100).toFixed(2);
      } else if (cpmFloat <= 8) {
        // round to closest .05
        returnObj.dense = (Math.floor(cpm * 20) / 20).toFixed(2);
      } else if (cpmFloat <= 20) {
        // round to closest .50
        returnObj.dense = (Math.floor(cpm * 2) / 2).toFixed(2);
      } else {
        // cap at 20.00
        returnObj.dense = '20.00';
      }
    }
  } catch (e) {
    this.logError('Exception parsing CPM :' + e.message);
  }

  return returnObj;
}


foo = {
  "precision" : 2,
  "buckets" : [
    {
      "min" : 0,
      "max" : 2.5,
      "increment" : 0.1,
      "cap" : false
    },
    {
      "min" : 2.5,
      "max" : 10,
      "increment" : 0.25,
      "cap" : false
    },
    {
      "min" : 10,
      "max" : 25,
      "increment" : 0.5,
      "cap" : true
    }
  ]
};

function getPriceBuckets(config, cpm) {

}

function isValidePriceConfig(config) {
  //todo
  return true;
}

function getBucket(cpm, increment, precision) {
  let bucketSize = 1 / increment;
  return (Math.floor(cpm * bucketSize) / bucketSize).toFixed(precision);
}

export (customConfig, getPriceBuckets);
