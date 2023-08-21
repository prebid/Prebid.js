import { loadExternalScript } from '../src/adloader.js';
import { logWarn, isEmptyStr } from '../src/utils.js';
import { config } from '../src/config.js';

const MODULE_NAME = 'dynamicAdBoost';
const SCRIPT_URL = 'https://adxbid.info';
// Options for the Intersection Observer
const dabOptions = {
  threshold: 0.5 // Trigger callback when 50% of the element is visible
};

// Create an Intersection Observer instance
const observer = new IntersectionObserver(dabHandleIntersection, dabOptions);

// Array of div IDs to track
var dynamicAdBoostAdUnits = {};
var dabStartDate = new Date();
var dabStartTime = dabStartDate.getTime();

function loadLmScript(keyId) {
  const scriptUrl = `${SCRIPT_URL}/${keyId}.js`;
  loadExternalScript(scriptUrl, MODULE_NAME);
}

function init() {
  config.getConfig(MODULE_NAME, conf => {
    logWarn(conf);
    if (conf[MODULE_NAME]['keyId']) {
      let keyId = conf[MODULE_NAME]['keyId'];
      if (keyId && !isEmptyStr(keyId)) {
        let dabDivIdsToTrack = conf[MODULE_NAME]['adUnits'];
        var dabInterval = setInterval(function() {
          // Observe each div by its ID
          dabDivIdsToTrack.forEach(divId => {
            let div = document.getElementById(divId);
            if (div) {
              observer.observe(div);
            }
          });

          var dabDateNow = new Date();
          var dabTimeNow = dabDateNow.getTime();
          var dabElapsedSeconds = Math.floor((dabTimeNow-dabStartTime)/1000);
          let elapsedThreshold = 30;
          if (conf[MODULE_NAME]['threshold']) {
            elapsedThreshold = conf[MODULE_NAME]['threshold'];
          }
          if (dabElapsedSeconds >= elapsedThreshold) {
            clearInterval(dabInterval); // Stop
            let viewableAdUnits = Object.keys(dynamicAdBoostAdUnits);
            let viewableAdUnitsCSV = viewableAdUnits.join(',');
            loadLmScript(keyId + '?viewableAdUnits=' + viewableAdUnitsCSV);
          }
        }, 1000);

        return true;
      }
      return false;
    }
  });
}

// Callback function when an observed element becomes visible
function dabHandleIntersection(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
      dynamicAdBoostAdUnits[entry.target.id] = entry.intersectionRatio;
    }
  });
}

init();
