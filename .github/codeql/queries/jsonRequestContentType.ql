/**
 * @id prebid/json-request-content-type
 * @name Application/json request type in bidder
 * @kind problem
 * @problem.severity warning
 * @description Using 'application/json' as request type triggers browser preflight requests and may increase bidder timeouts
 */

import javascript

from Property prop
where
  prop.getName() = "contentType" and
  prop.getInit() instanceof StringLiteral and
  prop.getInit().(StringLiteral).getStringValue() = "application/json" and
  prop.getFile().getBaseName().matches("%BidAdapter.%")
select prop,
  "application/json request type triggers preflight requests and may increase bidder timeouts"

