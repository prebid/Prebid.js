declare const $$DEFINE_PREBID_GLOBAL$$: boolean;

let shouldDefine = $$DEFINE_PREBID_GLOBAL$$;
let globalName = '$$PREBID_GLOBAL$$';

export function setGlobalVarName(name: string) {
  globalName = name;
}

export function getGlobalVarName() {
  return globalName;
}

export function defineGlobal(defineGlobal: boolean | null) {
  if (defineGlobal != null) {
    shouldDefine = defineGlobal;
  }
  return shouldDefine;
}
