import { ajax } from 'src/ajax';
import adapter from 'AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

const utils = require('../../utils');

const url = '//d.prebid-analytic.com/analytics';
const analyticsType = 'endpoint';

var events = [];
var auctionEnd = CONSTANTS.EVENTS.AUCTION_END;

export default utils.extend(adapter(
  {
    url,
    analyticsType
  }
  ),
  {
    track({ eventType, args }) {
      if (eventType === auctionEnd) {
        ajax(url, (result) => utils.logInfo('Event ' + eventType + ' sent to roxot prebid analityc with result ' + result), JSON.stringify(events));
        events = [];
      } else {
        events.push({ eventType, args });
      }
    }
  });
