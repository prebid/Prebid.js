import {ajax} from 'src/ajax';
import adapter from 'AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
const utils = require('../../utils');

/****
 * PubWise.io Analytics
 * Contact: support@pubwise.io
 * Developer: Stephen Johnston
 */

const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;
const BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;

/****
 *  later implementation
 *  const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
 *  const BID_ADJUSTMENT = CONSTANTS.EVENTS.BID_ADJUSTMENT;
 *  const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
 */

const analyticsType = 'endpoint';
let target_site = 'unknown';
let target_url = 'https://staging.api.pubwise.io';
let pw_version = '2.1.2';

let pubwiseAnalytics = Object.assign(adapter(
  {
    target_url,
    analyticsType
  }
  ),
  {
    // Override AnalyticsAdapter functions by supplying custom methods
    track({eventType, args}) {
      /*
       The args object is not always available, in addition neither is the config object
       it is available on the first call and we can setup our config. Potential additional
       PR for later, but this solves this for now.
       */
      if (args !== undefined && args.config !== undefined) {
        target_site = args.config.site;
      }
      if (args !== undefined && args.config !== undefined) {
        target_url = args.config.endpoint;
      }
      utils.logMessage('Sending PubWise Analytics Event ' + eventType);
      if (eventType === AUCTION_INIT || eventType === BID_RESPONSE || eventType === BID_REQUESTED || eventType === BID_WON) {
        ajax(target_url,
          (result) => utils.logInfo('PubWise Analytics Result', result), JSON.stringify({
          eventType,
          args,
          target_site,
          pw_version
        })
      )
        ;
      }
    }
  });

export default pubwiseAnalytics;


