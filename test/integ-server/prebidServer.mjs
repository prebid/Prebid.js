


function impsByBidder(request) {
  return (request.imp ?? []).map(imp => {
    return imp.ext.prebid.bidders;
  })
}


export function auction(req, res, next) {
  res.type('application/json');
  console.log(JSON.parse(req.body));
}