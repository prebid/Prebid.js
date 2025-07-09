/**
 * @id prebid/hardware-concurrency
 * @name Access to navigator.hardwareConcurrency
 * @kind problem
 * @problem.severity warning
 * @description Finds uses of hardwareConcurrency
 */

import prebid

from SourceNode nav
where
 nav = windowPropertyRead("navigator")
select nav.getAPropertyRead("hardwareConcurrency"), "hardwareConcurrency is an indicator of fingerprinting"
