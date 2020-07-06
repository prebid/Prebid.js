import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

// const segCache = {};
export function getTargetingInfoForBid(bid) {

}

let subModules = [];

/**
 * enable submodule in User ID
 * @param {RtdSubmodule} submodule
 */
export function attachProvider(submodule) {
  subModules.push(submodule);
}

/**
 * @param bidRequest {object} - the bid which is passed to a prebid adapter for use in `buildRequests`
 * @returns {Array<string>} - an array of jwpseg targeting segments found for the given bidRequest information
 */
export function getTargetingForBid(bidRequest) {
  /*
  * */
  console.log('karim getTargetingForBid');
  const jwpTargeting = bidRequest.jwpTargeting;
  if (jwpTargeting) {
    /*
    jwpTargeting.playerID
    jwpTargeting.mediaID
     */
  }
}

export function setup () {
  console.log('karim setup');
  config.getConfig('jwpTargeting', (config) => {
    getTargetingForBid();
    // fetch media ids
    console.log('karim jwpTargeting set:', config);
  });
}

export function getMediaId(mediaId) {
  let ajax = ajaxBuilder(1500);
  ajax(`https://cdn.jwplayer.com/v2/media/${mediaId}/`,
    {
      success: function (response, req) {
        if (req.status === 200) {
          try {
            // const data = JSON.parse(response);
            // if (data && data.p && data.kn) {
            //   setData({p: data.p, kn: data.kn, pmd: data.pmd});
            // } else {
            //   setData({});
            // }
            // addBrowsiTag(data);
          } catch (err) {
            // utils.logError('unable to parse data');
            // setData({})
          }
        } else if (req.status === 204) {
          // unrecognized site key
          // setData({});
        }
      },
      error: function () {
        // setData({});
        // utils.logError('unable to get prediction data');
      }
    }
  );
}

console.log('karim');

submodule('jwplayer', getTargetingInfoForBid);
setup();
// submodule('jwplayer', getTargetingInfoForBid);
