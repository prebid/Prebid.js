/**
 * @id prebid/fp-one-deep-object-prop
 * @name Fingerprinting API (1-deep global object property)
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
*/

// Finds property access on instances of objects reachable 1 level down from a global (e.g. `someName.someObject.someProperty`)

import prebid
import autogen_fpGlobalObjectProperty1

from GlobalObjectProperty1 prop, SourceNode use
where
   use = oneDeepGlobal(prop.getGlobal0(), prop.getGlobal1()).getAPropertyRead(prop)
select use, prop.getGlobal0() + "." + prop.getGlobal1() + "." + prop + " is an indicator of fingerprinting; weight: " + prop.getWeight()
