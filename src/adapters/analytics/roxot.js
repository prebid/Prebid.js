import { ajax } from 'src/ajax';

/**
 * example2.js - analytics adapter for Example2 Analytics Endpoint example
 */

import adapter from 'AnalyticsAdapter';
const utils = require('../../utils');

const url = '//d.rxthdr.com/analytics';
const analyticsType = 'endpoint';

export default utils.extend(adapter(
  {
    url,
    analyticsType
  }
  ),
  {
    track({ eventType, args }) {
      ajax(url, (result) => utils.logInfo('Event ' + eventType + ' sent to roxot analytics with result ' + result), JSON.stringify({ eventType, args }));
    }
  });
