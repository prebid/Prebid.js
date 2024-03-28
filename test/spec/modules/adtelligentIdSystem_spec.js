import { adtelligentIdModule } from 'modules/adtelligentIdSystem'
import * as ajaxLib from 'src/ajax.js';

const adtUserIdRemoteResponse = { u: 'test1' };
const adtUserIdLocalResponse = 'test2';

describe('AdtelligentId module', function () {
  it('gets remote id', function () {
    const ajaxBuilderStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
      return (url, cbObj) => {
        cbObj.success(JSON.stringify(adtUserIdRemoteResponse))
      }
    });
    const moduleIdCallbackResponse = adtelligentIdModule.getId();
    moduleIdCallbackResponse.callback((id) => {
      expect(id).to.equal(adtUserIdRemoteResponse.u)
    })
    ajaxBuilderStub.restore();
  })
  it('gets id from page context', function () {
    window.adtDmp = {
      ready: true,
      getUID() {
        return adtUserIdLocalResponse;
      }
    }
    const moduleIdResponse = adtelligentIdModule.getId();
    assert.deepEqual(moduleIdResponse, { id: adtUserIdLocalResponse });
  })
})
