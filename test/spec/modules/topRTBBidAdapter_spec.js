import { expect } from 'chai';
import { spec } from 'modules/topRTBBidAdapter.js';

describe('topRTBBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'topRTB',
      params: {
        adUnitId: 'c5c06f77430c4c33814a0577cb4cc978'
      },
      adName: 'banner'
    }));
  });

  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: 'bid12345',
      bidder: 'topRTB',
      adName: 'banner',
      adType: '{"banner":{"sizes":[[]]}}',
      params: {
        adUnitId: 'c5c06f77430c4c33814a0577cb4cc978'
      },
      sizes: [[728, 90]]
    }];

    let request = spec.buildRequests(bidRequestData);
    const current_url = request.url;
    const search_params = current_url.searchParams;
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
        'mediadata': "<a href='https://13.125.21.204:8080/bidder/click?url=xaCQyxrEJsY7XQj4dRGD2RVQiVaLJ%2Bar%2BVDhwhlpnR%2FSQG%2B9%2FtSmvV4X45AM9mMl%2BOSaJzKXTKN82WHc1li3gCzibhr%2ByfcqPIl%2FQHJjBKS7bznHEwRh1kZShVVnSpp3DBjS5I5WSmSD4Qbyo61IJq3LFc9OpHKmJeMgATc4bHK00MqW7atQStUWWSTuhlGO&details=l5G4hDG5UmRmJ%2BB9AdG7v2OpwH%2Bio9Y2oIETI6KooMoo7lJ4Yo7pTbfVGhA5Vn%2BaPCoBX4779c1Jqok45%2FL2ZUP0nc7F0IDfRpLdtoX%2B7Hr2tqmK2Suide0LIsB0woVDXBiq62%2BfneGrTnCi6Nq6GDIBFpmFH8CFinYL%2F%2BB33V8%3D' target='_blank'><img src='https://www.toprtb.com/uploads/d037c2d94369417ab9aea6e712723235/728-90_1546872001356_728x90.gif' alt='Banner 728x90' width='728' height='90' /></a><img src='https://13.125.21.204:8080/bidder/impression?id=e1fb1fbdb97643189827b1b4d2b51acc&impid=1' width='1' height='1' alt=''/></a><img src='https://13.124.144.40:8080/ssp/impression?id=e1fb1fbdb97643189827b1b4d2b51acc&impid=1' width='1' height='1' alt=''/>",
        'width': 728,
        'currency': 'USD',
        'id': 'cd95dffec6b645afbc4e5aa9f68f2ff3',
        'type': 'RICHMEDIA',
        'ttl': 4000,
        'bidId': 'bid12345',
        'status': 'success',
        'height': 90}],
    	'adName': 'banner',
    	'vastXml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><VAST version="2.0"></VAST>',
    	'mediaType': 'banner',
    	'tracking': 'https://ssp.toprtb.com/ssp/tracking?F0cloTiKIw%2BjZ2UNDvlKGn5%2FWoAO9cnlAUDm6gFBM8bImY2fKo%2BMTvI0XvXzFTZSb5v8o4EUbPId9hckptTqA4QPaWvpVYCRKRZceXNa4kjtvfm4j2e%2FcRKgkns2goHXi7IZC0sBIbE77WWg%2BPBYv%2BCu84H%2FSH69mi%2FDaWcQlfaEOdkaJdstJEkaZtkgWnFnS7aagte%2BfdEbOqcTxq5hzj%2BZ4NZbwgReuWTQZbfrMWjkXFbn%2B35vZuI319o6XH9n9fKLS4xp8zstXfQT2oSgjw1NmrwqRKf1efB1UaWlS1TbkSqxZ7Kcy7nJvAZrDk0tzcSeIxe4VfHpwgPPs%2BueUeGwz3o7OCh7H1sCmogSrmJFB9JTeXudFjC13iANAtu4SvG9bGIbiJxS%2BNfkjy2mLFm8kSIcIobjNkMEcUAwmoqJNRndwb66a3Iovk2NTo0Ly%2FV7Y5ECPcS5%2FPBrIEOuQXS5SNUPRWKoklX5nexHtOc%3D',
    	'impression': 'https://ssp.toprtb.com/ssp/impression?id=64f29f7b226249f19925a680a506b32d'
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
