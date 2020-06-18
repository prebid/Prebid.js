import { expect } from 'chai'
import { spec } from 'modules/quantumBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'

const ENDPOINT = 'https://s.sspqns.com/hb'
const REQUEST = {
  'bidder': 'quantum',
  'sizes': [[300, 250]],
  'renderMode': 'banner',
  'params': {
    placementId: 21546
  }
}

const NATIVE_REQUEST = {
  'bidder': 'quantum',
  'mediaType': 'native',
  'sizes': [[0, 0]],
  'params': {
    placementId: 21546
  }
}

const serverResponse = {
  'price': 0.3,
  'debug': [
    ''
  ],
  'is_fallback': false,
  'nurl': 'https://s.sspqns.com/imp/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4/',
  'native': {
    'link': {
      'url': 'https://s.sspqns.com/click/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4///',
      'clicktrackers': ['https://elasticad.net']
    },
    'assets': [
      {
        'id': 1,
        'title': {
          'text': 'ad.SSP.1x1'
        },
        'required': 1
      },
      {
        'id': 2,
        'img': {
          'w': 15,
          'h': 15,
          'url': 'https://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-15x15'
        }
      },
      {
        'id': 3,
        'data': {
          'value': 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
        },
        'required': 1
      },
      {
        'id': 4,
        'img': {
          'w': 500,
          'h': 500,
          'url': 'https://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-500x500'
        }
      },
      {
        'id': 6,
        'video': {
          'vasttag': 'https://elasticad.net/vast.xml'
        }
      },
      {
        'id': 2001,
        'data': {
          'value': 'https://elasticad.net'
        }
      },
      {
        'id': 2002,
        'data': {
          'value': 'vast'
        }
      },
      {
        'id': 2007,
        'data': {
          'value': 'click'
        }
      },
      {
        'id': 10,
        'data': {
          'value': 'ad.SSP.1x1 sponsor'
        }
      },
      {
        'id': 2003,
        'data': {
          'value': 'https://elasticad.net'
        }
      },
      {
        'id': 2004,
        'data': {
          'value': 'prism'
        }
      },
      {
        'id': 2005,
        'data': {
          'value': '/home'
        }
      },
      {
        'id': 2006,
        'data': {
          'value': 'https://elasticad.net/vast.xml'
        }
      },
      {
        'id': 2022,
        'data': {
          'value': 'Lorem ipsum....'
        }
      }
    ],
    'imptrackers': [],
    'ver': '1.1'
  },
  'sync': [
    'https://match.adsrvr.org/track/cmb/generic?ttd_pid=s6e8ued&ttd_tpi=1'
  ]
}

const nativeServerResponse = {
  'price': 0.3,
  'debug': [
    ''
  ],
  'is_fallback': false,
  'nurl': 'https://s.sspqns.com/imp/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4/',
  'native': {
    'link': {
      'url': 'https://s.sspqns.com/click/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4///'
    },
    'assets': [
      {
        'id': 1,
        'title': {
          'text': 'ad.SSP.1x1'
        },
        'required': 1
      },
      {
        'id': 2,
        'img': {
          'w': 15,
          'h': 15,
          'url': 'https://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-15x15'
        }
      },
      {
        'id': 3,
        'data': {
          'value': 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.Lorem Ipsum is simply dummy text of the printing and typesetting industry.'
        },
        'required': 1
      },
      {
        'id': 4,
        'img': {
          'w': 500,
          'h': 500,
          'url': 'https://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-500x500'
        }
      },
      {
        'id': 2007,
        'data': {
          'value': 'click'
        }
      },
      {
        'id': 10,
        'data': {
          'value': 'ad.SSP.1x1 sponsor'
        }
      },

      {
        'id': 2003,
        'data': {
          'value': 'https://elasticad.net'
        }
      }
    ],
    'imptrackers': [],
    'ver': '1.1'
  },
  'sync': [
    'https://match.adsrvr.org/track/cmb/generic?ttd_pid=s6e8ued&ttd_tpi=1'
  ]
}

describe('quantumBidAdapter', function () {
  const adapter = newBidder(spec)

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(REQUEST)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, REQUEST)
      delete bid.params
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    let bidRequests = [REQUEST]

    const request = spec.buildRequests(bidRequests, {})

    it('sends bid request to ENDPOINT via GET', function () {
      expect(request[0].method).to.equal('GET')
    })
  })

  describe('GDPR conformity', function () {
    const bidRequests = [{
      'bidder': 'quantum',
      'mediaType': 'native',
      'params': {
        placementId: 21546
      },
      adUnitCode: 'aaa',
      transactionId: '2b8389fe-615c-482d-9f1a-376fb8f7d6b0',
      sizes: [[0, 0]],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    }];

    const bidderRequest = {
      gdprConsent: {
        consentString: 'awefasdfwefasdfasd',
        gdprApplies: true
      }
    };

    it('should transmit correct data', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.quantx_gdpr).to.equal(1);
      expect(requests[0].data.quantx_user_consent_string).to.equal('awefasdfwefasdfasd');
    });
  });

  describe('GDPR absence conformity', function () {
    const bidRequests = [{
      'bidder': 'quantum',
      'mediaType': 'native',
      'params': {
        placementId: 21546
      },
      adUnitCode: 'aaa',
      transactionId: '2b8389fe-615c-482d-9f1a-376fb8f7d6b0',
      sizes: [[0, 0]],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    }];

    const bidderRequest = {
      gdprConsent: undefined
    };

    it('should transmit correct data', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.quantx_gdpr).to.be.undefined;
      expect(requests[0].data.quantx_user_consent_string).to.be.undefined;
    });
  });

  describe('interpretResponse', function () {
    let bidderRequest = {
      bidderCode: 'bidderCode',
      bids: []
    }

    it('handles native request : should get correct bid response', function () {
      const result = spec.interpretResponse({body: nativeServerResponse}, NATIVE_REQUEST)
      expect(result[0]).to.have.property('cpm').equal(0.3)
      expect(result[0]).to.have.property('width').to.be.below(2)
      expect(result[0]).to.have.property('height').to.be.below(2)
      expect(result[0]).to.have.property('mediaType').equal('native')
      expect(result[0]).to.have.property('native')
    })

    it('should get correct bid response', function () {
      const result = spec.interpretResponse({body: serverResponse}, REQUEST)
      expect(result[0]).to.have.property('cpm').equal(0.3)
      expect(result[0]).to.have.property('width').equal(300)
      expect(result[0]).to.have.property('height').equal(250)
      expect(result[0]).to.have.property('mediaType').equal('banner')
      expect(result[0]).to.have.property('ad')
    })

    it('handles nobid responses', function () {
      const nobidServerResponse = {bids: []}
      const nobidResult = spec.interpretResponse({body: nobidServerResponse}, bidderRequest)
      // console.log(nobidResult)
      expect(nobidResult.length).to.equal(0)
    })
  })
})
