import {setBidResponseVideoCache} from '../../../../libraries/pbsExtensions/processors/video.js';

describe('pbjs - ortb videoCacheKey based on ext.prebid', () => {
  const EXT_PREBID_CACHE = {
    ext: {
      prebid: {
        cache: {
          vastXml: {
            cacheId: 'id',
            url: 'url'
          }
        }
      }
    }
  }

  function setCache(bid) {
    const bidResponse = {mediaType: 'video'};
    setBidResponseVideoCache(bidResponse, bid);
    return bidResponse;
  }

  it('has no effect if mediaType is not video', () => {
    const resp = {mediaType: 'banner'};
    setBidResponseVideoCache(resp, EXT_PREBID_CACHE);
    expect(resp).to.eql({mediaType: 'banner'});
  });

  it('sets videoCacheKey, vastUrl from ext.prebid.cache.vastXml', () => {
    sinon.assert.match(setCache(EXT_PREBID_CACHE), {
      videoCacheKey: 'id',
      vastUrl: 'url'
    });
  });

  it('sets videoCacheKey, vastUrl from ext.prebid.targeting', () => {
    sinon.assert.match(setCache({
      ext: {
        prebid: {
          targeting: {
            hb_uuid: 'id',
            hb_cache_host: 'host',
            hb_cache_path: '/path'
          }
        }
      }
    }), {
      vastUrl: 'https://host/path?uuid=id',
      videoCacheKey: 'id'
    })
  });
});
