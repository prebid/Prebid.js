
import { resolve, CyclicDependency, UnknownDependency } from './dependencyResolver';

import { createNew as createNewAdapter } from './adapters/adapter';
import { AnalyticsAdapter } from './adapters/analytics/AnalyticsAdapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { loadScript } from 'src/adloader';
import { ajax } from 'src/ajax';
import * as CONSTANTS from 'src/constants';

var loaded = false,
    registry = {};

/**
 *
 * @param name
 * @param dependencies
 * @param factory
 */
export function module(name, dependencies, factory) {
  if (typeof dependencies === 'function') {
    factory = dependencies;
    dependencies = [];
  }

  if (typeof name !== "string") {
    utils.logError('module missing name');
  } else if (Array.isArray(dependencies) && typeof factory === 'function') {
    if (registry[name]) {
      utils.logWarn(`module ${name} redefined`);
    }

    registry[name] = {
      name,
      dependencies,
      factory
    };

    return factory;
  } else {
    utils.logError(`bad module definition for '${name}'`);
  }

  return false;
}

/**
 *
 * @param config
 */
export function enableModules(config = {}) {
  var loadOrder,
      results = {},
      names = Object.keys(registry);

  if (loaded) {
    utils.logWarn('attempted to enableModules multiple times');
    return;
  }

  try {
    loadOrder = resolve(
      names,
      names.reduce((memo, name) => memo.concat(
        registry[name].dependencies.reduce((memo, dependency) => (
          memo.push([name, dependency]), memo
        ), [])
      ), [])
    );

  } catch(e) {
    if (e instanceof CyclicDependency) {
      utils.logError(`cyclic dependency found with module ${e.module}`, null, e);
    } else if (e instanceof UnknownDependency) {
      utils.logError(`module not found: ${e.module}`, null, e);
    } else {
      utils.logError('error resolving module dependencies', null, e);
    }
    return false;
  }

  loadOrder.forEach(name => {
    let module = registry[name];
    try {
      results[name] = module.factory.apply(
        module,
        module.dependencies.map(
          dependency => results[dependency]
        ).concat(
          [{
            pbjs: $$PREBID_GLOBAL$$,
            createNewAdapter,
            AnalyticsAdapter,
            bidfactory,
            bidmanager,
            utils,
            loadScript,
            ajax,
            CONSTANTS,
            config: config[name]
          }]
        )
      );
    } catch(e) {
      utils.logWarn(`error executing module: ${name}`);
    }
  });

  loaded = true;
}
