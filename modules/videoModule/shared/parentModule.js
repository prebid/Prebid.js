
/*
Used by any module to manage the relationship with its submodules.
 */
export function ParentModule(submoduleBuilder_) {
  const submoduleBuilder = submoduleBuilder_;
  const submodules = {};

  /*
  id: identifies the submodule instance
  vendorCode: identifies the submodule type that must be built
  config: additional information necessary to instantiate the instance
   */
  function registerSubmodule(id, vendorCode, config) {
    if (submodules[id]) {
      return;
    }

    let submodule;
    try {
      submodule = submoduleBuilder.build(vendorCode, config);
    } catch (e) {
      throw e;
    }
    submodules[id] = submodule;
  }

  function getSubmodule(id) {
    return submodules[id];
  }

  return {
    registerSubmodule,
    getSubmodule
  }
}

export function SubmoduleBuilder(submoduleDirectory_) {
  const submoduleDirectory = submoduleDirectory_;

  function build(vendorCode, config) {
    const submoduleFactory = submoduleDirectory[vendorCode];
    if (!submoduleFactory) {
      throw new Error('Unrecognized submodule vendor code: ' + vendorCode);
    }

    const submodule = submoduleFactory(config);
    submodule && submodule.init && submodule.init();
    return submodule;
  }

  return {
    build
  };
}
