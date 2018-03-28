import { expect } from 'chai'
import { spec } from 'modules/quantumBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

const ENDPOINT = '//s.sspqns.com/hb'
const REQUEST = {
  'bidder': 'quantum',
  'sizes': [[300, 225]],
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
  'nurl': 'http://s.sspqns.com/imp/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4/',
  'native': {
    'link': {
      'url': 'http://s.sspqns.com/click/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4///',
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
          'url': 'http://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-15x15'
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
          'url': 'http://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-500x500'
        }
      },
      {
        'id': 6,
        'video': {
          'vasttag': 'http://elasticad.net/vast.xml'
        }
      },
      {
        'id': 2001,
        'data': {
          'value': 'http://elasticad.net'
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
          'value': 'http://elasticad.net'
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
          'value': 'http://elasticad.net/vast.xml'
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
    'http://match.adsrvr.org/track/cmb/generic?ttd_pid=s6e8ued&ttd_tpi=1'
  ]
}

const nativeServerResponse = {
  'price': 0.3,
  'debug': [
    ''
  ],
  'is_fallback': false,
  'nurl': 'http://s.sspqns.com/imp/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4/',
  'native': {
    'link': {
      'url': 'http://s.sspqns.com/click/KpQ1WNMHV-9a3HqWL_0JnujJFGo1Hnx9RS3FT_Yy8jW-Z6t_PJYmP2otidJsxE3qcY2EozzcBjRzGM7HEQcxVnjOzq0Th1cxb6A5bSp5BizTwY5SRaxx_0PgF6--8LqaF4LMUgMmhfF5k3gOOzzK6gKdavia4_w3LJ1CRWkMEwABr8bPzeovy1y4MOZsOXv7vXjPGMKJSTgphuZR57fL4u4ZFF4XY70K_TaH5bfXHMRAzE0Q38tfpTvbdFV_u2g-FoF0gjzKjiS88VnetT-Jo3qtrMphWzr52jsg5tH3L7hbymUOm1YkuJP9xrXLoZNVgC5sTMYolKLMSu6dqhS2FXcdfaGAcHweaaAAwJq-pB7DuiVcdnZQphUymhIia_KG2AYweWp6TYEpJbJjf2BcLpm_-KGw4gLh6L3DtEvUZwXZe-JpUJ4///'
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
          'url': 'http://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-15x15'
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
          'url': 'http://files.ssp.theadtech.com.s3.amazonaws.com/media/image/sxjermpz/scalecrop-500x500'
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
          'value': 'http://elasticad.net'
        }
      }
    ],
    'imptrackers': [],
    'ver': '1.1'
  },
  'sync': [
    'http://match.adsrvr.org/track/cmb/generic?ttd_pid=s6e8ued&ttd_tpi=1'
  ]
}

describe('quantumBidAdapter', () => {
  const adapter = newBidder(spec)

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(REQUEST)).to.equal(true)
    })

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, REQUEST)
      delete bid.params
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', () => {
    let bidRequests = [REQUEST]

    const request = spec.buildRequests(bidRequests, {})

    it('sends bid request to ENDPOINT via GET', () => {
      expect(request[0].method).to.equal('GET')
    })
  })

  describe('interpretResponse', () => {
    let bidderRequest = {
      bidderCode: 'bidderCode',
      bids: []
    }

    it('handles native request : should get correct bid response', () => {
      const result = spec.interpretResponse({body: nativeServerResponse}, NATIVE_REQUEST)
      expect(result[0]).to.have.property('cpm').equal(0.3)
      expect(result[0]).to.have.property('width').to.be.below(2)
      expect(result[0]).to.have.property('height').to.be.below(2)
      expect(result[0]).to.have.property('native')
    })

    it('should get correct bid response', () => {
      const result = spec.interpretResponse({body: serverResponse}, REQUEST)
      expect(result[0]).to.have.property('cpm').equal(0.3)
      expect(result[0]).to.have.property('width').equal(300)
      expect(result[0]).to.have.property('height').equal(225)
      // expect(result[0]).to.have.property('native');
      expect(result[0]).to.have.property('ad')
    })

    it('handles nobid responses', () => {
      const nobidServerResponse = {bids: []}
      const nobidResult = spec.interpretResponse({body: nobidServerResponse}, bidderRequest)
      // console.log(nobidResult)
      expect(nobidResult.length).to.equal(0)
    })
  })
})
