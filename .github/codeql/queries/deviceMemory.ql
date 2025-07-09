/**
 * @id prebid/device-memory
 * @name Access to navigator.deviceMemory
 * @kind problem
 * @problem.severity warning
 * @description Finds uses of deviceMemory
 */

import prebid

from SourceNode nav
where
 nav = windowPropertyRead("navigator")
select nav.getAPropertyRead("deviceMemory"), "deviceMemory is an indicator of fingerprinting"
