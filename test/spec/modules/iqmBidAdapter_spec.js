import { expect } from 'chai';

import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { spec } from 'modules/iqmBidAdapter.js';

const ENDPOINT = 'http://pbd.localhost';

describe('iqmAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid =
        {
          bidder: 'iqm',
          params: {
            publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a',
            tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a',
            placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a',
            bidfloor: 0.50
          },

          'adUnitCode': 'adunit-code',
          'sizes': [[250, 250], [640, 480]],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        // placementId: iosDevice ? 13239390 : 13232361, // Add your own placement id here. Note, skippable video is not supported on iOS
        placementId: 0,

      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let validBidRequests = [
      {bidder: 'iqm',
        params: {
          publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a',
          tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a',
          placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a',
          bidfloor: 0.5},
        crumbs: {
          pubcid: 'a0f51f64-6d86-41d0-abaf-7ece71404d94'},
        fpd: {'context': {'pbAdSlot': '/19968336/header-bid-tag-0'}},
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]}},
        adUnitCode: '/19968336/header-bid-tag-0',
        transactionId: '56fe8d92-ff6e-4c34-90ad-2f743cd0eae8',
        sizes: [[300, 250], [300, 600]],
        bidId: '266d810da21904',
        bidderRequestId: '13c05d264c7ffe',
        auctionId: '565ab569-ab95-40d6-8b42-b9707a92062f',
        src: 'client',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0}];

    let bidderRequest = {bidderCode: 'iqm', auctionId: '565ab569-ab95-40d6-8b42-b9707a92062f', bidderRequestId: '13c05d264c7ffe', bids: [{bidder: 'iqm', params: {publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a', tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a', placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a', bidfloor: 0.5}, crumbs: {pubcid: 'a0f51f64-6d86-41d0-abaf-7ece71404d94'}, fpd: {context: {pbAdSlot: '/19968336/header-bid-tag-0'}}, mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}}, adUnitCode: '/19968336/header-bid-tag-0', transactionId: '56fe8d92-ff6e-4c34-90ad-2f743cd0eae8', sizes: [[300, 250], [300, 600]], bidId: '266d810da21904', bidderRequestId: '13c05d264c7ffe', auctionId: '565ab569-ab95-40d6-8b42-b9707a92062f', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}], auctionStart: 1615205942159, timeout: 7000, refererInfo: {referer: 'http://test.localhost:9999/integrationExamples/gpt/hello_world.html', reachedTop: true, isAmp: false, numIframes: 0, stack: ['http://test.localhost:9999/integrationExamples/gpt/hello_world.html'], canonicalUrl: null}, start: 1615205942162};

    it('should parse out  sizes', function () {
      let temp = [];
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = request[0].data;

      expect(payload.sizes).to.exist;
      expect(payload.sizes[0]).to.deep.equal([300, 250]);
    });

    it('should populate the ad_types array on all requests', function () {
      // const bidRequest = Object.assign({}, bidRequests[0]);

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = request[0].data;

      expect(payload.imp.mediatype).to.deep.equal('banner');
    });
    it('sends bid request to ENDPOINT via POS', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request[0].url).to.equal(ENDPOINT);
      expect(request[0].method).to.equal('POST');
    });
    it('should attach valid video params to the tag', function () {
      let validBidRequests_video = [{bidder: 'iqm', params: {publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a', tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a', placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a', bidfloor: 0.5, video: {placement: 2, mimes: ['video/mp4'], protocols: [2, 5], skipppable: true, playback_method: ['auto_play_sound_off']}}, crumbs: {pubcid: '09b8f065-9d1b-4a36-bd0c-ea22e2dad807'}, fpd: {context: {pbAdSlot: 'video1'}}, mediaTypes: {video: {playerSize: [[640, 480]], context: 'instream'}}, adUnitCode: 'video1', transactionId: '86795c66-acf9-4dd5-998f-6d5362aaa541', sizes: [[640, 480]], bidId: '28bfb7e2d12897', bidderRequestId: '16e1ce8481bc6d', auctionId: '3140a2ec-d567-4db0-9bbb-eb6fa20ccb71', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}];
      let bidderRequest_video = {bidderCode: 'iqm', auctionId: '3140a2ec-d567-4db0-9bbb-eb6fa20ccb71', bidderRequestId: '16e1ce8481bc6d', bids: [{bidder: 'iqm', params: {publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a', tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a', placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a', bidfloor: 0.5, video: {placement: 2, mimes: ['video/mp4'], protocols: [2, 5], skipppable: true, playback_method: ['auto_play_sound_off']}}, crumbs: {pubcid: '09b8f065-9d1b-4a36-bd0c-ea22e2dad807'}, fpd: {context: {pbAdSlot: 'video1'}}, mediaTypes: {video: {playerSize: [[640, 480]], context: 'instream'}}, adUnitCode: 'video1', transactionId: '86795c66-acf9-4dd5-998f-6d5362aaa541', sizes: [[640, 480]], bidId: '28bfb7e2d12897', bidderRequestId: '16e1ce8481bc6d', auctionId: '3140a2ec-d567-4db0-9bbb-eb6fa20ccb71', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}], auctionStart: 1615271191985, timeout: 3000, refererInfo: {referer: 'http://test.localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html', reachedTop: true, isAmp: false, numIframes: 0, stack: ['http://test.localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html'], canonicalUrl: null}, start: 1615271191988};
      const request = spec.buildRequests(validBidRequests_video, bidderRequest_video);
      const payload = request[0].data;
      expect(payload.imp.video).to.deep.equal({
        context: 'instream',
        w: 640,
        h: 480,
        mimes: ['video/mp4'],
        placement: 1,
        protocols: [2, 5],
        startdelay: 0
      });
    });

    it('should add referer info to payload', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = request[0].data;

      expect(payload.bidderRequest.refererInfo).to.exist;
      expect(payload.bidderRequest.refererInfo).to.deep.equal({referer: 'http://test.localhost:9999/integrationExamples/gpt/hello_world.html', reachedTop: true, isAmp: false, numIframes: 0, stack: ['http://test.localhost:9999/integrationExamples/gpt/hello_world.html'], canonicalUrl: null});
    });
  })

  describe('interpretResponse', function () {
    let validBidRequests_temp = [
      {bidder: 'iqm',
        params: {
          publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a',
          tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a',
          placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a',
          bidfloor: 0.5},
        crumbs: {
          pubcid: 'a0f51f64-6d86-41d0-abaf-7ece71404d94'},
        fpd: {'context': {'pbAdSlot': '/19968336/header-bid-tag-0'}},
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]}},
        adUnitCode: '/19968336/header-bid-tag-0',
        transactionId: '56fe8d92-ff6e-4c34-90ad-2f743cd0eae8',
        sizes: [[300, 250], [300, 600]],
        bidId: '266d810da21904',
        bidderRequestId: '13c05d264c7ffe',
        auctionId: '565ab569-ab95-40d6-8b42-b9707a92062f',
        src: 'client',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0}];
    let bidderRequest = {bidderCode: 'iqm', auctionId: '565ab569-ab95-40d6-8b42-b9707a92062f', bidderRequestId: '13c05d264c7ffe', bids: [{bidder: 'iqm', params: {publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a', tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a', placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a', bidfloor: 0.5}, crumbs: {pubcid: 'a0f51f64-6d86-41d0-abaf-7ece71404d94'}, fpd: {context: {pbAdSlot: '/19968336/header-bid-tag-0'}}, mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}}, adUnitCode: '/19968336/header-bid-tag-0', transactionId: '56fe8d92-ff6e-4c34-90ad-2f743cd0eae8', sizes: [[300, 250], [300, 600]], bidId: '266d810da21904', bidderRequestId: '13c05d264c7ffe', auctionId: '565ab569-ab95-40d6-8b42-b9707a92062f', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}], auctionStart: 1615205942159, timeout: 7000, refererInfo: {referer: 'http://test.localhost:9999/integrationExamples/gpt/hello_world.html', reachedTop: true, isAmp: false, numIframes: 0, stack: ['http://test.localhost:9999/integrationExamples/gpt/hello_world.html'], canonicalUrl: null}, start: 1615205942162};
    let response = {

      id: '5bdbab92aae961cfbdf7465d',
      seatbid: [{bid: [{id: 'bid-5bdbab92aae961cfbdf7465d-5bdbab92aae961cfbdf74653', impid: '5bdbab92aae961cfbdf74653', price: 9.9, nurl: 'https://winn.stage.iqm.com/smaato?raw=w9XViV4dovBHrxujHhBj-l-uWB08CUOMW_oR-EUxZbaWLL0ENzcMlP3CJFEURN6FgRp_HdjAjxTYHR7uG4S6h6dl_vjU_YNABiPd607-iTqxOCl-2cKLo-hhQus4sMw01VIqyqrPmzOTHTwJm4vTjUIoWMPZbARgQvUnBzjRH9xeYS-Bv3kgAW9NSBfgBZeLyT3WJJ_3VKIE_Iurt8OjpA%3D%3D&req_id=5bdbab92aae961cfbdf7465d&ap=${AUCTION_PRICE}', adm: "<html> <body>   <script type='text/javascript' src='https://pxl.iqm.com/i/cookie/service?reqId=5bdbab92aae961cfbdf7465d&pId=c21hYXRv' async></script>   <div id='politicalAdCSS' style='{IAA_POLITICAL_AD_STYLE}'>    <a target='_blank' href='https://click.stage.iqm.com/smaato?raw=mW-fVT2nAH3D1dWJXh2i8EevG6MeEGP6X65YHTwJQ4xb-hH4RTFltpYsvQQ3NwyU_cIkURRE3oWBGn8d2MCPFNgdHu4bhLqHp2X--NT9g0AGI93rTv6JOrE4KX7Zwouj6GFC6ziwzDTVUirKqs-bM5MdPAmbi9ONQihYw9lsBGBC9ScHONEf3F5hL4G_eSABTwuRDS8DlwfdO2ToEsTcZ73-vQg1ChxuHAzPd8tFgm0hMaR2YvQEix_8t29Ku0_X&req_id=5bdbab92aae961cfbdf7465d'><img class='mainCreative' src='https://win.stage.iqm.com/smaato?raw=mW-fVT2nAH3D1dWJXh2i8EevG6MeEGP6X65YHTwJQ4xb-hH4RTFltpYsvQQ3NwyU_cIkURRE3oWBGn8d2MCPFNgdHu4bhLqHp2X--NT9g0AGI93rTv6JOrE4KX7Zwouj6GFC6ziwzDTVUirKqs-bM5MdPAmbi9ONQihYw9lsBGBC9ScHONEf3F5hL4G_eSAB27rX7yddm6gveXrinvITdKrrsCL6Z2KFNPT5b0XXcEFywmQ29Mi9e0naWSS6JEiEtNl8gTaMug_SLzgZtxhoJ5tmRuNfzO3ZL749sTyGU7R6UqffiNRQ3enOOXFNozI-YUO_g2YzC3WyQvavvuaVrZLWry3QrGvXJMicow51nMuJNa2FdTKHfhSJF5HdfZBc0kcXJ_ioD2439u-8Q9bMkSauDRRTL3YTbwozJFPPFqVxAh_Os6RlYXiEcpf0SFoFo2_-ks52yUlsTL4G34kXA1YUtTiEOdptgbDp0n6Rvq9Hc1kgm37jp-RtyWTj7n2EFpuBUmdnIyMItomcvTd7gQ%3D%3D&req_id=5bdbab92aae961cfbdf7465d&ap=${AUCTION_PRICE}' width='250' height='250'> </a>  </div>    <script type='text/javascript' src='https://q.adrta.com/s/iqm/aa.js?cb=d7011a54-f43d-42bd-be57-8bbfca208ed2#iqm;paid=iqm;avid=100404;caid=169218;plid=301435;siteId=20851;lineItemId={IAA_LINE_ITEM_ID};kv2=www.enotes.com;priceBid=9.9;pricePaid={IAA_PAID_PRICE};publisherId=0;kv1=250x250;kv3=IQBU77n5POSeE_p7t0rqrNcvY8z4LLpJ3bY8p94HdxUX;kv4=71.95.98.65;kv6=5bdbab92aae961cfbdf74653;kv5=smaato;kv10=Cellular+One;kv11=5bdbab92aae961cfbdf7465d;kv12={IAA_PLACEMENT_ID};kv14=3,5;kv16=45.594555;kv17=-121.14975;kv18=0;kv19=8d8303ec-6b62-5d49-bc56-10ff5479219;kv32=20851;kv23={IAA_CARRIER_ID};kv26=ios;kv24=CTV;kv25={IAA_APP_NAME};kv27=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a;kv28=Apple;kv52=0;kv15=NY;kv7=Unknown'> </script>  </body></html>", adomain: ['click.iqm.com'], iurl: 'https://d3jme5si7t6llb.cloudfront.net/image/1/404/owVo6mc_1588902031079.png', cid: '169218', crid: 'cr-301435', attr: [], h: 250, w: 250}]}],
      bidid: '5bdbab92aae961cfbdf7465d'
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {requestId: '49ad5f21156efd', currency: 'USD', cpm: 9.9, netRevenue: true, creativeId: 'cr-301435', adUnitCode: '/19968336/header-bid-tag-0', auctionId: '853cddf1-8d13-4482-bd88-f5ef927d5ab3', mediaType: 'banner', ttl: 3000, ad: "<html> <body>   <script type='text/javascript' src='https://pxl.iqm.com/i/cookie/service?reqId=5bdbab92aae961cfbdf7465d&pId=c21hYXRv' async></script>   <div id='politicalAdCSS' style='{IAA_POLITICAL_AD_STYLE}'>    <a target='_blank' href='https://click.stage.iqm.com/smaato?raw=mW-fVT2nAH3D1dWJXh2i8EevG6MeEGP6X65YHTwJQ4xb-hH4RTFltpYsvQQ3NwyU_cIkURRE3oWBGn8d2MCPFNgdHu4bhLqHp2X--NT9g0AGI93rTv6JOrE4KX7Zwouj6GFC6ziwzDTVUirKqs-bM5MdPAmbi9ONQihYw9lsBGBC9ScHONEf3F5hL4G_eSABTwuRDS8DlwfdO2ToEsTcZ73-vQg1ChxuHAzPd8tFgm0hMaR2YvQEix_8t29Ku0_X&req_id=5bdbab92aae961cfbdf7465d'><img class='mainCreative' src='https://win.stage.iqm.com/smaato?raw=mW-fVT2nAH3D1dWJXh2i8EevG6MeEGP6X65YHTwJQ4xb-hH4RTFltpYsvQQ3NwyU_cIkURRE3oWBGn8d2MCPFNgdHu4bhLqHp2X--NT9g0AGI93rTv6JOrE4KX7Zwouj6GFC6ziwzDTVUirKqs-bM5MdPAmbi9ONQihYw9lsBGBC9ScHONEf3F5hL4G_eSAB27rX7yddm6gveXrinvITdKrrsCL6Z2KFNPT5b0XXcEFywmQ29Mi9e0naWSS6JEiEtNl8gTaMug_SLzgZtxhoJ5tmRuNfzO3ZL749sTyGU7R6UqffiNRQ3enOOXFNozI-YUO_g2YzC3WyQvavvuaVrZLWry3QrGvXJMicow51nMuJNa2FdTKHfhSJF5HdfZBc0kcXJ_ioD2439u-8Q9bMkSauDRRTL3YTbwozJFPPFqVxAh_Os6RlYXiEcpf0SFoFo2_-ks52yUlsTL4G34kXA1YUtTiEOdptgbDp0n6Rvq9Hc1kgm37jp-RtyWTj7n2EFpuBUmdnIyMItomcvTd7gQ%3D%3D&req_id=5bdbab92aae961cfbdf7465d&ap=${AUCTION_PRICE}' width='250' height='250'> </a>  </div>    <script type='text/javascript' src='https://q.adrta.com/s/iqm/aa.js?cb=d7011a54-f43d-42bd-be57-8bbfca208ed2#iqm;paid=iqm;avid=100404;caid=169218;plid=301435;siteId=20851;lineItemId={IAA_LINE_ITEM_ID};kv2=www.enotes.com;priceBid=9.9;pricePaid={IAA_PAID_PRICE};publisherId=0;kv1=250x250;kv3=IQBU77n5POSeE_p7t0rqrNcvY8z4LLpJ3bY8p94HdxUX;kv4=71.95.98.65;kv6=5bdbab92aae961cfbdf74653;kv5=smaato;kv10=Cellular+One;kv11=5bdbab92aae961cfbdf7465d;kv12={IAA_PLACEMENT_ID};kv14=3,5;kv16=45.594555;kv17=-121.14975;kv18=0;kv19=8d8303ec-6b62-5d49-bc56-10ff5479219;kv32=20851;kv23={IAA_CARRIER_ID};kv26=ios;kv24=CTV;kv25={IAA_APP_NAME};kv27=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a;kv28=Apple;kv52=0;kv15=NY;kv7=Unknown'> </script>  </body></html>", width: 250, height: 250}
      ];
      let temprequest = spec.buildRequests(validBidRequests_temp, bidderRequest);

      let result = spec.interpretResponse({ body: response }, temprequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    let validBidRequests_temp_video =
[{bidder: 'iqm', params: {publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a', tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a', placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a', bidfloor: 0.5, video: {placement: 2, mimes: ['video/mp4'], protocols: [2, 5], skipppable: true, playback_method: ['auto_play_sound_off']}}, crumbs: {pubcid: 'cd86c3ff-d630-40e6-83ab-420e9e800594'}, fpd: {context: {pbAdSlot: 'video1'}}, mediaTypes: {video: {playerSize: [[640, 480]], context: 'instream'}}, adUnitCode: 'video1', transactionId: '8335b266-7a41-45f9-86a2-92fdc7cf0cd9', sizes: [[640, 480]], bidId: '26274beff25455', bidderRequestId: '17c5d8c3168761', auctionId: '2c592dcf-7dfc-4823-8203-dd1ebab77fe0', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}];
    let bidderRequest_video = {bidderCode: 'iqm', auctionId: '3140a2ec-d567-4db0-9bbb-eb6fa20ccb71', bidderRequestId: '16e1ce8481bc6d', bids: [{bidder: 'iqm', params: {publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a', tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a', placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a', bidfloor: 0.5, video: {placement: 2, mimes: ['video/mp4'], protocols: [2, 5], skipppable: true, playback_method: ['auto_play_sound_off']}}, crumbs: {pubcid: '09b8f065-9d1b-4a36-bd0c-ea22e2dad807'}, fpd: {context: {pbAdSlot: 'video1'}}, mediaTypes: {video: {playerSize: [[640, 480]], context: 'instream'}}, adUnitCode: 'video1', transactionId: '86795c66-acf9-4dd5-998f-6d5362aaa541', sizes: [[640, 480]], bidId: '28bfb7e2d12897', bidderRequestId: '16e1ce8481bc6d', auctionId: '3140a2ec-d567-4db0-9bbb-eb6fa20ccb71', src: 'client', bidRequestsCount: 1, bidderRequestsCount: 1, bidderWinsCount: 0}], auctionStart: 1615271191985, timeout: 3000, refererInfo: {referer: 'http://test.localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html', reachedTop: true, isAmp: false, numIframes: 0, stack: ['http://test.localhost:9999/integrationExamples/gpt/pbjs_video_adUnit.html'], canonicalUrl: null}, start: 1615271191988};

    it('handles non-banner media responses', function () {
      let response = {id: '2341234', seatbid: [{bid: [{id: 'bid-2341234-1', impid: '1', price: 9, nurl: 'https://frontend.stage.iqm.com/static/vast-01.xml', adm: '<?xml version="1.0" encoding="UTF-8" standalone="no"?><VAST version="2.0"><Ad id="304503"><InLine><AdSystem>1.0</AdSystem><AdTitle>Mid-Roll creative video</AdTitle><Description>VAST 2.0</Description><Impression><![CDATA[https://adrta.com/i?clid=iqm&paid=iqm&dvid=v&avid=100404&caid=168900&plid=304503&publisherId=app-pub-id-1&siteId={IAA_SITE_ID}&priceBid=9.0&pricePaid={IAA_PAID_PRICE}&lineItemId={IAA_LINE_ITEM_ID}&kv1=640x480&kv2={IAA_PAGE_URL}&kv3=aON4jWFUT3&kv4=71.95.98.65&kv5=smaato&kv6=1&kv7=Unknown&kv10=Cellular+One&kv11=2341234&kv12={IAA_PLACEMENT_ID}&kv14=1,2&kv15=NY&kv16=45.594555&kv17=-121.14975&kv18=TMZ&kv19=8d8303ec-6b62-5d49-bc56-10ff5479219&kv23={IAA_CARRIER_ID}&kv28=Apple&kv25=TEXTME&kv26=ios&kv27=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&kv9=31&kv13={IAA_VIDEO_ID}&kv32=APPID-1&kv29=[ERRORCODE]&kv30=[CONTENTPLAYHEAD]_[ADPLAYHEAD]&kv33=[ASSETURI]&kv34=[VASTVERSIONS]&kv35=[IFATYPE]&kv36=[IFA]&kv37=[CLIENTUA]&kv38=[SERVERUA]&kv39=[DEVICEUA]&kv40=[DEVICEIP]&kv41=[LATLONG]&kv42=[DOMAIN]&kv43=[PAGEURL]&kv44={IAA_VIDEO_TYPE}&kv45=[PLAYERSIZE]&kv46=[REGULATIONS]&kv47=[ADTYPE]&kv48=[TRANSACTIONID]&kv49=[BREAKPOSITION]&kv50=[APPNAME]&kv51=[PLACEMENTTYPE]&kv52=0&kv24=CTV_Video]]></Impression><Creatives><Creative><Linear><Duration>00:00:31</Duration><TrackingEvents><Tracking event="start"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=start]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=firstQuartile]]></Tracking><Tracking event="midpoint"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=midpoint]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=thirdQuartile]]></Tracking><Tracking event="complete"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=complete]]></Tracking><Tracking event="pause"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=pause]]></Tracking><Tracking event="resume"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=resume]]></Tracking><Tracking event="mute"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=mute]]></Tracking><Tracking event="unmute"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=unmute]]></Tracking><Tracking event="fullscreen"><![CDATA[https://postback.iqm.com/api/v1/iqm?event=impr&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&event_type=fullscreen]]></Tracking></TrackingEvents><VideoClicks><ClickThrough><![CDATA[https://postback.iqm.com/api/v1/iqm?event=click&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf&i_redirect=https://pxl.iqm.com/i/ct/iqm?uid=Ukd-1oXgDtrWW6cTpY9wtuvN9h8bHLDf_muOGIbvdu0c8JsIab-gBw%3D%3D&redir=https%3A%2F%2Fmid.roll.com]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery="progressive" height="480" type="video/quicktime" width="854"><![CDATA[https://d3jme5si7t6llb.cloudfront.net/Video/1/100404/cfefP3t_1609155749524.mov]]></MediaFile><MediaFile delivery="progressive" height="480" type="video/mp4" width="854"><![CDATA[https://d3jme5si7t6llb.cloudfront.net/Video/1/100404/cfefP3t_1609155749524.mp4]]></MediaFile><MediaFile delivery="progressive" height="360" type="video/quicktime" width="640"><![CDATA[https://d3jme5si7t6llb.cloudfront.net/Video/1/100404/pPVt4fo_1609155749527.mov]]></MediaFile><MediaFile delivery="progressive" height="360" type="video/mp4" width="640"><![CDATA[https://d3jme5si7t6llb.cloudfront.net/Video/1/100404/pPVt4fo_1609155749527.mp4]]></MediaFile><MediaFile delivery="progressive" height="720" type="video/quicktime" width="1280"><![CDATA[https://d3jme5si7t6llb.cloudfront.net/Video/1/100404/Zdrxzuv_1609155749527.mov]]></MediaFile><MediaFile delivery="progressive" height="720" type="video/mp4" width="1280"><![CDATA[https://d3jme5si7t6llb.cloudfront.net/Video/1/100404/Zdrxzuv_1609155749527.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives><Impression id="1"><![CDATA[http://win.stage.iqm.com/smaato?raw=mW-fVT2nAH1CFuVMLKsKTOXPu9jnF6xS1wsfh-knl_SLFG0quvyzMPszW8qr8c8b5koUkg7xJJt3TL7EoMkrbONG8el6rV-B2005Aala0HQnJ0vdiZnMhsQ0EQqMdz5Xsi5Tp4f993FjOZ6KQjc9yz8jf4DbWtG54SkCBGdQOj-i8IRjlt-GYBDHFG6MH3S4NvVIW9rBS8TC3UwRdC9cI85ysYzuwByEcFjBiBUPzjEOS3OWQzND5RcsqoFdasNjYBrnWzwv-1lP3F41RuqWJcC28HWkfeFCONPa1efQeFbgxsNc9jG3aCjmRkItZpFOywCSvwDtFdTrqqGpg27EslR3pMNeuYUuAnWQ5z3WCDYUnHy-P87KtbD9pWbMAsjpWGwq_nzJZC2gEVjXF2u-edQi3dzw5nI3scWi7qOnS6751f-Mha953iEmnYhjHRfvvCrFqHoYHOz3lpHIK4yUs4Ds4h_x1OHVG1HKnSTJG3-fZmfuHK22FA%3D%3D&req_id=2341234&ap=${AUCTION_PRICE}]]></Impression><Error><![CDATA[https://postback.iqm.com/api/v1/iqm?event=error&camp_id=168900&devid=8d8303ec-6b62-5d49-bc56-10ff5479219&app_id=APPID-1&app_nm=TEXTME&ip=71.95.98.65&clkid=2341234&crid=304503&impid=1&devua=Mozilla%2F5.0+%28iPhone%3B+U%3B+CPU+iPhone+OS+4_2_1+like+Mac+OS+X%3B+en-us%29+AppleWebKit%2F533.17.9+%28KHTML%2C+like+Gecko%29+Mobile%2F8C148a&pubid=app-pub-id-1&exch_nm=smaato&l1=45.594555&l2=-121.14975&st=NY&conv_type=qpl8n0nmkf]]></Error></InLine></Ad></VAST>', adomain: ['app1.stage.iqm.com'], cid: '168900', crid: 'cr-304503', attr: []}]}], bidid: '2341234'};

      let temprequest_video = spec.buildRequests(validBidRequests_temp_video, bidderRequest_video);

      let result = spec.interpretResponse({ body: response }, temprequest_video[0]);
      expect(result[0]).to.have.property('vastUrl');
      expect(result[0]).to.have.property('mediaType', 'video');
    });
  });
});
