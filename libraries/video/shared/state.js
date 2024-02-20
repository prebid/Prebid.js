/**
 * @typedef {Object} State
 * @summary simple state object. Can be subclassed
 * @function updateState
 * @function getState
 * @function clearState
 */

/**
 * @summary factory to create a simple state object
 * @returns {State}
 */
export default function stateFactory() {
  let state = {};

  /**
   * @function State#updateState
   * @summary updates the state
   * @param {Object} stateUpdate
   */
  function updateState(stateUpdate) {
    Object.assign(state, stateUpdate);
  }

  /**
   * @function State#getState
   * @summary provides the current state
   * @returns {Object} the current state
   */
  function getState() {
    return state;
  }

  /**
   * @function State#clearState
   * @summary erases the current state
   */
  function clearState() {
    state = {};
  }

  return {
    updateState,
    getState,
    clearState
  };
}
