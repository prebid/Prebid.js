import { describe, it } from 'mocha';
import { expect } from 'chai';
import { injector } from '../../web-bundler/buildOptionsInjector.mjs';

describe('buildOptionsInjector', () => {
  it('replaces the build options object in a callable injector', () => {
    const output = injector('globalThis.testOptions = { pbGlobal: "pbjs" };');

    expect(output).to.include('export function injectBuildOptions(__buildOptions__)');
    expect(output).to.include('globalThis.testOptions = __buildOptions__;');
    expect(output).not.to.include('pbGlobal');
  });
});
