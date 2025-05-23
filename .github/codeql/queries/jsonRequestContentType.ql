/**
 * @id prebid/json-request-content-type
 * @name Application/json request type in bidder
 * @kind problem
 * @problem.severity warning
 * @description Using 'application/json' as request type triggers browser preflight requests and may increase bidder timeouts
 */

import javascript

from Property prop, StringLiteral lit
where
  prop.getName() = "contentType" and        -- the property key
  prop.getInit() = lit and                  -- its initializer
  lit.getStringValue() = "application/json" -- initializer value
select prop,
  "application/json request type triggers preflight requests and may increase bidder timeouts"
