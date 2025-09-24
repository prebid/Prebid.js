/**
 * @id prebid/screen-properties
 * @name Access to screen orientation and dimensions
 * @kind problem
 * @problem.severity warning
 * @description Finds uses of screen orientation and dimension APIs associated with fingerprinting
 */

import prebid

predicate screenProperty(SourceNode result, string prop) {
  result = windowPropertyRead("screen").getAPropertyRead(prop)
}

from SourceNode node, string message
where
  (
    screenProperty(node, "orientation") and message = "screen.orientation is an indicator of fingerprinting"
  ) or
  (
    screenProperty(node, "availHeight") and message = "screen.availHeight is an indicator of fingerprinting"
  ) or
  (
    screenProperty(node, "availWidth") and message = "screen.availWidth is an indicator of fingerprinting"
  ) or
  (
    screenProperty(node, "colorDepth") and message = "screen.colorDepth is an indicator of fingerprinting"
  ) or
  (
    node = windowPropertyRead("outerHeight") and message = "outerHeight is an indicator of fingerprinting"
  ) or
  (
    node = windowPropertyRead("outerWidth") and message = "outerWidth is an indicator of fingerprinting"
  )
select node, message
