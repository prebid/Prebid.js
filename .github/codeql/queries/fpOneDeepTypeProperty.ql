/**
 * @id prebid/fp-one-deep-constructor-prop
 * @name Use of browser API associated with fingerprinting
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
*/

// Finds property access on instances of types reachable 1 level down from a global (e.g. `new SomeName.SomeType().someProperty`)

import prebid
import autogen_fpGlobalTypeProperty1

SourceNode oneDeepType(TypeTracker t, string parent, string ctor) {
  t.start() and (
    result = callTo(oneDeepGlobal(parent, ctor))
  ) or exists(TypeTracker t2 |
    result = oneDeepType(t2, parent, ctor).track(t2, t)
  )
}


from GlobalTypeProperty1 prop, SourceNode use
where
   use = oneDeepType(TypeTracker::end(), prop.getGlobal0(), prop.getGlobal1()).getAPropertyRead(prop)
select use, prop.getGlobal0() + "." + prop.getGlobal1() + "." + prop + " is an indicator of fingerprinting; weight: " + prop.getWeight()
