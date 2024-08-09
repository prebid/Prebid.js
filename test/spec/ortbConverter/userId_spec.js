import {setOrtbUserExtEids} from '../../../modules/userId/index.js';

describe('pbjs - ortb user eids', () => {
  it('sets user.ext.eids from request', () => {
    const req = {};
    setOrtbUserExtEids(req, {}, {
      bidRequests: [
        {
          userIdAsEids: [{e: 'id'}]
        }
      ]
    });
    expect(req.user.ext.eids).to.eql([{e: 'id'}]);
  });

  it('should not override eids from fpd', () => {
    const req = {
      user: {
        ext: {
          eids: [{existing: 'id'}]
        }
      }
    };
    setOrtbUserExtEids(req, {}, {
      bidRequests: [
        {
          userIdAsEids: [{nw: 'id'}]
        }
      ]
    });
    expect(req.user.ext.eids).to.eql([
      {nw: 'id'},
      {existing: 'id'},
    ])
  })

  it('has no effect if requests have no eids', () => {
    const req = {};
    setOrtbUserExtEids(req, {}, [{}]);
    expect(req).to.eql({});
  })

  it('has no effect if user.ext.eids is an empty array', () => {
    const req = {};
    setOrtbUserExtEids(req, {}, {
      bidRequests: [
        {
          userIdAsEids: []
        }
      ]
    });
    expect(req).to.eql({});
  });
})
