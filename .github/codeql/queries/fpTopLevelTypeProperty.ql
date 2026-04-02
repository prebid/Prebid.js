/**
 * @id prebid/fp-top-level-type-prop
 * @name Use of browser API associated with fingerprinting
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds property access on instances of top-level types (e.g. `new SomeType().someProperty`)

import prebid
import autogen_fpGlobalTypeProperty0

SourceNode topLevelType(TypeTracker t, string ctor) {
  t.start() and (
    result = callTo(global(ctor))
  ) or exists(TypeTracker t2 |
    result = topLevelType(t2, ctor).track(t2, t)
  )
}


from GlobalTypeProperty0 prop, SourceNode use
where
   use = topLevelType(TypeTracker::end(), prop.getGlobal0()).getAPropertyRead(prop)
select use, prop.getGlobal0() + "." + prop + " is an indicator of fingerprinting; weight: " + prop.getWeight()
