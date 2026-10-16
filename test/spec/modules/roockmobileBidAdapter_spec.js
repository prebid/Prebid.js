import { expect } from 'chai';
import { spec } from 'modules/roockmobileBidAdapter.js';
import { server } from 'test/mocks/xhr.js';

describe('Roockmobile bid adapter', () => {
  const bid = {
    bidder: 'roockmobile',
    bidId: 'bid-id',
    params: { mid: '2294', token: 'token value', tagid: 'placement-1' },
    mediaTypes: { banner: { sizes: [[300, 250], [320, 50]] } }
  };
  const bidderRequest = {
    bidderRequestId: 'request-id',
    timeout: 1000,
    refererInfo: { page: 'https://example.test/page' }
  };

  it('requires mid, token, and tagid', () => {
    expect(spec.isBidRequestValid(bid)).to.equal(true);
    ['mid', 'token', 'tagid'].forEach(param => {
      const invalidBid = { ...bid, params: { ...bid.params } };
      delete invalidBid.params[param];
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  it('sends mid and token in the URL and tagid in the impression', () => {
    const request = spec.buildRequests([bid], bidderRequest)[0];
    const payload = request.data;
    expect(request.method).to.equal('POST');
    expect(request.url).to.equal('https://pbjs.rmcdnnode.com/pbjs?mid=2294&token=token%20value');
    expect(payload.imp).to.have.length(1);
    expect(payload.imp[0]).to.include({ id: 'bid-id', tagid: 'placement-1', secure: 1 });
    expect(payload.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 320, h: 50 }]);
  });

  it('sends the OpenRTB test flag only when requested', () => {
    const request = spec.buildRequests([{ ...bid, params: { ...bid.params, test: 1 } }], bidderRequest)[0];
    expect(request.url).to.equal('https://pbjs.rmcdnnode.com/pbjs?mid=2294&token=token%20value');
    expect(request.data.test).to.equal(1);
    expect(spec.buildRequests([bid], bidderRequest)[0].data.test).to.equal(0);
  });

  it('uses the externally configured domain and keeps the fixed paths', () => {
    const request = spec.buildRequests([{
      ...bid,
      params: {
        ...bid.params,
        domain: 'https://ignored:credentials@test.rmcdnnode.com/not-a-request-path?ignored=1'
      }
    }], bidderRequest)[0];
    expect(request.url).to.equal('https://test.rmcdnnode.com/pbjs?mid=2294&token=token%20value');
    const response = { body: { seatbid: [] } };
    spec.interpretResponse(response, request);
    expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [response])).to.deep.equal([
      { type: 'iframe', url: 'https://test.rmcdnnode.com/usersync' }
    ]);
  });

  it('falls back to the default domain for invalid or non-Roockmobile origins', () => {
    const request = spec.buildRequests([{
      ...bid,
      params: { ...bid.params, domain: 'https://example.test' }
    }], bidderRequest)[0];
    expect(request.url).to.equal('https://pbjs.rmcdnnode.com/pbjs?mid=2294&token=token%20value');
    expect(spec.getUserSyncs({ iframeEnabled: true })).to.deep.equal([
      { type: 'iframe', url: 'https://pbjs.rmcdnnode.com/usersync' }
    ]);
    const malformedRequest = spec.buildRequests([{
      ...bid,
      params: { ...bid.params, domain: 'not a URL' }
    }], bidderRequest)[0];
    expect(malformedRequest.url).to.equal('https://pbjs.rmcdnnode.com/pbjs?mid=2294&token=token%20value');
  });

  it('returns the Roockmobile user-sync URL only when syncing is enabled', () => {
    expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true })).to.deep.equal([
      { type: 'iframe', url: 'https://pbjs.rmcdnnode.com/usersync' }
    ]);
    expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true })).to.deep.equal([
      { type: 'image', url: 'https://pbjs.rmcdnnode.com/usersync' }
    ]);
    expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false })).to.deep.equal([]);
  });

  it('interprets an OpenRTB banner bid', () => {
    const request = spec.buildRequests([bid], bidderRequest)[0];
    const bids = spec.interpretResponse({
      body: { seatbid: [{ bid: [{ impid: 'bid-id', price: 1.25, cur: 'USD', w: 300, h: 250, crid: 'creative', adm: '<div>ad</div>' }] }] }
    }, request);
    expect(bids[0]).to.include({ requestId: 'bid-id', cpm: 1.25, width: 300, height: 250, creativeId: 'creative' });
  });

  if (FEATURES.VIDEO) {
    it('builds an OpenRTB video impression and reads a VAST response', () => {
      const videoBid = {
        ...bid,
        mediaTypes: { video: { mimes: ['video/mp4'], playerSize: [[640, 360]], minduration: 5, maxduration: 30, protocols: [2, 3] } }
      };
      const request = spec.buildRequests([videoBid], bidderRequest)[0];
      const payload = request.data;
      expect(payload.imp[0].video).to.deep.include({ w: 640, h: 360, minduration: 5, maxduration: 30 });
      const bids = spec.interpretResponse({
        body: { seatbid: [{ bid: [{ impid: 'bid-id', price: 1, w: 640, h: 360, crid: 'video', adm: '<VAST />', nurl: 'https://win.example.test' }] }] }
      }, request);
      expect(bids[0]).to.include({ mediaType: 'video', vastXml: '<VAST />', nurl: 'https://win.example.test' });
      expect(bids[0].vastUrl).to.equal(undefined);
    });
  }

  it('calls the OpenRTB win-notice URL with its auction price macro resolved', () => {
    const nurl = 'https://win.example.test/notice?price=${AUCTION_PRICE}';
    const resolvedNurl = 'https://win.example.test/notice?price=1.25';
    spec.onBidWon({ nurl, originalCpm: 1.25, cpm: 2 });
    const winRequests = server.requests.filter(request => request.url === resolvedNurl);
    expect(winRequests).to.have.length(1);
    expect(winRequests[0].method).to.equal('GET');
    expect(winRequests[0].fetch.request.keepalive).to.equal(true);
  });

  if (FEATURES.NATIVE) {
    it('builds and interprets an OpenRTB native request', () => {
      const nativeBid = {
        ...bid,
        mediaTypes: { native: { title: { required: true } } },
        nativeOrtbRequest: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] }
      };
      const request = spec.buildRequests([nativeBid], bidderRequest)[0];
      expect(JSON.parse(request.data.imp[0].native.request).assets[0].title.len).to.equal(80);
      const bids = spec.interpretResponse({
        body: {
          seatbid: [{
            bid: [{
              impid: 'bid-id',
              price: 1,
              w: 300,
              h: 250,
              crid: 'native',
              nurl: 'https://win.example.test/native',
              adm: JSON.stringify({
                assets: [
                  { id: 1, title: { text: 'Native title' } },
                  { id: 2, img: { url: 'https://cdn.example.test/native.jpg', w: 300, h: 250 } },
                  { id: 3, data: { value: 'Sponsored' } }
                ],
                link: { url: 'https://advertiser.example.test', clicktrackers: ['https://click.example.test'] },
                imptrackers: ['https://impression.example.test']
              })
            }]
          }]
        }
      }, request);
      expect(bids[0]).to.include({ mediaType: 'native', nurl: 'https://win.example.test/native' });
      expect(bids[0].native.ortb).to.deep.include({
        link: { url: 'https://advertiser.example.test', clicktrackers: ['https://click.example.test'] },
        imptrackers: ['https://impression.example.test']
      });
      expect(bids[0].native.ortb.assets).to.deep.equal([
        { id: 1, title: { text: 'Native title' } },
        { id: 2, img: { url: 'https://cdn.example.test/native.jpg', w: 300, h: 250 } },
        { id: 3, data: { value: 'Sponsored' } }
      ]);
    });

    it('uses response markup to identify the winning format on a multiformat impression', () => {
      const multiformatBid = {
        ...bid,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          native: { title: { required: true } }
        },
        nativeOrtbRequest: { ver: '1.2', assets: [{ id: 1, title: { len: 80 } }] }
      };
      const request = spec.buildRequests([multiformatBid], bidderRequest)[0];
      const bids = spec.interpretResponse({
        body: {
          seatbid: [{
            bid: [{
              impid: 'bid-id',
              price: 1,
              crid: 'native',
              adm: '{"assets":[{"id":1,"title":{"text":"Native title"}}]}'
            }]
          }]
        }
      }, request);
      expect(bids[0].mediaType).to.equal('native');

      const bannerBids = spec.interpretResponse({
        body: {
          seatbid: [{
            bid: [{
              impid: 'bid-id',
              price: 1,
              crid: 'banner',
              adm: '<div>Banner</div>',
              ext: { mtype: 'banner' }
            }]
          }]
        }
      }, request);
      expect(bannerBids[0].mediaType).to.equal('banner');
    });
  }
});
