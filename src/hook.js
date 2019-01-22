
import create from 'fun-hooks';

export let hook = create();

/**
 * A map of global hook methods to allow easy extension of hooked functions that are intended to be extended globally
 * @type {{}}
 */
export const hooks = hook.hooks;
