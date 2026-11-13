/**
 * @id prebid/fp-top-level-object-prop
 * @name Use of browser API associated with fingerprinting
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds property access on top-level global objects (e.g. `someObject.someProperty`)

import prebid
import autogen_fpGlobalObjectProperty0

from GlobalObjectProperty0 prop, SourceNode use
where
   use = global(prop.getGlobal0()).getAPropertyRead(prop)
select use, prop.getGlobal0() + "." + prop + " is an indicator of fingerprinting; weight: " + prop.getWeight()
