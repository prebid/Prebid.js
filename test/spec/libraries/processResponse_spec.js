import { getBidFromResponse } from '../../../libraries/processResponse/index.js';
import {expect} from 'chai/index.js';

describe('processResponse', function () {
  const respItem = {
    'bid': [
      {
        'price': 0.504,
        'ext': {
          'visx': {
            'events': {
              'runtime': '//t.visx.net/track/status/RFTFjZflStSUyuXuyT2IKOZMVPUIiPkzebpPWYwKvNkE_IybYfFxk2P5feBnt9LhiR7291KTG11JjrnyHyhVKfolH_VRCmGppbnHXHfHJ9AgNqjhFB_yTg3m18wGO9k4LOddGAg3mk8qc5zYEIzNsPFnZzos1EkHh5WNs0EjrBpwCgTERUqM3PJD_Zy60nMDA-LCuq-Z4JNBGC_GHx4LwvwXipQsjdGHS-HkqHHf9sES45OlRrW4wMf69dsmey1gvwqFAhJwii2lzo9wfOohLCMRa3Vxd-zvzx-uw71maWOyKnJXWiP6c5xkyrfV4gukNYaDUgrHc0mA0yhqyiHxe8KzEl32rxQXJRCg4FoJcJ1g9jmpZQBnIh2QrKm5iC159elwzwf31_v3Uw97Zpek8j0CCLa8FjxSjvXm1Mq8x4jcwlt0ngfWU6WwyyKwX_GMbKWuAL_nrfxSvs1hZCb4eunEFyXb2lN2olWo8ezMEzZ8YRxF_mx0hDB3NXyV0Tb4b6KXQq7tvxV-1rKPRt7DySRTbLPht0hO3mjTHxutfihnuL6ROEr372gSAiDodnbdCq_lPsCsUSEpG7DmN-4In10uSp2MemjfbqI6tllOCO-j6Pm9mhdl_rT4anHmRG2DG_dLsfD7pLaAsgf2zl2bpawhxxLVjTxikoWjNKAvr_GNh4adHGj5EHbqaBaHovB573Yk-koHkyBNrebeiy-1-Knc28MWOpFi9XKjNsXx756jAXLx2H098ptaXF3mFiuT2Iv6sTVjqOI/{STATUS_CODE}'
            }
          },
          'prebid': {
            'events': {
              'pending': '//t.visx.net/track/pending/RFTFjZflStSUyuXuyT2IKOZMVPUIiPkzebpPWYwKvNkE_IybYfFxk2P5feBnt9LhiR7291KTG11JjrnyHyhVKfolH_VRCmGppbnHXHfHJ9AgNqjhFB_yTg3m18wGO9k4LOddGAg3mk8qc5zYEIzNsPFnZzos1EkHh5WNs0EjrBpwCgTERUqM3PJD_Zy60nMDA-LCuq-Z4JNBGC_GHx4LwvwXipQsjdGHS-HkqHHf9sES45OlRrW4wMf69dsmey1gvwqFAhJwii2lzo9wfOohLCMRa3Vxd-zvzx-uw71maWOyKnJXWiP6c5xkyrfV4gukNYaDUgrHc0mA0yhqyiHxe8KzEl32rxQXJRCg4FoJcJ1g9jmpZQBnIh2QrKm5iC159elwzwf31_v3Uw97Zpek8j0CCLa8FjxSjvXm1Mq8x4jcwlt0ngfWU6WwyyKwX_GMbKWuAL_nrfxSvs1hZCb4eunEFyXb2lN2olWo8ezMEzZ8YRxF_mx0hDB3NXyV0Tb4b6KXQq7tvxV-1rKPRt7DySRTbLPht0hO3mjTHxutfihnuL6ROEr372gSAiDodnbdCq_lPsCsUSEpG7DmN-4In10uSp2MemjfbqI6tllOCO-j6Pm9mhdl_rT4anHmRG2DG_dLsfD7pLaAsgf2zl2bpawhxxLVjTxikoWjNKAvr_GNh4adHGj5EHbqaBaHovB573Yk-koHkyBNrebeiy-1-Knc28MWOpFi9XKjNsXx756jAXLx2H098ptaXF3mFiuT2Iv6sTVjqOI/',
              'win': '//t.visx.net/track/win/RFTFjZflStSUyuXuyT2IKOZMVPUIiPkzebpPWYwKvNkE_IybYfFxk2P5feBnt9LhiR7291KTG11JjrnyHyhVKfolH_VRCmGppbnHXHfHJ9AgNqjhFB_yTg3m18wGO9k4LOddGAg3mk8qc5zYEIzNsPFnZzos1EkHh5WNs0EjrBpwCgTERUqM3PJD_Zy60nMDA-LCuq-Z4JNBGC_GHx4LwvwXipQsjdGHS-HkqHHf9sES45OlRrW4wMf69dsmey1gvwqFAhJwii2lzo9wfOohLCMRa3Vxd-zvzx-uw71maWOyKnJXWiP6c5xkyrfV4gukNYaDUgrHc0mA0yhqyiHxe8KzEl32rxQXJRCg4FoJcJ1g9jmpZQBnIh2QrKm5iC159elwzwf31_v3Uw97Zpek8j0CCLa8FjxSjvXm1Mq8x4jcwlt0ngfWU6WwyyKwX_GMbKWuAL_nrfxSvs1hZCb4eunEFyXb2lN2olWo8ezMEzZ8YRxF_mx0hDB3NXyV0Tb4b6KXQq7tvxV-1rKPRt7DySRTbLPht0hO3mjTHxutfihnuL6ROEr372gSAiDodnbdCq_lPsCsUSEpG7DmN-4In10uSp2MemjfbqI6tllOCO-j6Pm9mhdl_rT4anHmRG2DG_dLsfD7pLaAsgf2zl2bpawhxxLVjTxikoWjNKAvr_GNh4adHGj5EHbqaBaHovB573Yk-koHkyBNrebeiy-1-Knc28MWOpFi9XKjNsXx756jAXLx2H098ptaXF3mFiuT2Iv6sTVjqOI/',
              'bid_timeout': '//t.visx.net/track/bid_timeout/RFTFjZflStSUyuXuyT2IKOZMVPUIiPkzebpPWYwKvNkE_IybYfFxk2P5feBnt9LhiR7291KTG11JjrnyHyhVKfolH_VRCmGppbnHXHfHJ9AgNqjhFB_yTg3m18wGO9k4LOddGAg3mk8qc5zYEIzNsPFnZzos1EkHh5WNs0EjrBpwCgTERUqM3PJD_Zy60nMDA-LCuq-Z4JNBGC_GHx4LwvwXipQsjdGHS-HkqHHf9sES45OlRrW4wMf69dsmey1gvwqFAhJwii2lzo9wfOohLCMRa3Vxd-zvzx-uw71maWOyKnJXWiP6c5xkyrfV4gukNYaDUgrHc0mA0yhqyiHxe8KzEl32rxQXJRCg4FoJcJ1g9jmpZQBnIh2QrKm5iC159elwzwf31_v3Uw97Zpek8j0CCLa8FjxSjvXm1Mq8x4jcwlt0ngfWU6WwyyKwX_GMbKWuAL_nrfxSvs1hZCb4eunEFyXb2lN2olWo8ezMEzZ8YRxF_mx0hDB3NXyV0Tb4b6KXQq7tvxV-1rKPRt7DySRTbLPht0hO3mjTHxutfihnuL6ROEr372gSAiDodnbdCq_lPsCsUSEpG7DmN-4In10uSp2MemjfbqI6tllOCO-j6Pm9mhdl_rT4anHmRG2DG_dLsfD7pLaAsgf2zl2bpawhxxLVjTxikoWjNKAvr_GNh4adHGj5EHbqaBaHovB573Yk-koHkyBNrebeiy-1-Knc28MWOpFi9XKjNsXx756jAXLx2H098ptaXF3mFiuT2Iv6sTVjqOI/',
              'runtime': '//t.visx.net/track/status/RFTFjZflStSUyuXuyT2IKOZMVPUIiPkzebpPWYwKvNkE_IybYfFxk2P5feBnt9LhiR7291KTG11JjrnyHyhVKfolH_VRCmGppbnHXHfHJ9AgNqjhFB_yTg3m18wGO9k4LOddGAg3mk8qc5zYEIzNsPFnZzos1EkHh5WNs0EjrBpwCgTERUqM3PJD_Zy60nMDA-LCuq-Z4JNBGC_GHx4LwvwXipQsjdGHS-HkqHHf9sES45OlRrW4wMf69dsmey1gvwqFAhJwii2lzo9wfOohLCMRa3Vxd-zvzx-uw71maWOyKnJXWiP6c5xkyrfV4gukNYaDUgrHc0mA0yhqyiHxe8KzEl32rxQXJRCg4FoJcJ1g9jmpZQBnIh2QrKm5iC159elwzwf31_v3Uw97Zpek8j0CCLa8FjxSjvXm1Mq8x4jcwlt0ngfWU6WwyyKwX_GMbKWuAL_nrfxSvs1hZCb4eunEFyXb2lN2olWo8ezMEzZ8YRxF_mx0hDB3NXyV0Tb4b6KXQq7tvxV-1rKPRt7DySRTbLPht0hO3mjTHxutfihnuL6ROEr372gSAiDodnbdCq_lPsCsUSEpG7DmN-4In10uSp2MemjfbqI6tllOCO-j6Pm9mhdl_rT4anHmRG2DG_dLsfD7pLaAsgf2zl2bpawhxxLVjTxikoWjNKAvr_GNh4adHGj5EHbqaBaHovB573Yk-koHkyBNrebeiy-1-Knc28MWOpFi9XKjNsXx756jAXLx2H098ptaXF3mFiuT2Iv6sTVjqOI/{STATUS_CODE}'
            },
            'meta': {
              'mediaType': 'banner'
            }
          }
        },
        'impid': '2b642c27bdcf8f',
        'auid': 929004,
        'h': 250,
        'cur': 'EUR',
        'adomain': [
          ''
        ],
        'w': 300,
        'id': '9b6c7e04-0a09-4add-8ba9-0c8b98304de3'
      }
    ],
    'seat': '1429601'
  };
  const LOG_ERROR_MESS = {
    'noAuid': 'Bid from response has no auid parameter - ',
    'noAdm': 'Bid from response has no adm parameter - ',
    'noBid': 'Array of bid objects is empty',
    'noImpId': 'Bid from response has no impid parameter - ',
    'noPlacementCode': 'Can\'t find in requested bids the bid with auid - ',
    'emptyUids': 'Uids should not be empty',
    'emptySeatbid': 'Seatbid array from response has an empty item',
    'emptyResponse': 'Response is empty',
    'hasEmptySeatbidArray': 'Response has empty seatbid array',
    'hasNoArrayOfBids': 'Seatbid from response has no array of bid objects - ',
    'notAllowedCurrency': 'Currency is not supported - ',
    'currencyMismatch': 'Currency from the request is not match currency from the response - ',
    'onlyVideoInstream': 'Only video instream supported',
    'videoMissing': 'Bid request videoType property is missing - '
  };
  it('returns bid when respItem and LOG_ERROR_MESS is passed', function () {
    let response = getBidFromResponse(respItem, LOG_ERROR_MESS);
    expect(response).not.include.any.keys('emptyResponse', 'hasNoArrayOfBids', 'emptySeatbid');
  });
});
