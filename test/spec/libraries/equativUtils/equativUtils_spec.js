import * as equativUtils from "../../../../libraries/equativUtils/equativUtils";

describe('equativUtils', () => {
  describe('prepareSplitImps', () => {
    let imp, bid;

    beforeEach(() => {
      imp = {
        id: 'abcd1234',
        banner: {
          topframe: 1,
          pos: 1,
          format: [
            {
              w: 10,
              h: 10,
            }
          ]
        },
      }

      bid = {
        params: {
          bidfloor: 2.0
        }
      }
    })

    it('should not set pos and topframe properties for imp in case of Equativ adapter', () => {
      const result = equativUtils.prepareSplitImps([imp], bid, 'USD', {}, 'eqtv')[0];

      expect(result.banner.pos).to.be.undefined;
      expect(result.banner.topframe).to.be.undefined;
    })

    it('should set pos and topframe properties for imp in case of Sharethrough adapter', () => {
      const result = equativUtils.prepareSplitImps([imp], bid, 'USD', {}, 'stx')[0];

      expect(result.banner.pos).to.equal(1);
      expect(result.banner.topframe).to.equal(1);
    })
  })
})
