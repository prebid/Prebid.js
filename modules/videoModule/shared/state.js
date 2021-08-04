export default function stateFactory() {
    let state = {};

    function updateState(stateUpdate) {
        Object.assign(state, stateUpdate);
    }

    function getState() {
        return state;
    }

    function clearState() {
        state = {};
    }

    return {
        updateState,
        getState,
        clearState
    };
}
