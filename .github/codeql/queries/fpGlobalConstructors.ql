/**
 * @id prebid/fp-global-constructors
 * @name Use of browser API associated with fingerprinting
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds uses of global constructors (e.g. `new SomeConstructor()`)

import prebid
import autogen_fpGlobalConstructor

from GlobalConstructor ctor, SourceNode use
where
  use = callTo(global(ctor))
select use, ctor + " is an indicator of fingerprinting; weight: " + ctor.getWeight()
