/**
 * @typedef State
 * @summary simple state object. Can be subclassed
 */

/**
 * @summary factory to create a simple state object
 * @returns {State}
 */
export default function stateFactory() {
  let state = {};

  /**
   * @function
   * @name State#updateState
   * @summary updates the state
   * @param {Object} stateUpdate
   */
  function updateState(stateUpdate) {
    Object.assign(state, stateUpdate);
  }

  /**
   * @function
   * @name State#getState
   * @summary provides the current state
   * @returns {Object} the current state
   */
  function getState() {
    return state;
  }

  /**
   * @function
   * @name State#clearState
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
