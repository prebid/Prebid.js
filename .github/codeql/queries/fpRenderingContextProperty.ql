/**
 * @id prebid/fp-rendering-context-property
 * @name Use of browser API associated with fingerprinting
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds use of rendering context properties (e.g. canvas.getContext().someProperty)

import prebid
import autogen_fpRenderingContextProperty

/*
  Tracks objects returned by a call to `.getContext()`
*/
SourceNode renderingContext(TypeTracker t, string contextType) {
  t.start() and exists(MethodCallNode invocation |
    invocation.getMethodName() = "getContext" and
    invocation.getArgument(0).mayHaveStringValue(contextType) and
    result = invocation
  ) or exists(TypeTracker t2 |
    result = renderingContext(t2, contextType).track(t2, t)
  )
}

from RenderingContextProperty prop, SourceNode use
where
   use = renderingContext(TypeTracker::end(), prop.getContextType()).getAPropertyRead(prop)
select use, "canvas.getContext()." + prop + " is an indicator of fingerprinting; weight: " + prop.getWeight()
