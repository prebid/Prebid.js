/**
 * @id prebid/deprecated-gpt-targeting-api
 * @name Deprecated GPT targeting API usage
 * @kind problem
 * @problem.severity warning
 * @description GPT targeting should go through src/utils/gptTargeting so that the modern getConfig/setConfig API is used when available.
 */

import javascript

predicate legacyGptTargetingApi(string name) {
  name = "setTargeting" or
  name = "getTargeting" or
  name = "getTargetingKeys" or
  name = "clearTargeting" or
  name = "updateTargetingFromMap"
}

predicate allowedCompatibilityShim(PropAccess access) {
  access.getFile().getBaseName() = "gptTargeting.ts"
}

predicate gptLikeReceiver(Expr receiver) {
  receiver.toString().matches("%googletag%") or
  receiver.toString().matches("%pubads%") or
  receiver.toString().matches("%gpt%") or
  receiver.toString().matches("%Gpt%") or
  receiver.toString().matches("%GPT%") or
  receiver.toString().matches("%slot%") or
  receiver.toString().matches("%Slot%")
}

from PropAccess access, string apiName
where
  access.getPropertyName() = apiName and
  legacyGptTargetingApi(apiName) and
  gptLikeReceiver(access.getBase()) and
  not allowedCompatibilityShim(access)
select access,
  "Use src/utils/gptTargeting helpers instead of deprecated GPT targeting API " + apiName + "."
