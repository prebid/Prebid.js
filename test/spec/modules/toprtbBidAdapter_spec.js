import { expect } from 'chai';
import { spec } from 'modules/toprtbBidAdapter';

describe('toprtbBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'toprtb',
      params: {
        adUnitId: '1b92aa181561481b8a36fdebb89bae29'
      }
    })).to.equal(true);
  });

  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: 'bid12345',
      bidder: 'toprtb',
      params: {
        adUnitId: '1b92aa181561481b8a36fdebb89bae29'
      },
      sizes: [[728, 90]]
    }];

    let request = spec.buildRequests(bidRequestData);
    // let req_data = new URLSearchParams(request);
    //  console.log(req_data.get('adUnitId'));
    console.log(request);
    // const current_url = new URL('http://192.168.1.5:6091/ssp/ReqAd?ref=www.google.com&adUnitId=1b92aa181561481b8a36fdebb89bae29_bid12345');
    const current_url = new URL(request.url);
    const search_params = current_url.searchParams;

    const id = search_params.get('adUnitId');
    console.log(search_params.get('adUnitId'));
    expect(id).to.equal('1b92aa181561481b8a36fdebb89bae29_bid12345');
  });

  it('validate_response_params', function () {
    let bidRequestData = {
      data: {
        bidId: 'bid12345'
      }
    };

    let serverResponse = {
      body: [{
        'cpm': 1,
        'mediadata': "<a href='http:\/\/192.168.1.60:8080\/bidder\/click?url=W5kMUTnR5PEqBE2YKWXzXpSA9kWRXWVLB53PI%2F8iqPk%3D&details=NQ%2FBNKEC0r7rY2HYaFLgeLf7lry1FbBYdfDpCTkf3uS8tlou2LnDD5ohqIyUurqdreTssR1991Lu0rJgT3bvqN%2FgM8X%2BaD86LQ4Ch7DKnDTptoi0IKo8JSPk9J6W0yuxJeNR%2FE8c%2FaLS9fpTLbZqAlkxWW5Co6iAveb9Onaz0DY%3D' target='_blank'><img src='http:\/\/192.168.1.104\/uploads\/c06bfdf2660e4e929fa4270d0d85c607\/1548136911_7214_798_0_11232_1551242217224_728x90.jpg' alt='Test_test1' width='728' height='90' \/><\/a><img src='http:\/\/192.168.1.60:8080\/bidder\/impression?id=e5d7789682014e64901f7a529fc10e23&impid=1' width='1' height='1' alt=''\/>",
        'width': 728,
        'currency': 'USD',
        'id': '1b92aa181561481b8a36fdebb89bae29',
        'type': 'RICHMEDIA',
        'ttl': 4000,
        'tracking': ['http:\/\/www.google.com?tracking=prebidResponse_728_90_1'],
        'bidId': 'bid12345',
        'status': 'success',
        'height': 90}]
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(1);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(728);
    expect(bid.height).to.equal(90);
    expect(bid.requestId).to.equal('bid12345');
  });
});
