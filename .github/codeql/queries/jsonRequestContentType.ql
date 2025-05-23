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
  prop.getPropertyName() = "contentType" and
  prop.getValue() instanceof StringLiteral and
  prop.getValue().(StringLiteral).getStringValue() = "application/json"
select prop, "application/json request type triggers preflight requests and may increase bidder timeouts"
