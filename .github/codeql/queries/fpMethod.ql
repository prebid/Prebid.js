/**
 * @id prebid/fp-method
 * @name Possible use of browser API associated with fingerprinting
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds calls to a given method name (e.g. object.someMethod())

import prebid
import autogen_fpDOMMethod


from DOMMethod meth, MethodCallNode use
where
   use.getMethodName() = meth
   // there's no easy way to check the method call is on the right type
select use, meth + " is an indicator of fingerprinting if used on " + meth.getType() +"; weight: " + meth.getWeight()
