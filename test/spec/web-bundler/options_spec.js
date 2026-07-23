import { parseParams } from 'web-bundler/options.mjs';

describe('web bundler options', () => {
  describe('parseParams', () => {
    it('should parse comma-separated module list', () => {
      expect(parseParams('modules=m1,m2').modules).to.eql(['m1', 'm2']);
    });
    it('should parse repeated modules param', () => {
      expect(parseParams('modules=m1&modules=m2').modules).to.eql(['m1', 'm2']);
    });
    it('should include default build options', async () => {
      expect(Object.keys(parseParams('').buildOptions)).to.include('pbGlobal', 'distUrlBase');
    });

    it('should override pbGlobal if globalVarName is provided', () => {
      expect(parseParams(`globalVarName=value`).buildOptions.pbGlobal).to.eql('value');
    });
    it('should override distUrlBase if provided', () => {
      expect(parseParams(`distUrlBase=value`).buildOptions.distUrlBase).to.eql('value');
    });
  });
});
