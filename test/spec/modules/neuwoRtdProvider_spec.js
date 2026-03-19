import * as neuwo from "modules/neuwoRtdProvider";
import { server } from "test/mocks/xhr.js";

const NEUWO_API_URL = "https://api.url.neuwo.ai/edge/GetAiTopics";
const NEUWO_API_TOKEN = "token";
const IAB_CONTENT_TAXONOMY_VERSION = "3.0";

const config = () => ({
  params: {
    neuwoApiUrl: NEUWO_API_URL,
    neuwoApiToken: NEUWO_API_TOKEN,
    iabContentTaxonomyVersion: IAB_CONTENT_TAXONOMY_VERSION,
  },
});

function getNeuwoApiResponse() {
  return {
    brand_safety: {
      BS_score: "1.0",
      BS_indication: "yes",
    },
    marketing_categories: {
      iab_tier_1: [
        {
          ID: "274",
          label: "Home & Garden",
          relevance: "0.47",
        },
      ],
      iab_tier_2: [
        {
          ID: "216",
          label: "Cooking",
          relevance: "0.41",
        },
      ],
      iab_tier_3: [],
      iab_audience_tier_3: [
        {
          ID: "49",
          label: "Demographic | Gender | Female |",
          relevance: "0.9923",
        },
      ],
      iab_audience_tier_4: [
        {
          ID: "127",
          label: "Demographic | Household Data | 1 Child |",
          relevance: "0.9673",
        },
      ],
      iab_audience_tier_5: [
        {
          ID: "98",
          label: "Demographic | Household Data | Parents with Children |",
          relevance: "0.9066",
        },
      ],
    },
    smart_tags: [
      {
        ID: "123",
        name: "animals-group",
      },
    ],
  };
}
const CONTENT_TIERS = ["iab_tier_1", "iab_tier_2", "iab_tier_3"];
const AUDIENCE_TIERS = ["iab_audience_tier_3", "iab_audience_tier_4", "iab_audience_tier_5"];

/**
 * Object generator, like above, written using alternative techniques
 * @returns object with predefined (expected) bidsConfig fields
 */
function bidsConfiglike() {
  return Object.assign(
    {},
    {
      ortb2Fragments: { global: {} },
    }
  );
}

describe("neuwoRtdModule", function () {
  beforeEach(function () {
    // Clear the global cache before each test to ensure test isolation
    neuwo.clearCache();
  });

  describe("init", function () {
    it("should return true when all required parameters are provided", function () {
      expect(
        neuwo.neuwoRtdModule.init(config()),
        "should successfully initialize with a valid configuration"
      ).to.be.true;
    });

    it("should return false when no configuration is provided", function () {
      expect(neuwo.neuwoRtdModule.init(), "should fail initialization if config is missing").to.be
        .false;
    });

    it("should return false when the neuwoApiUrl parameter is missing", function () {
      const incompleteConfig = {
        params: {
          neuwoApiToken: NEUWO_API_TOKEN,
        },
      };
      expect(
        neuwo.neuwoRtdModule.init(incompleteConfig),
        "should fail initialization if neuwoApiUrl is not set"
      ).to.be.false;
    });

    it("should return false when the neuwoApiToken parameter is missing", function () {
      const incompleteConfig = {
        params: {
          neuwoApiUrl: NEUWO_API_URL,
        },
      };
      expect(
        neuwo.neuwoRtdModule.init(incompleteConfig),
        "should fail initialization if neuwoApiToken is not set"
      ).to.be.false;
    });
  });

  describe("buildIabData", function () {
    it("should return an empty segment array when no matching tiers are found", function () {
      const marketingCategories = getNeuwoApiResponse().marketing_categories;
      const tiers = ["non_existent_tier"];
      const segtax = 0;
      const result = neuwo.buildIabData(marketingCategories, tiers, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [],
        ext: {
          segtax,
        },
      };
      expect(result, "should produce a valid object with an empty segment array").to.deep.equal(
        expected
      );
    });

    it("should correctly build the data object for content tiers", function () {
      const marketingCategories = getNeuwoApiResponse().marketing_categories;
      const segtax = 0;
      const result = neuwo.buildIabData(marketingCategories, CONTENT_TIERS, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [
          {
            id: "274",
            name: "Home & Garden",
          },
          {
            id: "216",
            name: "Cooking",
          },
        ],
        ext: {
          segtax,
        },
      };
      expect(result, "should aggregate segments from all specified content tiers").to.deep.equal(
        expected
      );
    });

    it("should correctly build the data object for audience tiers", function () {
      const marketingCategories = getNeuwoApiResponse().marketing_categories;
      const segtax = 0;
      const result = neuwo.buildIabData(marketingCategories, AUDIENCE_TIERS, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [
          {
            id: "49",
            name: "Demographic | Gender | Female |",
          },
          {
            id: "127",
            name: "Demographic | Household Data | 1 Child |",
          },
          {
            id: "98",
            name: "Demographic | Household Data | Parents with Children |",
          },
        ],
        ext: {
          segtax,
        },
      };
      expect(result, "should aggregate segments from all specified audience tiers").to.deep.equal(
        expected
      );
    });

    it("should return an empty segment array when marketingCategories is null or undefined", function () {
      const segtax = 4;
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [],
        ext: {
          segtax,
        },
      };
      expect(
        neuwo.buildIabData(null, CONTENT_TIERS, segtax),
        "should handle null marketingCategories gracefully"
      ).to.deep.equal(expected);
      expect(
        neuwo.buildIabData(undefined, CONTENT_TIERS, segtax),
        "should handle undefined marketingCategories gracefully"
      ).to.deep.equal(expected);
    });

    it("should return an empty segment array when marketingCategories is empty", function () {
      const marketingCategories = {};
      const segtax = 4;
      const result = neuwo.buildIabData(marketingCategories, CONTENT_TIERS, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [],
        ext: {
          segtax,
        },
      };
      expect(result, "should handle an empty marketingCategories object").to.deep.equal(expected);
    });

    it("should gracefully handle if a marketing_categories key contains a non-array value", function () {
      const marketingCategories = getNeuwoApiResponse().marketing_categories;
      // Overwrite iab_tier_1 to be an object instead of an array
      marketingCategories.iab_tier_1 = { ID: "274", label: "Home & Garden" };

      const segtax = 4;
      const result = neuwo.buildIabData(marketingCategories, CONTENT_TIERS, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        // The segment should only contain data from the valid iab_tier_2
        segment: [
          {
            id: "216",
            name: "Cooking",
          },
        ],
        ext: {
          segtax,
        },
      };

      expect(result, "should skip non-array tier values and process valid ones").to.deep.equal(
        expected
      );
    });

    it("should ignore malformed objects within a tier array", function () {
      const marketingCategories = getNeuwoApiResponse().marketing_categories;
      // Overwrite iab_tier_1 with various malformed objects
      marketingCategories.iab_tier_1 = [
        { ID: "274", label: "Valid Object" },
        { ID: "999" }, // Missing 'label' property
        { label: "Another Label" }, // Missing 'ID' property
        null, // A null value
        "just-a-string", // A string primitive
        {}, // An empty object
      ];

      const segtax = 4;
      const result = neuwo.buildIabData(marketingCategories, CONTENT_TIERS, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        // The segment should contain the one valid object from iab_tier_1 and the data from iab_tier_2
        segment: [
          {
            id: "274",
            name: "Valid Object",
          },
          {
            id: "216",
            name: "Cooking",
          },
        ],
        ext: {
          segtax,
        },
      };

      expect(result, "should filter out malformed entries within a tier array").to.deep.equal(
        expected
      );
    });

    it("should return an empty segment array if the entire marketingCategories object is not a valid object", function () {
      const segtax = 4;
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [],
        ext: { segtax },
      };
      // Test with a string
      const resultString = neuwo.buildIabData("incorrect format", CONTENT_TIERS, segtax);
      expect(resultString, "should handle non-object marketingCategories input").to.deep.equal(
        expected
      );
    });
  });

  describe("injectOrtbData", function () {
    it("should correctly mutate the request bids config object with new data", function () {
      const reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      neuwo.injectOrtbData(reqBidsConfigObj, "c.d.e.f", { g: "h" });
      expect(
        reqBidsConfigObj.ortb2Fragments.global.c.d.e.f.g,
        "should deeply merge the new data into the target object"
      ).to.equal("h");
    });
  });

  describe("getBidRequestData", function () {
    describe("when using IAB Content Taxonomy 3.0", function () {
      it("should correctly structure the bids object after a successful API response", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig = bidsConfiglike();
        const conf = config();
        // control xhr api request target for testing
        conf.params.websiteToAnalyseUrl =
          "https://publisher.works/article.php?get=horrible_url_for_testing&id=5";

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should be a string").to.be.a("string");
        expect(request.url, "The request URL should include the public API token").to.include(
          conf.params.neuwoApiToken
        );
        expect(request.url, "The request URL should include the encoded website URL").to.include(
          encodeURIComponent(conf.params.websiteToAnalyseUrl)
        );

        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        const contentData = bidsConfig.ortb2Fragments.global.site.content.data[0];
        expect(contentData.name, "The data provider name should be correctly set").to.equal(
          neuwo.DATA_PROVIDER
        );
        expect(
          contentData.ext.segtax,
          "The segtax value should correspond to IAB Content Taxonomy 3.0"
        ).to.equal(7);
        expect(
          contentData.segment[0].id,
          "The first segment ID should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_tier_1[0].ID);
        expect(
          contentData.segment[1].name,
          "The second segment name should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_tier_2[0].label);
      });
    });

    describe("when using IAB Content Taxonomy 2.2", function () {
      it("should correctly structure the bids object after a successful API response", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.iabContentTaxonomyVersion = "2.2";
        // control xhr api request target for testing
        conf.params.websiteToAnalyseUrl =
          "https://publisher.works/article.php?get=horrible_url_for_testing&id=5";

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should be a string").to.be.a("string");
        expect(request.url, "The request URL should include the public API token").to.include(
          conf.params.neuwoApiToken
        );
        expect(request.url, "The request URL should include the encoded website URL").to.include(
          encodeURIComponent(conf.params.websiteToAnalyseUrl)
        );

        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );
        const contentData = bidsConfig.ortb2Fragments.global.site.content.data[0];
        expect(contentData.name, "The data provider name should be correctly set").to.equal(
          neuwo.DATA_PROVIDER
        );
        expect(
          contentData.ext.segtax,
          "The segtax value should correspond to IAB Content Taxonomy 2.2"
        ).to.equal(6);
        expect(
          contentData.segment[0].id,
          "The first segment ID should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_tier_1[0].ID);
        expect(
          contentData.segment[1].name,
          "The second segment name should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_tier_2[0].label);
      });
    });

    describe("when using the default IAB Content Taxonomy", function () {
      it("should correctly structure the bids object after a successful API response", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.iabContentTaxonomyVersion = undefined;
        // control xhr api request target for testing
        conf.params.websiteToAnalyseUrl =
          "https://publisher.works/article.php?get=horrible_url_for_testing&id=5";

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should be a string").to.be.a("string");
        expect(request.url, "The request URL should include the public API token").to.include(
          conf.params.neuwoApiToken
        );
        expect(request.url, "The request URL should include the encoded website URL").to.include(
          encodeURIComponent(conf.params.websiteToAnalyseUrl)
        );

        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );
        const contentData = bidsConfig.ortb2Fragments.global.site.content.data[0];
        expect(contentData.name, "The data provider name should be correctly set").to.equal(
          neuwo.DATA_PROVIDER
        );
        expect(
          contentData.ext.segtax,
          "The segtax value should default to IAB Content Taxonomy 3.0"
        ).to.equal(7);
        expect(
          contentData.segment[0].id,
          "The first segment ID should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_tier_1[0].ID);
        expect(
          contentData.segment[1].name,
          "The second segment name should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_tier_2[0].label);
      });
    });

    describe("when using IAB Audience Taxonomy 1.1", function () {
      it("should correctly structure the bids object after a successful API response", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig = bidsConfiglike();
        const conf = config();
        // control xhr api request target for testing
        conf.params.websiteToAnalyseUrl =
          "https://publisher.works/article.php?get=horrible_url_for_testing&id=5";

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should be a string").to.be.a("string");
        expect(request.url, "The request URL should include the public API token").to.include(
          conf.params.neuwoApiToken
        );
        expect(request.url, "The request URL should include the encoded website URL").to.include(
          encodeURIComponent(conf.params.websiteToAnalyseUrl)
        );

        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );
        const userData = bidsConfig.ortb2Fragments.global.user.data[0];
        expect(userData.name, "The data provider name should be correctly set").to.equal(
          neuwo.DATA_PROVIDER
        );
        expect(
          userData.ext.segtax,
          "The segtax value should correspond to IAB Audience Taxonomy 1.1"
        ).to.equal(4);
        expect(
          userData.segment[0].id,
          "The first segment ID should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_audience_tier_3[0].ID);
        expect(
          userData.segment[1].name,
          "The second segment name should match the API response"
        ).to.equal(apiResponse.marketing_categories.iab_audience_tier_4[0].label);
      });
    });

    it("should not change the bids object structure after an unsuccessful API response", function () {
      const bidsConfig = bidsConfiglike();
      const bidsConfigCopy = bidsConfiglike();
      const conf = config();

      neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
      const request = server.requests[0];
      request.respond(
        404,
        { "Content-Type": "application/json; encoding=UTF-8" },
        JSON.stringify({ detail: "test error" })
      );
      expect(
        bidsConfig,
        "The bids config object should remain unmodified after a failed API call"
      ).to.deep.equal(bidsConfigCopy);
    });
  });

  describe("cleanUrl", function () {
    describe("when no stripping options are provided", function () {
      it("should return the URL unchanged", function () {
        const url = "https://example.com/page?foo=bar&baz=qux";
        const result = neuwo.cleanUrl(url, {});
        expect(result, "should return the original URL with all query params intact").to.equal(url);
      });

      it("should return the URL unchanged when options object is empty", function () {
        const url = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url);
        expect(result, "should handle missing options parameter").to.equal(url);
      });
    });

    describe("with query parameters edge cases", function () {
      it("should strip all query parameters from the URL for `stripAllQueryParams` (edge cases)", function () {
        const stripAll = (url) => neuwo.cleanUrl(url, { stripAllQueryParams: true });
        const expected = "https://example.com/page";
        const expectedWithFragment = "https://example.com/page#anchor";

        // Basic formats
        expect(stripAll("https://example.com/page?key=value"), "should remove basic key=value params").to.equal(expected);
        expect(stripAll("https://example.com/page?key="), "should remove params with empty value").to.equal(expected);
        expect(stripAll("https://example.com/page?key"), "should remove params without equals sign").to.equal(expected);
        expect(stripAll("https://example.com/page?=value"), "should remove params with empty key").to.equal(expected);

        // Multiple parameters
        expect(stripAll("https://example.com/page?key1=value1&key2=value2"), "should remove multiple different params").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value1&key=value2"), "should remove multiple params with same key").to.equal(expected);

        // Special characters and encoding
        expect(stripAll("https://example.com/page?key=value%20with%20spaces"), "should remove URL encoded spaces").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value+with+plus"), "should remove plus as space").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value%3D%26%3F"), "should remove encoded special chars").to.equal(expected);
        expect(stripAll("https://example.com/page?key=%"), "should remove incomplete encoding").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value%2"), "should remove malformed encoding").to.equal(expected);

        // Delimiters and syntax edge cases
        expect(stripAll("https://example.com/page?&key=value"), "should remove params with leading ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value&"), "should remove params with trailing ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value&&key2=value2"), "should remove params with double ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value?key2=value2"), "should remove params with question mark delimiter").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value;key2=value2"), "should remove params with semicolon delimiter").to.equal(expected);

        // Empty and missing cases
        expect(stripAll("https://example.com/page?"), "should remove question mark alone").to.equal(expected);
        expect(stripAll("https://example.com/page??"), "should remove double question mark").to.equal(expected);
        expect(stripAll("https://example.com/page"), "should handle URL without query string").to.equal(expected);

        // Unicode and special values
        expect(stripAll("https://example.com/page?key=值"), "should remove unicode characters").to.equal(expected);
        expect(stripAll("https://example.com/page?key=null"), "should remove string 'null'").to.equal(expected);
        expect(stripAll("https://example.com/page?key=undefined"), "should remove string 'undefined'").to.equal(expected);

        // Fragment positioning (fragments are preserved by default)
        expect(stripAll("https://example.com/page?key=value#anchor"), "should remove query params and preserve fragment").to.equal(expectedWithFragment);
        expect(stripAll("https://example.com/page#anchor?key=value"), "should preserve fragment before params").to.equal("https://example.com/page#anchor?key=value");
      });

      it("should strip all query parameters from the URL for `stripQueryParamsForDomains` (edge cases)", function () {
        const stripAll = (url) => neuwo.cleanUrl(url, { stripQueryParamsForDomains: ["example.com"] });
        const expected = "https://example.com/page";
        const expectedWithFragment = "https://example.com/page#anchor";

        // Basic formats
        expect(stripAll("https://example.com/page?key=value"), "should remove basic key=value params").to.equal(expected);
        expect(stripAll("https://example.com/page?key="), "should remove params with empty value").to.equal(expected);
        expect(stripAll("https://example.com/page?key"), "should remove params without equals sign").to.equal(expected);
        expect(stripAll("https://example.com/page?=value"), "should remove params with empty key").to.equal(expected);

        // Multiple parameters
        expect(stripAll("https://example.com/page?key1=value1&key2=value2"), "should remove multiple different params").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value1&key=value2"), "should remove multiple params with same key").to.equal(expected);

        // Special characters and encoding
        expect(stripAll("https://example.com/page?key=value%20with%20spaces"), "should remove URL encoded spaces").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value+with+plus"), "should remove plus as space").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value%3D%26%3F"), "should remove encoded special chars").to.equal(expected);
        expect(stripAll("https://example.com/page?key=%"), "should remove incomplete encoding").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value%2"), "should remove malformed encoding").to.equal(expected);

        // Delimiters and syntax edge cases
        expect(stripAll("https://example.com/page?&key=value"), "should remove params with leading ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value&"), "should remove params with trailing ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value&&key2=value2"), "should remove params with double ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value?key2=value2"), "should remove params with question mark delimiter").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value;key2=value2"), "should remove params with semicolon delimiter").to.equal(expected);

        // Empty and missing cases
        expect(stripAll("https://example.com/page?"), "should remove question mark alone").to.equal(expected);
        expect(stripAll("https://example.com/page??"), "should remove double question mark").to.equal(expected);
        expect(stripAll("https://example.com/page"), "should handle URL without query string").to.equal(expected);

        // Unicode and special values
        expect(stripAll("https://example.com/page?key=值"), "should remove unicode characters").to.equal(expected);
        expect(stripAll("https://example.com/page?key=null"), "should remove string 'null'").to.equal(expected);
        expect(stripAll("https://example.com/page?key=undefined"), "should remove string 'undefined'").to.equal(expected);

        // Fragment positioning (fragments are preserved by default)
        expect(stripAll("https://example.com/page?key=value#anchor"), "should remove query params and preserve fragment").to.equal(expectedWithFragment);
        expect(stripAll("https://example.com/page#anchor?key=value"), "should preserve fragment before params").to.equal("https://example.com/page#anchor?key=value");
      });

      it("should strip all query parameters from the URL for `stripQueryParams` (edge cases)", function () {
        const stripAll = (url) => neuwo.cleanUrl(url, { stripQueryParams: ["key", "key1", "key2", "", "?"] });
        const expected = "https://example.com/page";
        const expectedWithFragment = "https://example.com/page#anchor";

        // Basic formats
        expect(stripAll("https://example.com/page?key=value"), "should remove basic key=value params").to.equal(expected);
        expect(stripAll("https://example.com/page?key="), "should remove params with empty value").to.equal(expected);
        expect(stripAll("https://example.com/page?key"), "should remove params without equals sign").to.equal(expected);
        expect(stripAll("https://example.com/page?=value"), "should remove params with empty key").to.equal(expected);

        // Multiple parameters
        expect(stripAll("https://example.com/page?key1=value1&key2=value2"), "should remove multiple different params").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value1&key=value2"), "should remove multiple params with same key").to.equal(expected);

        // Special characters and encoding
        expect(stripAll("https://example.com/page?key=value%20with%20spaces"), "should remove URL encoded spaces").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value+with+plus"), "should remove plus as space").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value%3D%26%3F"), "should remove encoded special chars").to.equal(expected);
        expect(stripAll("https://example.com/page?key=%"), "should remove incomplete encoding").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value%2"), "should remove malformed encoding").to.equal(expected);

        // Delimiters and syntax edge cases
        expect(stripAll("https://example.com/page?&key=value"), "should remove params with leading ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value&"), "should remove params with trailing ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value&&key2=value2"), "should remove params with double ampersand").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value?key2=value2"), "should remove params with question mark delimiter").to.equal(expected);
        expect(stripAll("https://example.com/page?key=value;key2=value2"), "should remove params with semicolon delimiter").to.equal(expected);

        // Empty and missing cases
        expect(stripAll("https://example.com/page?"), "should remove question mark alone").to.equal(expected);
        expect(stripAll("https://example.com/page"), "should handle URL without query string").to.equal(expected);

        // Unicode and special values
        expect(stripAll("https://example.com/page?key=值"), "should remove unicode characters").to.equal(expected);
        expect(stripAll("https://example.com/page?key=null"), "should remove string 'null'").to.equal(expected);
        expect(stripAll("https://example.com/page?key=undefined"), "should remove string 'undefined'").to.equal(expected);

        // Fragment positioning (fragments are preserved by default)
        expect(stripAll("https://example.com/page?key=value#anchor"), "should remove query params and preserve fragment").to.equal(expectedWithFragment);
        expect(stripAll("https://example.com/page#anchor?key=value"), "should preserve fragment before params").to.equal("https://example.com/page#anchor?key=value");
      });
    });

    describe("when stripAllQueryParams is true", function () {
      it("should strip all query parameters from the URL", function () {
        const url = "https://example.com/page?foo=bar&baz=qux&test=123";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, { stripAllQueryParams: true });
        expect(result, "should remove all query parameters").to.equal(expected);
      });

      it("should return the URL unchanged if there are no query parameters", function () {
        const url = "https://example.com/page";
        const result = neuwo.cleanUrl(url, { stripAllQueryParams: true });
        expect(result, "should handle URLs without query params").to.equal(url);
      });

      it("should preserve the hash fragment when stripping query params without stripFragments", function () {
        const url = "https://example.com/page?foo=bar#section";
        const expected = "https://example.com/page#section";
        const result = neuwo.cleanUrl(url, { stripAllQueryParams: true });
        expect(result, "should preserve hash fragments by default").to.equal(expected);
      });

      it("should strip hash fragment when stripFragments is enabled", function () {
        const url = "https://example.com/page?foo=bar#section";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, { stripAllQueryParams: true, stripFragments: true });
        expect(result, "should strip both query params and fragments").to.equal(expected);
      });

      it("should strip query params but preserve path and protocol", function () {
        const url = "https://subdomain.example.com:8080/path/to/page?param=value";
        const expected = "https://subdomain.example.com:8080/path/to/page";
        const result = neuwo.cleanUrl(url, { stripAllQueryParams: true });
        expect(result, "should preserve protocol, domain, port, and path").to.equal(expected);
      });
    });

    describe("when stripQueryParamsForDomains is provided", function () {
      it("should strip all query params for exact domain match", function () {
        const url = "https://example.com/page?foo=bar&baz=qux";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"]
        });
        expect(result, "should strip params for exact domain match").to.equal(expected);
      });

      it("should strip all query params for subdomain match", function () {
        const url = "https://sub.example.com/page?foo=bar";
        const expected = "https://sub.example.com/page";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"]
        });
        expect(result, "should strip params for subdomains").to.equal(expected);
      });

      it("should not strip query params if domain does not match", function () {
        const url = "https://other.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"]
        });
        expect(result, "should preserve params for non-matching domains").to.equal(url);
      });

      it("should not strip query params if subdomain is provided for domain", function () {
        const url = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["sub.example.com"]
        });
        expect(result, "should preserve params for domain when subdomain is provided").to.equal(url);
      });

      it("should handle multiple domains in the list", function () {
        const url1 = "https://example.com/page?foo=bar";
        const url2 = "https://test.com/page?foo=bar";
        const url3 = "https://other.com/page?foo=bar";
        const domains = ["example.com", "test.com"];

        const result1 = neuwo.cleanUrl(url1, { stripQueryParamsForDomains: domains });
        const result2 = neuwo.cleanUrl(url2, { stripQueryParamsForDomains: domains });
        const result3 = neuwo.cleanUrl(url3, { stripQueryParamsForDomains: domains });

        expect(result1, "should strip params for first domain").to.equal("https://example.com/page");
        expect(result2, "should strip params for second domain").to.equal("https://test.com/page");
        expect(result3, "should preserve params for non-listed domain").to.equal(url3);
      });

      it("should handle deep subdomains correctly", function () {
        const url = "https://deep.sub.example.com/page?foo=bar";
        const expected = "https://deep.sub.example.com/page";
        const result1 = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"]
        });
        const result2 = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["sub.example.com"]
        });
        expect(result1, "should strip params for deep subdomains with domain matching").to.equal(expected);
        expect(result2, "should strip params for deep subdomains with subdomain matching").to.equal(expected);
      });

      it("should not match partial domain names", function () {
        const url = "https://notexample.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"]
        });
        expect(result, "should not match partial domain strings").to.equal(url);
      });

      it("should handle empty domain list", function () {
        const url = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, { stripQueryParamsForDomains: [] });
        expect(result, "should not strip params with empty domain list").to.equal(url);
      });
    });

    describe("when stripQueryParams is provided", function () {
      it("should strip only specified query parameters", function () {
        const url = "https://example.com/page?foo=bar&baz=qux&keep=this";
        const expected = "https://example.com/page?keep=this";
        const result = neuwo.cleanUrl(url, {
          stripQueryParams: ["foo", "baz"]
        });
        expect(result, "should remove only specified params").to.equal(expected);
      });

      it("should handle single parameter stripping", function () {
        const url = "https://example.com/page?remove=this&keep=that";
        const expected = "https://example.com/page?keep=that";
        const result = neuwo.cleanUrl(url, {
          stripQueryParams: ["remove"]
        });
        expect(result, "should remove single specified param").to.equal(expected);
      });

      it("should return URL without query string if all params are stripped", function () {
        const url = "https://example.com/page?foo=bar&baz=qux";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, {
          stripQueryParams: ["foo", "baz"]
        });
        expect(result, "should remove query string when all params stripped").to.equal(expected);
      });

      it("should handle case where specified params do not exist", function () {
        const url = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, {
          stripQueryParams: ["nonexistent", "alsonothere"]
        });
        expect(result, "should handle non-existent params gracefully").to.equal(url);
      });

      it("should handle empty param list", function () {
        const url = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, { stripQueryParams: [] });
        expect(result, "should not strip params with empty list").to.equal(url);
      });

      it("should preserve param order for remaining params", function () {
        const url = "https://example.com/page?a=1&b=2&c=3&d=4";
        const result = neuwo.cleanUrl(url, {
          stripQueryParams: ["b", "d"]
        });
        expect(result, "should preserve order of remaining params").to.include("a=1");
        expect(result, "should preserve order of remaining params").to.include("c=3");
        expect(result, "should not include stripped param b").to.not.include("b=2");
        expect(result, "should not include stripped param d").to.not.include("d=4");
      });
    });

    describe("error handling", function () {
      it("should return null or undefined input unchanged", function () {
        expect(neuwo.cleanUrl(null, {}), "should handle null input").to.equal(null);
        expect(neuwo.cleanUrl(undefined, {}), "should handle undefined input").to.equal(undefined);
        expect(neuwo.cleanUrl("", {}), "should handle empty string").to.equal("");
      });

      it("should return invalid URL unchanged and log error", function () {
        const invalidUrl = "not-a-valid-url";
        const result = neuwo.cleanUrl(invalidUrl, { stripAllQueryParams: true });
        expect(result, "should return invalid URL unchanged").to.equal(invalidUrl);
      });

      it("should handle malformed URLs gracefully", function () {
        const malformedUrl = "http://";
        const result = neuwo.cleanUrl(malformedUrl, { stripAllQueryParams: true });
        expect(result, "should return malformed URL unchanged").to.equal(malformedUrl);
      });
    });

    describe("when stripFragments is enabled", function () {
      it("should strip URL fragments from URLs without query params", function () {
        const url = "https://example.com/page#section";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, { stripFragments: true });
        expect(result, "should remove hash fragment").to.equal(expected);
      });

      it("should strip URL fragments from URLs with query params", function () {
        const url = "https://example.com/page?foo=bar#section";
        const expected = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, { stripFragments: true });
        expect(result, "should remove hash fragment and preserve query params").to.equal(expected);
      });

      it("should strip fragments when combined with stripAllQueryParams", function () {
        const url = "https://example.com/page?foo=bar#section";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, { stripAllQueryParams: true, stripFragments: true });
        expect(result, "should remove both query params and fragment").to.equal(expected);
      });

      it("should strip fragments when combined with stripQueryParamsForDomains", function () {
        const url = "https://example.com/page?foo=bar#section";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"],
          stripFragments: true
        });
        expect(result, "should remove both query params and fragment for matching domain").to.equal(expected);
      });

      it("should strip fragments when combined with stripQueryParams", function () {
        const url = "https://example.com/page?foo=bar&keep=this#section";
        const expected = "https://example.com/page?keep=this";
        const result = neuwo.cleanUrl(url, {
          stripQueryParams: ["foo"],
          stripFragments: true
        });
        expect(result, "should remove specified query params and fragment").to.equal(expected);
      });

      it("should handle URLs without fragments gracefully", function () {
        const url = "https://example.com/page?foo=bar";
        const expected = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, { stripFragments: true });
        expect(result, "should handle URLs without fragments").to.equal(expected);
      });

      it("should handle empty fragments", function () {
        const url = "https://example.com/page#";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, { stripFragments: true });
        expect(result, "should remove empty fragment").to.equal(expected);
      });

      it("should handle complex fragments with special characters", function () {
        const url = "https://example.com/page?foo=bar#section-1/subsection?query";
        const expected = "https://example.com/page?foo=bar";
        const result = neuwo.cleanUrl(url, { stripFragments: true });
        expect(result, "should remove complex fragments").to.equal(expected);
      });
    });

    describe("option priority", function () {
      it("should apply stripAllQueryParams first when multiple options are set", function () {
        const url = "https://example.com/page?foo=bar&baz=qux";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, {
          stripAllQueryParams: true,
          stripQueryParams: ["foo"]
        });
        expect(result, "stripAllQueryParams should take precedence").to.equal(expected);
      });

      it("should apply stripQueryParamsForDomains before stripQueryParams", function () {
        const url = "https://example.com/page?foo=bar&baz=qux";
        const expected = "https://example.com/page";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"],
          stripQueryParams: ["foo"]
        });
        expect(result, "domain-specific stripping should take precedence").to.equal(expected);
      });

      it("should not strip for non-matching domain even with stripQueryParams set", function () {
        const url = "https://other.com/page?foo=bar&baz=qux";
        const expected = "https://other.com/page?baz=qux";
        const result = neuwo.cleanUrl(url, {
          stripQueryParamsForDomains: ["example.com"],
          stripQueryParams: ["foo"]
        });
        expect(result, "should fall through to stripQueryParams for non-matching domain").to.equal(expected);
      });
    });
  });

  // Integration Tests
  describe("injectIabCategories edge cases and merging", function () {
    it("should not inject data if 'marketing_categories' is missing from the successful API response", function () {
      const apiResponse = { brand_safety: { BS_score: "1.0" } }; // Missing marketing_categories
      const bidsConfig = bidsConfiglike();
      const bidsConfigCopy = bidsConfiglike();
      const conf = config();

      neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
      const request = server.requests[0];
      request.respond(
        200,
        { "Content-Type": "application/json; encoding=UTF-8" },
        JSON.stringify(apiResponse)
      );

      // After a successful response with missing data, the global ortb2 fragments should remain empty
      // as the data injection logic checks for marketingCategories.
      expect(
        bidsConfig.ortb2Fragments.global,
        "The global ORTB fragments should remain empty"
      ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
    });

    it("should append content and user data to existing ORTB fragments", function () {
      const apiResponse = getNeuwoApiResponse();
      const bidsConfig = bidsConfiglike();
      // Simulate existing first-party data from another source/module
      const existingContentData = { name: "other_content_provider", segment: [{ id: "1" }] };
      const existingUserData = { name: "other_user_provider", segment: [{ id: "2" }] };

      bidsConfig.ortb2Fragments.global = {
        site: {
          content: {
            data: [existingContentData],
          },
        },
        user: {
          data: [existingUserData],
        },
      };
      const conf = config();

      neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
      const request = server.requests[0];
      request.respond(
        200,
        { "Content-Type": "application/json; encoding=UTF-8" },
        JSON.stringify(apiResponse)
      );

      const siteData = bidsConfig.ortb2Fragments.global.site.content.data;
      const userData = bidsConfig.ortb2Fragments.global.user.data;

      // Check that the existing data is still there (index 0)
      expect(siteData[0], "Existing site.content.data should be preserved").to.deep.equal(
        existingContentData
      );
      expect(userData[0], "Existing user.data should be preserved").to.deep.equal(existingUserData);

      // Check that the new Neuwo data is appended (index 1)
      expect(siteData.length, "site.content.data array should have 2 entries").to.equal(2);
      expect(userData.length, "user.data array should have 2 entries").to.equal(2);
      expect(siteData[1].name, "The appended content data should be from Neuwo").to.equal(
        neuwo.DATA_PROVIDER
      );
      expect(userData[1].name, "The appended user data should be from Neuwo").to.equal(
        neuwo.DATA_PROVIDER
      );
    });
  });

  describe("getBidRequestData with caching", function () {
    describe("when enableCache is true (default)", function () {
      it("should cache the API response and reuse it on subsequent calls", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=1";

        // First call should make an API request
        neuwo.getBidRequestData(bidsConfig1, () => {}, conf, "consent data");
        expect(server.requests.length, "First call should make an API request").to.equal(1);

        const request1 = server.requests[0];
        request1.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        // Second call should use cached response (no new API request)
        neuwo.getBidRequestData(bidsConfig2, () => {}, conf, "consent data");
        expect(server.requests.length, "Second call should not make a new API request").to.equal(1);

        // Both configs should have the same data
        const contentData1 = bidsConfig1.ortb2Fragments.global.site.content.data[0];
        const contentData2 = bidsConfig2.ortb2Fragments.global.site.content.data[0];
        expect(contentData1, "First config should have Neuwo data").to.exist;
        expect(contentData2, "Second config should have Neuwo data from cache").to.exist;
        expect(contentData1.name, "First config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
        expect(contentData2.name, "Second config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
      });

      it("should cache when enableCache is explicitly set to true", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=2";
        conf.params.enableCache = true;

        // First call
        neuwo.getBidRequestData(bidsConfig1, () => {}, conf, "consent data");
        expect(server.requests.length, "First call should make an API request").to.equal(1);

        const request1 = server.requests[0];
        request1.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        // Second call should use cache
        neuwo.getBidRequestData(bidsConfig2, () => {}, conf, "consent data");
        expect(server.requests.length, "Second call should use cached response").to.equal(1);
      });
    });

    describe("when enableCache is false", function () {
      it("should not cache the API response and make a new request each time", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=3";
        conf.params.enableCache = false;

        // First call should make an API request
        neuwo.getBidRequestData(bidsConfig1, () => {}, conf, "consent data");
        expect(server.requests.length, "First call should make an API request").to.equal(1);

        const request1 = server.requests[0];
        request1.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        // Second call should make a new API request (not use cache)
        neuwo.getBidRequestData(bidsConfig2, () => {}, conf, "consent data");
        expect(server.requests.length, "Second call should make a new API request").to.equal(2);

        const request2 = server.requests[1];
        request2.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        // Both configs should have the same data structure
        const contentData1 = bidsConfig1.ortb2Fragments.global.site.content.data[0];
        const contentData2 = bidsConfig2.ortb2Fragments.global.site.content.data[0];
        expect(contentData1, "First config should have Neuwo data").to.exist;
        expect(contentData2, "Second config should have Neuwo data from new request").to.exist;
        expect(contentData1.name, "First config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
        expect(contentData2.name, "Second config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
      });

      it("should bypass existing cache when enableCache is false", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const bidsConfig3 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=4";

        // First call with caching enabled (default)
        neuwo.getBidRequestData(bidsConfig1, () => {}, conf, "consent data");
        expect(server.requests.length, "First call should make an API request").to.equal(1);

        const request1 = server.requests[0];
        request1.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        // Second call with caching enabled should use cache
        neuwo.getBidRequestData(bidsConfig2, () => {}, conf, "consent data");
        expect(server.requests.length, "Second call should use cache").to.equal(1);

        // Third call with caching disabled should bypass cache
        conf.params.enableCache = false;
        neuwo.getBidRequestData(bidsConfig3, () => {}, conf, "consent data");
        expect(server.requests.length, "Third call should bypass cache and make new request").to.equal(2);

        const request2 = server.requests[1];
        request2.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );
      });
    });
  });

  describe("getBidRequestData with URL query param stripping", function () {
    describe("when stripAllQueryParams is enabled", function () {
      it("should strip all query parameters from the analyzed URL", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?utm_source=test&utm_campaign=example&id=5";
        conf.params.stripAllQueryParams = true;

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should not contain encoded query params").to.include(
          encodeURIComponent("https://publisher.works/article.php")
        );
        expect(request.url, "The request URL should not contain utm_source").to.not.include(
          encodeURIComponent("utm_source")
        );
      });
    });

    describe("when stripQueryParamsForDomains is enabled", function () {
      it("should strip query params only for matching domains", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?foo=bar&id=5";
        conf.params.stripQueryParamsForDomains = ["publisher.works"];

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should contain the URL without query params").to.include(
          encodeURIComponent("https://publisher.works/article.php")
        );
        expect(request.url, "The request URL should not contain the id param").to.not.include(
          encodeURIComponent("id=5")
        );
      });

      it("should not strip query params for non-matching domains", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://other-domain.com/page?foo=bar&id=5";
        conf.params.stripQueryParamsForDomains = ["publisher.works"];

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should contain the full URL with query params").to.include(
          encodeURIComponent("https://other-domain.com/page?foo=bar&id=5")
        );
      });

      it("should handle subdomain matching correctly", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://sub.publisher.works/page?tracking=123";
        conf.params.stripQueryParamsForDomains = ["publisher.works"];

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should strip params for subdomain").to.include(
          encodeURIComponent("https://sub.publisher.works/page")
        );
        expect(request.url, "The request URL should not contain tracking param").to.not.include(
          encodeURIComponent("tracking=123")
        );
      });
    });

    describe("when stripQueryParams is enabled", function () {
      it("should strip only specified query parameters", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?utm_source=test&utm_campaign=example&id=5";
        conf.params.stripQueryParams = ["utm_source", "utm_campaign"];

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should contain the id param").to.include(
          encodeURIComponent("id=5")
        );
        expect(request.url, "The request URL should not contain utm_source").to.not.include(
          encodeURIComponent("utm_source")
        );
        expect(request.url, "The request URL should not contain utm_campaign").to.not.include(
          encodeURIComponent("utm_campaign")
        );
      });

      it("should handle stripping params that result in no query string", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?utm_source=test";
        conf.params.stripQueryParams = ["utm_source"];

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should not contain a query string").to.include(
          encodeURIComponent("https://publisher.works/article.php")
        );
        expect(request.url, "The request URL should not contain utm_source").to.not.include(
          encodeURIComponent("utm_source")
        );
      });

      it("should leave URL unchanged if specified params do not exist", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        const originalUrl = "https://publisher.works/article.php?id=5";
        conf.params.websiteToAnalyseUrl = originalUrl;
        conf.params.stripQueryParams = ["utm_source", "nonexistent"];

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should contain the original URL").to.include(
          encodeURIComponent(originalUrl)
        );
      });
    });

    describe("when no stripping options are provided", function () {
      it("should send the URL with all query parameters intact", function () {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        const originalUrl = "https://publisher.works/article.php?get=horrible_url_for_testing&id=5";
        conf.params.websiteToAnalyseUrl = originalUrl;

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];

        expect(request.url, "The request URL should contain the full original URL").to.include(
          encodeURIComponent(originalUrl)
        );
      });
    });
  });
});
