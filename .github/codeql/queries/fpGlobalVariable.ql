/**
 * @id prebid/fp-global-var
 * @name Use of browser API associated with fingerprinting
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds use of global variables (e.g. `someVariable`)

import prebid
import autogen_fpGlobalVar


from GlobalVar var, SourceNode use
where
   use = windowPropertyRead(var)
select use, var + " is an indicator of fingerprinting; weight: " + var.getWeight()
