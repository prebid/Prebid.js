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

  // NEW TESTS START HERE
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
});
