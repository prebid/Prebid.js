import stateFactory from 'libraries/video/shared/state.js';
import { expect } from 'chai';

describe('State', function () {
  let state = stateFactory();
  beforeEach(() => {
    state.clearState();
  });

  it('should update state', function () {
    state.updateState({ 'test': 'a' });
    expect(state.getState()).to.have.property('test', 'a');
    state.updateState({ 'test': 'b' });
    expect(state.getState()).to.have.property('test', 'b');
    state.updateState({ 'test_2': 'c' });
    expect(state.getState()).to.have.property('test', 'b');
    expect(state.getState()).to.have.property('test_2', 'c');
  });

  it('should clear state', function () {
    state.updateState({ 'test': 'a' });
    state.clearState();
    expect(state.getState()).to.not.have.property('test', 'a');
    expect(state.getState()).to.be.empty;
  });
});
