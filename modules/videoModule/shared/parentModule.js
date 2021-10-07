
/*
Used by any module to manage the relationship with its submodules.
 */
export function ParentModule(submoduleBuilder_) {
  const submoduleBuilder = submoduleBuilder_;
  const submodules = {};

  function registerSubmodule(id, config) {
    if (submodules[id]) {
      return;
    }

    let submodule;
    try {
      submodule = submoduleBuilder.build(id, config);
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

export function submoduleBuilder(submoduleDirectory_) {
  const submoduleDirectory = submoduleDirectory_;

  function build(id, config) {
    const submoduleFactory = submoduleDirectory[id];
    if (!submoduleFactory) {
      throw new Error('Unrecognized submodule code: ' + id);
    }

    const submodule = submoduleFactory(config);
    submodule && submodule.init && submodule.init();
    return submodule;
  }

  return {
    build
  };
}
