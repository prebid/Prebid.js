import {setOrtbUserExtEids} from '../../../modules/userId/index.js';

describe('pbjs - ortb user eids', () => {
  it('sets user.ext.eids from request', () => {
    const req = {};
    setOrtbUserExtEids(req, {}, {
      bidRequests: [
        {
          userIdAsEids: {e: 'id'}
        }
      ]
    });
    expect(req.user.ext.eids).to.eql({e: 'id'});
  });

  it('has no effect if requests have no eids', () => {
    const req = {};
    setOrtbUserExtEids(req, {}, [{}]);
    expect(req).to.eql({});
  })
})
