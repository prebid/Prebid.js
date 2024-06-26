import { getFpdIntersection } from '../../../../src/pps'

describe('pps', () => {
  const mockFpdArray = [
    { user: {
      keywords: 'a,b',
      data: [{
        name: 'dataprovider.com',
        ext: {
          segtax: 4
        },
        segment: [{
          id: '1'
        }]
      }],
      ext: {
        data: {
          registered: true,
          interests: ['cars']
        }
      },

    }},
    { user: {
      keywords: 'b,c',
      data: [{
        name: 'dataprovider2.com',
        ext: {
          segtax: 4
        },
        segment: [{
          id: '2'
        }]
      }],
      ext: {
        data: {
          registered: false,
          interests: ['cars', 'bicycles']
        }
      }
    }},
  ]
  const common = {
    user: {
      data: [{
        ext: { segtax: 4 }
      }],
      ext: {
        data: {
          interests: ['cars']
        }
      }
    }
  }
  it('should properly find intersection', () => {
    const result = getFpdIntersection(mockFpdArray)
    expect(JSON.stringify(result)).to.equal(JSON.stringify(common))
  })
})
