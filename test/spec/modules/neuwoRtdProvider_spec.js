import * as neuwo from "modules/neuwoRtdProvider";
import { server } from "test/mocks/xhr.js";

const NEUWO_API_URL = "https://edge.neuwo.ai/api/aitopics/edge/v1/iab";
const NEUWO_API_TOKEN = "token";
const IAB_CONTENT_TAXONOMY_VERSION = "2.2";

// API config
const config = () => ({
  params: {
    neuwoApiUrl: NEUWO_API_URL,
    neuwoApiToken: NEUWO_API_TOKEN,
    iabContentTaxonomyVersion: IAB_CONTENT_TAXONOMY_VERSION,
  },
});

/**
 * API Response Mock
 * Returns new format with segtax-based structure
 * Field names: id, name, relevance (lowercase)
 * Structure: { "6": { "1": [...], "2": [...] }, "4": { "3": [...] } }
 */
function getNeuwoApiResponse() {
  return {
    7: {
      1: [
        {
          id: "80DV8O",
        },
        {
          id: "52",
        },
        {
          id: "432",
        },
      ],
      2: [
        {
          id: "90",
        },
      ],
      3: [
        {
          id: "106",
        },
      ],
    },
    1: {
      1: [
        {
          id: "IAB12",
        },
      ],
    },
    6: {
      1: [
        {
          id: "52",
        },
      ],
      2: [
        {
          id: "90",
        },
        {
          id: "434",
        },
      ],
      3: [
        {
          id: "106",
        },
      ],
    },
    4: {
      3: [
        {
          id: "49",
        },
        {
          id: "780",
        },
      ],
      4: [
        {
          id: "431",
        },
        {
          id: "196",
        },
        {
          id: "197",
        },
      ],
      5: [
        {
          id: "98",
        },
      ],
    },
  };
}

// ============================================================================
// V1 API Constants and Mocks
// ============================================================================

const NEUWO_API_URL_V1 = "https://api.url.neuwo.ai/edge/GetAiTopics";
const IAB_CONTENT_TAXONOMY_VERSION_V1 = "3.0";

// Legacy V1 API config (for backward compatibility tests)
const configV1 = () => ({
  params: {
    neuwoApiUrl: NEUWO_API_URL_V1,
    neuwoApiToken: NEUWO_API_TOKEN,
    iabContentTaxonomyVersion: IAB_CONTENT_TAXONOMY_VERSION_V1,
  },
});

/**
 * V1 API Response Mock
 * Returns legacy format with marketing_categories structure
 * Field names: ID, label, relevance (capital letters)
 */
function getNeuwoApiResponseV1() {
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
    it("should correctly build the data object for content tiers", function () {
      // format with tier keys "1", "2", "3"
      const tierData = {
        "1": [{ id: "274", name: "Home & Garden", relevance: "0.47" }],
        "2": [{ id: "216", name: "Cooking", relevance: "0.41" }],
        "3": [],
      };
      const segtax = 0;
      const result = neuwo.buildIabData(tierData, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [
          { id: "274" },
          { id: "216" },
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
      // format with tier keys "3", "4", "5" for audience
      const tierData = {
        "3": [{ id: "49", name: "Demographic | Gender | Female |", relevance: "0.9923" }],
        "4": [{ id: "127", name: "Demographic | Household Data | 1 Child |", relevance: "0.9673" }],
        "5": [{ id: "98", name: "Demographic | Household Data | Parents with Children |", relevance: "0.9066" }],
      };
      const segtax = 0;
      const result = neuwo.buildIabData(tierData, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [
          { id: "49" },
          { id: "127" },
          { id: "98" },
        ],
        ext: {
          segtax,
        },
      };
      expect(result, "should aggregate segments from all specified audience tiers").to.deep.equal(
        expected
      );
    });

    it("should return an empty segment array when tierData is null or undefined", function () {
      const segtax = 4;
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [],
        ext: {
          segtax,
        },
      };
      expect(
        neuwo.buildIabData(null, segtax),
        "should handle null tierData gracefully"
      ).to.deep.equal(expected);
      expect(
        neuwo.buildIabData(undefined, segtax),
        "should handle undefined tierData gracefully"
      ).to.deep.equal(expected);
    });

    it("should return an empty segment array when tierData is empty", function () {
      const tierData = {};
      const segtax = 4;
      const result = neuwo.buildIabData(tierData, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [],
        ext: {
          segtax,
        },
      };
      expect(result, "should handle an empty tierData object").to.deep.equal(expected);
    });

    it("should gracefully handle if a tier key contains a non-array value", function () {
      const tierData = {
        "1": { id: "274", name: "Home & Garden" }, // Not an array
        "2": [{ id: "216", name: "Cooking", relevance: "0.41" }],
      };

      const segtax = 4;
      const result = neuwo.buildIabData(tierData, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        // The segment should only contain data from the valid tier "2"
        segment: [
          {
            id: "216",
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
      // Tier "1" with various malformed objects
      const tierData = {
        "1": [
          { id: "274", name: "Valid Object" },
          { name: "Another Label" }, // Missing 'id' property
          null, // A null value
          "just-a-string", // A string primitive
          {}, // An empty object
        ],
        "2": [{ id: "216", name: "Cooking", relevance: "0.41" }],
      };

      const segtax = 4;
      const result = neuwo.buildIabData(tierData, segtax);
      const expected = {
        name: neuwo.DATA_PROVIDER,
        // The segment should contain the one valid object from tier "1" and the data from tier "2"
        segment: [
          {
            id: "274",
          },
          {
            id: "216",
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

    it("should return an empty segment array if the entire tierData is not a valid object", function () {
      const segtax = 4;
      const expected = {
        name: neuwo.DATA_PROVIDER,
        segment: [],
        ext: { segtax },
      };
      // Test with a string
      const resultString = neuwo.buildIabData("incorrect format", segtax);
      expect(resultString, "should handle non-object tierData input").to.deep.equal(
        expected
      );
    });
  });

  describe("buildFilterQueryParams", function () {
    it("should return empty array when no filters provided", function () {
      const result = neuwo.buildFilterQueryParams(null, 6);
      expect(result, "should return empty array for null filters").to.deep.equal([]);
    });

    it("should return empty array when filters parameter is undefined", function () {
      const result = neuwo.buildFilterQueryParams(undefined, 6);
      expect(result, "should return empty array for undefined filters").to.deep.equal([]);
    });

    it("should return empty array when filters is empty object", function () {
      const result = neuwo.buildFilterQueryParams({}, 6);
      expect(result, "should return empty array for empty filters").to.deep.equal([]);
    });

    it("should convert ContentTier1 filter correctly", function () {
      const filters = {
        ContentTier1: { limit: 3, threshold: 0.5 }
      };
      const contentSegtax = 6;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_6_1_limit=3");
      expect(result).to.include("filter_6_1_threshold=0.5");
      expect(result).to.have.lengthOf(2);
    });

    it("should convert ContentTier2 filter correctly", function () {
      const filters = {
        ContentTier2: { limit: 5, threshold: 0.6 }
      };
      const contentSegtax = 7;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_7_2_limit=5");
      expect(result).to.include("filter_7_2_threshold=0.6");
      expect(result).to.have.lengthOf(2);
    });

    it("should convert ContentTier3 filter correctly", function () {
      const filters = {
        ContentTier3: { limit: 4, threshold: 0.8 }
      };
      const contentSegtax = 6;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_6_3_limit=4");
      expect(result).to.include("filter_6_3_threshold=0.8");
      expect(result).to.have.lengthOf(2);
    });

    it("should convert AudienceTier3 filter correctly", function () {
      const filters = {
        AudienceTier3: { limit: 2, threshold: 0.9 }
      };
      const contentSegtax = 6;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_4_3_limit=2");
      expect(result).to.include("filter_4_3_threshold=0.9");
      expect(result).to.have.lengthOf(2);
    });

    it("should convert AudienceTier4 filter correctly", function () {
      const filters = {
        AudienceTier4: { limit: 10, threshold: 0.85 }
      };
      const contentSegtax = 6;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_4_4_limit=10");
      expect(result).to.include("filter_4_4_threshold=0.85");
      expect(result).to.have.lengthOf(2);
    });

    it("should convert AudienceTier5 filter correctly", function () {
      const filters = {
        AudienceTier5: { limit: 7, threshold: 0.95 }
      };
      const contentSegtax = 6;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_4_5_limit=7");
      expect(result).to.include("filter_4_5_threshold=0.95");
      expect(result).to.have.lengthOf(2);
    });

    it("should handle multiple content tiers with same segtax", function () {
      const filters = {
        ContentTier1: { limit: 3 },
        ContentTier2: { limit: 5 },
        ContentTier3: { threshold: 0.7 }
      };
      const contentSegtax = 6;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_6_1_limit=3");
      expect(result).to.include("filter_6_2_limit=5");
      expect(result).to.include("filter_6_3_threshold=0.7");
      expect(result).to.have.lengthOf(3);
    });

    it("should handle multiple audience tiers", function () {
      const filters = {
        AudienceTier3: { limit: 2 },
        AudienceTier4: { limit: 4 },
        AudienceTier5: { threshold: 0.85 }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_4_3_limit=2");
      expect(result).to.include("filter_4_4_limit=4");
      expect(result).to.include("filter_4_5_threshold=0.85");
      expect(result).to.have.lengthOf(3);
    });

    it("should handle both content and audience tiers together", function () {
      const filters = {
        ContentTier1: { limit: 3, threshold: 0.5 },
        ContentTier2: { limit: 5 },
        AudienceTier3: { limit: 2, threshold: 0.9 },
        AudienceTier4: { threshold: 0.8 }
      };
      const contentSegtax = 6;
      const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

      expect(result).to.include("filter_6_1_limit=3");
      expect(result).to.include("filter_6_1_threshold=0.5");
      expect(result).to.include("filter_6_2_limit=5");
      expect(result).to.include("filter_4_3_limit=2");
      expect(result).to.include("filter_4_3_threshold=0.9");
      expect(result).to.include("filter_4_4_threshold=0.8");
      expect(result).to.have.lengthOf(6);
    });

    it("should use different content segtax values correctly", function () {
      const filters = {
        ContentTier1: { limit: 3 }
      };

      // Test with segtax 6 (IAB 2.2)
      const result6 = neuwo.buildFilterQueryParams(filters, 6, false);
      expect(result6).to.include("filter_6_1_limit=3");
      expect(result6).to.not.include("filter_7_1_limit=3");

      // Test with segtax 7 (IAB 3.0)
      const result7 = neuwo.buildFilterQueryParams(filters, 7, false);
      expect(result7).to.include("filter_7_1_limit=3");
      expect(result7).to.not.include("filter_6_1_limit=3");
    });

    it("should ignore unknown tier names", function () {
      const filters = {
        ContentTier1: { limit: 3 },
        UnknownTier: { limit: 10 },
        InvalidTier99: { threshold: 0.5 }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_6_1_limit=3");
      expect(result).to.have.lengthOf(1);
    });

    it("should handle filters with only limit property", function () {
      const filters = {
        ContentTier1: { limit: 5 }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_6_1_limit=5");
      expect(result).to.not.include.match(/filter_6_1_threshold/);
      expect(result).to.have.lengthOf(1);
    });

    it("should handle filters with only threshold property", function () {
      const filters = {
        AudienceTier3: { threshold: 0.75 }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_4_3_threshold=0.75");
      expect(result).to.not.include.match(/filter_4_3_limit/);
      expect(result).to.have.lengthOf(1);
    });

    it("should handle filters with additional custom properties", function () {
      const filters = {
        ContentTier1: { limit: 3, threshold: 0.5, customProp: "value" }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_6_1_limit=3");
      expect(result).to.include("filter_6_1_threshold=0.5");
      expect(result).to.include("filter_6_1_customProp=value");
      expect(result).to.have.lengthOf(3);
    });

    it("should handle empty filter objects for tiers", function () {
      const filters = {
        ContentTier1: {},
        AudienceTier3: {}
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.have.lengthOf(0);
    });

    it("should not include null limit value", function () {
      const filters = {
        ContentTier1: { limit: null, threshold: 0.5 }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_6_1_threshold=0.5");
      expect(result).to.have.lengthOf(1);
    });

    it("should not include undefined limit value", function () {
      const filters = {
        ContentTier1: { limit: undefined, threshold: 0.5 }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_6_1_threshold=0.5");
      expect(result).to.have.lengthOf(1);
    });

    it("should not include null threshold value", function () {
      const filters = {
        AudienceTier3: { limit: 5, threshold: null }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_4_3_limit=5");
      expect(result).to.have.lengthOf(1);
    });

    it("should not include undefined threshold value", function () {
      const filters = {
        AudienceTier3: { limit: 5, threshold: undefined }
      };
      const result = neuwo.buildFilterQueryParams(filters, 6, false);

      expect(result).to.include("filter_4_3_limit=5");
      expect(result).to.have.lengthOf(1);
    });

    // OpenRTB 2.5 Feature Tests
    describe("with enableOrtb25Fields enabled (default)", function () {
      it("should add IAB 1.0 filter params when ContentTier1 filter is provided", function () {
        const filters = {
          ContentTier1: { limit: 3, threshold: 0.5 }
        };
        const contentSegtax = 6;
        const result = neuwo.buildFilterQueryParams(filters, contentSegtax);

        expect(result).to.include("filter_6_1_limit=3");
        expect(result).to.include("filter_6_1_threshold=0.5");
        expect(result).to.include("filter_1_1_limit=3");
        expect(result).to.include("filter_1_1_threshold=0.5");
        expect(result).to.have.lengthOf(4);
      });

      it("should add IAB 1.0 filter params when ContentTier2 filter is provided", function () {
        const filters = {
          ContentTier2: { limit: 5, threshold: 0.6 }
        };
        const contentSegtax = 6;
        const result = neuwo.buildFilterQueryParams(filters, contentSegtax);

        expect(result).to.include("filter_6_2_limit=5");
        expect(result).to.include("filter_6_2_threshold=0.6");
        expect(result).to.include("filter_1_2_limit=5");
        expect(result).to.include("filter_1_2_threshold=0.6");
        expect(result).to.have.lengthOf(4);
      });

      it("should add IAB 1.0 filter params for both ContentTier1 and ContentTier2", function () {
        const filters = {
          ContentTier1: { limit: 3 },
          ContentTier2: { limit: 5 }
        };
        const contentSegtax = 6;
        const result = neuwo.buildFilterQueryParams(filters, contentSegtax);

        expect(result).to.include("filter_6_1_limit=3");
        expect(result).to.include("filter_6_2_limit=5");
        expect(result).to.include("filter_1_1_limit=3");
        expect(result).to.include("filter_1_2_limit=5");
        expect(result).to.have.lengthOf(4);
      });

      it("should NOT add ContentTier3 filter to IAB 1.0 (only tiers 1-2 exist)", function () {
        const filters = {
          ContentTier1: { limit: 3 },
          ContentTier2: { limit: 5 },
          ContentTier3: { threshold: 0.7 }
        };
        const contentSegtax = 6;
        const result = neuwo.buildFilterQueryParams(filters, contentSegtax);

        expect(result).to.include("filter_6_1_limit=3");
        expect(result).to.include("filter_6_2_limit=5");
        expect(result).to.include("filter_6_3_threshold=0.7");
        expect(result).to.include("filter_1_1_limit=3");
        expect(result).to.include("filter_1_2_limit=5");
        expect(result).to.not.include.match(/filter_1_3/);
        expect(result).to.have.lengthOf(5);
      });

      it("should NOT add audience tier filters to IAB 1.0", function () {
        const filters = {
          AudienceTier3: { limit: 2 },
          AudienceTier4: { limit: 4 }
        };
        const result = neuwo.buildFilterQueryParams(filters, 6);

        expect(result).to.include("filter_4_3_limit=2");
        expect(result).to.include("filter_4_4_limit=4");
        expect(result).to.not.include.match(/filter_1/);
        expect(result).to.have.lengthOf(2);
      });

      it("should add IAB 1.0 filter params alongside audience filters", function () {
        const filters = {
          ContentTier1: { limit: 3 },
          AudienceTier3: { limit: 2 }
        };
        const contentSegtax = 6;
        const result = neuwo.buildFilterQueryParams(filters, contentSegtax);

        expect(result).to.include("filter_6_1_limit=3");
        expect(result).to.include("filter_1_1_limit=3");
        expect(result).to.include("filter_4_3_limit=2");
        expect(result).to.have.lengthOf(3);
      });

      it("should not add segtax 1 params when no content filters are provided", function () {
        const filters = {
          AudienceTier3: { limit: 2 }
        };
        const result = neuwo.buildFilterQueryParams(filters, 6);

        expect(result).to.include("filter_4_3_limit=2");
        expect(result).to.not.include.match(/filter_1/);
        expect(result).to.have.lengthOf(1);
      });

      it("should not add segtax 1 params when filters is empty", function () {
        const result = neuwo.buildFilterQueryParams({}, 6);

        expect(result).to.deep.equal([]);
      });

      it("should not add segtax 1 params when filters is null", function () {
        const result = neuwo.buildFilterQueryParams(null, 6);

        expect(result).to.deep.equal([]);
      });

      it("should work with different content segtax values", function () {
        const filters = {
          ContentTier1: { limit: 3 }
        };

        // Test with segtax 7 (IAB 3.0)
        const result7 = neuwo.buildFilterQueryParams(filters, 7);
        expect(result7).to.include("filter_7_1_limit=3");
        expect(result7).to.include("filter_1_1_limit=3");
        expect(result7).to.have.lengthOf(2);
      });
    });

    describe("with enableOrtb25Fields disabled", function () {
      it("should not add IAB 1.0 filter params when disabled", function () {
        const filters = {
          ContentTier1: { limit: 3, threshold: 0.5 },
          ContentTier2: { limit: 5 }
        };
        const contentSegtax = 6;
        const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

        expect(result).to.include("filter_6_1_limit=3");
        expect(result).to.include("filter_6_1_threshold=0.5");
        expect(result).to.include("filter_6_2_limit=5");
        expect(result).to.not.include.match(/filter_1/);
        expect(result).to.have.lengthOf(3);
      });

      it("should work correctly with all tier types when disabled", function () {
        const filters = {
          ContentTier1: { limit: 3 },
          ContentTier2: { limit: 5 },
          ContentTier3: { threshold: 0.7 },
          AudienceTier3: { limit: 2 }
        };
        const contentSegtax = 6;
        const result = neuwo.buildFilterQueryParams(filters, contentSegtax, false);

        expect(result).to.include("filter_6_1_limit=3");
        expect(result).to.include("filter_6_2_limit=5");
        expect(result).to.include("filter_6_3_threshold=0.7");
        expect(result).to.include("filter_4_3_limit=2");
        expect(result).to.not.include.match(/filter_1/);
        expect(result).to.have.lengthOf(4);
      });
    });
  });

  describe("extractCategoryIds", function () {
    it("should extract IDs from single tier", function () {
      const tierData = {
        "1": [
          { id: "IAB12" },
          { id: "IAB12-3" }
        ]
      };
      const result = neuwo.extractCategoryIds(tierData);
      expect(result, "should extract all IDs from tier 1").to.deep.equal(["IAB12", "IAB12-3"]);
    });

    it("should extract IDs from multiple tiers", function () {
      const tierData = {
        "1": [
          { id: "IAB12" },
          { id: "IAB12-3" }
        ],
        "2": [
          { id: "IAB12-5" }
        ]
      };
      const result = neuwo.extractCategoryIds(tierData);
      expect(result, "should extract all IDs from all tiers").to.deep.equal(["IAB12", "IAB12-3", "IAB12-5"]);
    });

    it("should handle empty tier arrays", function () {
      const tierData = {
        "1": [],
        "2": [
          { id: "IAB12" }
        ]
      };
      const result = neuwo.extractCategoryIds(tierData);
      expect(result, "should only extract from non-empty tiers").to.deep.equal(["IAB12"]);
    });

    it("should skip items without id property", function () {
      const tierData = {
        "1": [
          { id: "IAB12" },
          { name: "No ID" },
          { id: "IAB12-3" }
        ]
      };
      const result = neuwo.extractCategoryIds(tierData);
      expect(result, "should skip items without id").to.deep.equal(["IAB12", "IAB12-3"]);
    });

    it("should return empty array for null tierData", function () {
      const result = neuwo.extractCategoryIds(null);
      expect(result, "should return empty array for null").to.deep.equal([]);
    });

    it("should return empty array for undefined tierData", function () {
      const result = neuwo.extractCategoryIds(undefined);
      expect(result, "should return empty array for undefined").to.deep.equal([]);
    });

    it("should return empty array for empty object", function () {
      const result = neuwo.extractCategoryIds({});
      expect(result, "should return empty array for empty object").to.deep.equal([]);
    });

    it("should handle non-array tier values", function () {
      const tierData = {
        "1": { id: "IAB12" }, // Not an array
        "2": [
          { id: "IAB13" }
        ]
      };
      const result = neuwo.extractCategoryIds(tierData);
      expect(result, "should skip non-array values").to.deep.equal(["IAB13"]);
    });

    it("should handle null items in tier arrays", function () {
      const tierData = {
        "1": [
          { id: "IAB12" },
          null,
          { id: "IAB12-3" }
        ]
      };
      const result = neuwo.extractCategoryIds(tierData);
      expect(result, "should skip null items").to.deep.equal(["IAB12", "IAB12-3"]);
    });

    it("should handle non-object tierData", function () {
      expect(neuwo.extractCategoryIds("string"), "should handle string").to.deep.equal([]);
      expect(neuwo.extractCategoryIds(123), "should handle number").to.deep.equal([]);
      expect(neuwo.extractCategoryIds([]), "should handle array").to.deep.equal([]);
    });

    it("should extract from all tier numbers", function () {
      const tierData = {
        "1": [{ id: "IAB1" }],
        "2": [{ id: "IAB2" }],
        "3": [{ id: "IAB3" }],
        "4": [{ id: "IAB4" }],
        "5": [{ id: "IAB5" }]
      };
      const result = neuwo.extractCategoryIds(tierData);
      expect(result, "should extract from all tiers").to.deep.equal(["IAB1", "IAB2", "IAB3", "IAB4", "IAB5"]);
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

  describe("injectIabCategories", function () {
    it("should not inject data when responseParsed is null or undefined", function () {
      const bidsConfig1 = bidsConfiglike();
      const bidsConfig2 = bidsConfiglike();
      const bidsConfigCopy = JSON.parse(JSON.stringify(bidsConfig1));

      neuwo.injectIabCategories(null, bidsConfig1, "2.2");
      neuwo.injectIabCategories(undefined, bidsConfig2, "2.2");

      expect(
        bidsConfig1.ortb2Fragments.global,
        "should not modify ortb2Fragments when response is null"
      ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
      expect(
        bidsConfig2.ortb2Fragments.global,
        "should not modify ortb2Fragments when response is undefined"
      ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
    });

    it("should not inject data when responseParsed is not an object", function () {
      const bidsConfig1 = bidsConfiglike();
      const bidsConfig2 = bidsConfiglike();
      const bidsConfig3 = bidsConfiglike();
      const bidsConfigCopy = JSON.parse(JSON.stringify(bidsConfig1));

      neuwo.injectIabCategories("invalid string", bidsConfig1, "2.2");
      neuwo.injectIabCategories(123, bidsConfig2, "2.2");
      neuwo.injectIabCategories([1, 2, 3], bidsConfig3, "2.2");

      expect(
        bidsConfig1.ortb2Fragments.global,
        "should not modify ortb2Fragments when response is a string"
      ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
      expect(
        bidsConfig2.ortb2Fragments.global,
        "should not modify ortb2Fragments when response is a number"
      ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
      expect(
        bidsConfig3.ortb2Fragments.global,
        "should not modify ortb2Fragments when response is an array"
      ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
    });

    it("should handle empty object response", function () {
      const bidsConfig = bidsConfiglike();
      const bidsConfigCopy = JSON.parse(JSON.stringify(bidsConfig));

      neuwo.injectIabCategories({}, bidsConfig, "2.2");

      expect(
        bidsConfig.ortb2Fragments.global,
        "should not inject data when response object is empty"
      ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
    });

    it("should inject content data when valid content segments exist", function () {
      const response = {
        "6": {
          "1": [{ id: "52", name: "Food & Drink" }],
          "2": [{ id: "90", name: "Cooking" }]
        }
      };
      const bidsConfig = bidsConfiglike();

      neuwo.injectIabCategories(response, bidsConfig, "2.2");

      const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
      expect(contentData, "should have content data").to.exist;
      expect(contentData.ext.segtax, "should have correct segtax").to.equal(6);
      expect(contentData.segment, "should have segments").to.have.lengthOf(2);
      expect(contentData.segment[0].id, "first segment should match").to.equal("52");
    });

    it("should inject audience data when valid audience segments exist", function () {
      const response = {
        "4": {
          "3": [{ id: "49", name: "Female" }],
          "4": [{ id: "431", name: "Age 25-34" }]
        }
      };
      const bidsConfig = bidsConfiglike();

      neuwo.injectIabCategories(response, bidsConfig, "2.2");

      const userData = bidsConfig.ortb2Fragments.global?.user?.data?.[0];
      expect(userData, "should have user data").to.exist;
      expect(userData.ext.segtax, "should have correct segtax").to.equal(4);
      expect(userData.segment, "should have segments").to.have.lengthOf(2);
      expect(userData.segment[0].id, "first segment should match").to.equal("49");
    });

    it("should inject both content and audience data when both exist", function () {
      const response = {
        "6": {
          "1": [{ id: "52", name: "Food & Drink" }]
        },
        "4": {
          "3": [{ id: "49", name: "Female" }]
        }
      };
      const bidsConfig = bidsConfiglike();

      neuwo.injectIabCategories(response, bidsConfig, "2.2");

      const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
      const userData = bidsConfig.ortb2Fragments.global?.user?.data?.[0];

      expect(contentData, "should have content data").to.exist;
      expect(userData, "should have user data").to.exist;
      expect(contentData.ext.segtax, "content should have segtax 6").to.equal(6);
      expect(userData.ext.segtax, "audience should have segtax 4").to.equal(4);
    });

    it("should handle different IAB Content Taxonomy versions", function () {
      const response = {
        "7": {
          "1": [{ id: "80DV8O", name: "Automotive" }]
        }
      };
      const bidsConfig = bidsConfiglike();

      neuwo.injectIabCategories(response, bidsConfig, "3.0");

      const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
      expect(contentData, "should have content data").to.exist;
      expect(contentData.ext.segtax, "should use segtax 7 for IAB 3.0").to.equal(7);
    });

    it("should not inject data when segtax has no segments", function () {
      const response1 = { "6": {} };
      const response2 = { "4": {} };
      const response3 = { "6": { "1": [] }, "4": { "3": [] } };
      const bidsConfig1 = bidsConfiglike();
      const bidsConfig2 = bidsConfiglike();
      const bidsConfig3 = bidsConfiglike();

      neuwo.injectIabCategories(response1, bidsConfig1, "2.2");
      neuwo.injectIabCategories(response2, bidsConfig2, "2.2");
      neuwo.injectIabCategories(response3, bidsConfig3, "2.2");

      expect(bidsConfig1.ortb2Fragments.global?.site?.content?.data, "should not inject empty content data").to.be.undefined;
      expect(bidsConfig2.ortb2Fragments.global?.user?.data, "should not inject empty audience data").to.be.undefined;
      expect(bidsConfig3.ortb2Fragments.global?.site?.content?.data, "should not inject content data with empty segments").to.be.undefined;
      expect(bidsConfig3.ortb2Fragments.global?.user?.data, "should not inject audience data with empty segments").to.be.undefined;
    });

    it("should use default taxonomy version when invalid version provided", function () {
      const response = {
        "6": {
          "1": [{ id: "52", name: "Food & Drink" }]
        }
      };
      const bidsConfig = bidsConfiglike();

      neuwo.injectIabCategories(response, bidsConfig, "invalid-version");

      const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
      expect(contentData, "should have content data").to.exist;
      expect(contentData.ext.segtax, "should default to segtax 6 (IAB 2.2)").to.equal(6);
    });

    // OpenRTB 2.5 Category Fields Tests
    describe("OpenRTB 2.5 category fields", function () {
      describe("with enableOrtb25Fields enabled (default)", function () {
        it("should inject category fields when IAB 1.0 data exists", function () {
          const response = {
            "1": {
              "1": [{ id: "IAB12" }],
              "2": [{ id: "IAB12-3" }, { id: "IAB12-5" }]
            },
            "6": {
              "1": [{ id: "52" }]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          const siteSectioncat = bidsConfig.ortb2Fragments.global?.site?.sectioncat;
          const sitePagecat = bidsConfig.ortb2Fragments.global?.site?.pagecat;
          const contentCat = bidsConfig.ortb2Fragments.global?.site?.content?.cat;

          expect(siteCat, "should have site.cat").to.deep.equal(["IAB12", "IAB12-3", "IAB12-5"]);
          expect(siteSectioncat, "should have site.sectioncat").to.deep.equal(["IAB12", "IAB12-3", "IAB12-5"]);
          expect(sitePagecat, "should have site.pagecat").to.deep.equal(["IAB12", "IAB12-3", "IAB12-5"]);
          expect(contentCat, "should have site.content.cat").to.deep.equal(["IAB12", "IAB12-3", "IAB12-5"]);
        });

        it("should inject category fields with single IAB 1.0 segment", function () {
          const response = {
            "1": {
              "1": [{ id: "IAB12" }]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          expect(siteCat, "should have single category").to.deep.equal(["IAB12"]);
        });

        it("should not inject category fields when IAB 1.0 data is missing", function () {
          const response = {
            "6": {
              "1": [{ id: "52" }]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          const siteSectioncat = bidsConfig.ortb2Fragments.global?.site?.sectioncat;

          expect(siteCat, "should not have site.cat").to.be.undefined;
          expect(siteSectioncat, "should not have site.sectioncat").to.be.undefined;
        });

        it("should not inject category fields when IAB 1.0 data is empty", function () {
          const response = {
            "1": {},
            "6": {
              "1": [{ id: "52" }]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          expect(siteCat, "should not have site.cat with empty IAB 1.0").to.be.undefined;
        });

        it("should not inject category fields when IAB 1.0 tiers are empty arrays", function () {
          const response = {
            "1": {
              "1": [],
              "2": []
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          expect(siteCat, "should not have site.cat with empty tier arrays").to.be.undefined;
        });

        it("should handle IAB 1.0 data with malformed items", function () {
          const response = {
            "1": {
              "1": [
                { id: "IAB12" },
                { name: "No ID" },
                null,
                { id: "IAB12-3" }
              ]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          expect(siteCat, "should skip malformed items").to.deep.equal(["IAB12", "IAB12-3"]);
        });

        it("should inject both content data and category fields", function () {
          const response = {
            "1": {
              "1": [{ id: "IAB12" }]
            },
            "6": {
              "1": [{ id: "52", name: "Food & Drink" }]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;

          expect(contentData, "should have content data").to.exist;
          expect(contentData.ext.segtax, "should have segtax 6").to.equal(6);
          expect(siteCat, "should have category fields").to.deep.equal(["IAB12"]);
        });

        it("should merge category fields with existing data", function () {
          const response = {
            "1": {
              "1": [{ id: "IAB12" }]
            }
          };
          const bidsConfig = bidsConfiglike();
          // Pre-populate with existing category data
          bidsConfig.ortb2Fragments.global = {
            site: {
              cat: ["EXISTING1"]
            }
          };

          neuwo.injectIabCategories(response, bidsConfig, "2.2");

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          // mergeDeep should deduplicate and merge arrays
          expect(siteCat, "should merge with existing data").to.include("IAB12");
          expect(siteCat, "should preserve existing data").to.include("EXISTING1");
        });
      });

      describe("with enableOrtb25Fields disabled", function () {
        it("should not inject category fields when disabled", function () {
          const response = {
            "1": {
              "1": [{ id: "IAB12" }],
              "2": [{ id: "IAB12-3" }]
            },
            "6": {
              "1": [{ id: "52" }]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2", false);

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          const siteSectioncat = bidsConfig.ortb2Fragments.global?.site?.sectioncat;
          const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];

          expect(siteCat, "should not have site.cat").to.be.undefined;
          expect(siteSectioncat, "should not have site.sectioncat").to.be.undefined;
          expect(contentData, "should still have content data (segtax 6)").to.exist;
        });

        it("should inject content data but not category fields when disabled", function () {
          const response = {
            "1": {
              "1": [{ id: "IAB12" }]
            },
            "6": {
              "1": [{ id: "52", name: "Food & Drink" }]
            }
          };
          const bidsConfig = bidsConfiglike();

          neuwo.injectIabCategories(response, bidsConfig, "2.2", false);

          const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;

          expect(contentData, "should have content data").to.exist;
          expect(contentData.ext.segtax).to.equal(6);
          expect(siteCat, "should not have category fields").to.be.undefined;
        });
      });
    });
  });

  describe("getBidRequestData", function () {
    describe("when using IAB Content Taxonomy 2.2 (API default)", function () {
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
        expect(request.url, "The request URL should include the product identifier").to.include(
          "_neuwo_prod=PrebidModule"
        );
        expect(request.url, "API should include iabVersions parameter for segtax 6").to.include(
          "iabVersions=6"
        );
        expect(request.url, "PI should include iabVersions parameter for segtax 4").to.include(
          "iabVersions=4"
        );
        expect(request.method, "API should use GET method").to.equal("GET");

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
        ).to.equal(apiResponse["6"]["1"][0].id);
        expect(
          contentData.segment[1].id,
          "The second segment ID should match the API response"
        ).to.equal(apiResponse["6"]["2"][0].id);
      });
    });

    describe("when using IAB Content Taxonomy 1.0", function () {
      it("should correctly structure the bids object after a successful API response", function () {
        const apiResponse = {
          1: { 1: [{ id: "IAB1" }], 2: [{ id: "IAB1-1" }], 3: [{ id: "IAB1-1-1" }] },
          4: { 3: [{ id: "49" }, { id: "780" }], 4: [{ id: "431" }], 5: [{ id: "98" }] },
        };
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.iabContentTaxonomyVersion = "1.0";
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
        expect(request.url, "The request URL should include the product identifier").to.include(
          "_neuwo_prod=PrebidModule"
        );
        expect(request.url, "API should include iabVersions parameter for segtax 1").to.include(
          "iabVersions=1"
        );
        expect(request.url, "API should include iabVersions parameter for segtax 4").to.include(
          "iabVersions=4"
        );
        expect(request.method, "API should use GET method").to.equal("GET");

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
          "The segtax value should correspond to IAB Content Taxonomy 1.0"
        ).to.equal(1);
        expect(
          contentData.segment[0].id,
          "The first segment ID should match the API response"
        ).to.equal(apiResponse["1"]["1"][0].id);
        expect(
          contentData.segment[1].id,
          "The second segment ID should match the API response"
        ).to.equal(apiResponse["1"]["2"][0].id);
      });
    });

    describe("when using IAB Content Taxonomy 3.0", function () {
      it("should correctly structure the bids object after a successful API response", function () {
        const apiResponse = {
          7: { 1: [{ id: "80DV8O" }], 2: [{ id: "90" }], 3: [{ id: "106" }] },
          4: { 3: [{ id: "49" }, { id: "780" }], 4: [{ id: "431" }], 5: [{ id: "98" }] },
        };
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.iabContentTaxonomyVersion = "3.0";
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
        expect(request.url, "The request URL should include the product identifier").to.include(
          "_neuwo_prod=PrebidModule"
        );
        expect(request.url, "API should include iabVersions parameter for segtax 7").to.include(
          "iabVersions=7"
        );
        expect(request.url, "API should include iabVersions parameter for segtax 4").to.include(
          "iabVersions=4"
        );
        expect(request.method, "API should use GET method").to.equal("GET");

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
        ).to.equal(apiResponse["7"]["1"][0].id);
        expect(
          contentData.segment[1].id,
          "The second segment ID should match the API response"
        ).to.equal(apiResponse["7"]["2"][0].id);
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
        expect(request.method, "API should use GET method").to.equal("GET");

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
          "The first segment ID should match the API response (tier 3, first item)"
        ).to.equal(apiResponse["4"]["3"][0].id);
        expect(
          userData.segment[1].id,
          "The second segment ID should match the API response (tier 3, second item)"
        ).to.equal(apiResponse["4"]["3"][1].id);
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

    // OpenRTB 2.5 Feature Tests
    describe("OpenRTB 2.5 category fields", function () {
      describe("with enableOrtb25Fields enabled (default)", function () {
        it("should include iabVersions=1 parameter in API request", function () {
          const bidsConfig = bidsConfiglike();
          const conf = config();
          conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=5";

          neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
          const request = server.requests[0];

          expect(request.url, "should include iabVersions=1").to.include("iabVersions=1");
          expect(request.url, "should include iabVersions=6").to.include("iabVersions=6");
          expect(request.url, "should include iabVersions=4").to.include("iabVersions=4");
        });

        it("should inject category fields when API returns IAB 1.0 data", function () {
          const apiResponse = {
            "1": {
              "1": [{ id: "IAB12" }],
              "2": [{ id: "IAB12-3" }]
            },
            "6": {
              "1": [{ id: "52" }]
            },
            "4": {
              "3": [{ id: "49" }]
            }
          };
          const bidsConfig = bidsConfiglike();
          const conf = config();
          conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=5";

          neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
          const request = server.requests[0];
          request.respond(
            200,
            { "Content-Type": "application/json; encoding=UTF-8" },
            JSON.stringify(apiResponse)
          );

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];

          expect(siteCat, "should have site.cat").to.deep.equal(["IAB12", "IAB12-3"]);
          expect(contentData, "should have content data").to.exist;
        });

        it("should send IAB 1.0 filter configuration in URL parameters", function () {
          const apiResponse = {
            "1": {
              "1": [{ id: "IAB12" }],
              "2": [{ id: "IAB12-3" }]
            },
            "6": {
              "1": [{ id: "52" }]
            }
          };
          const bidsConfig = bidsConfiglike();
          const conf = config();
          conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=5";
          conf.params.iabTaxonomyFilters = {
            ContentTier1: { limit: 2 }
          };

          neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");

          const request = server.requests[0];
          expect(request.url, "should have filter for segtax 1 tier 1").to.include("filter_1_1_limit=2");
          expect(request.url, "should have filter for segtax 6 tier 1").to.include("filter_6_1_limit=2");

          request.respond(
            200,
            { "Content-Type": "application/json; encoding=UTF-8" },
            JSON.stringify(apiResponse)
          );

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          expect(siteCat, "should inject category fields").to.deep.equal(["IAB12", "IAB12-3"]);
        });
      });

      describe("with enableOrtb25Fields disabled", function () {
        it("should not include iabVersions=1 parameter in API request", function () {
          const bidsConfig = bidsConfiglike();
          const conf = config();
          conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=5";
          conf.params.enableOrtb25Fields = false;

          neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
          const request = server.requests[0];

          expect(request.url, "should not include iabVersions=1").to.not.include("iabVersions=1");
          expect(request.url, "should still include iabVersions=6").to.include("iabVersions=6");
        });

        it("should not inject category fields even if API returns IAB 1.0 data", function () {
          const apiResponse = {
            "1": {
              "1": [{ id: "IAB12" }]
            },
            "6": {
              "1": [{ id: "52" }]
            }
          };
          const bidsConfig = bidsConfiglike();
          const conf = config();
          conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=5";
          conf.params.enableOrtb25Fields = false;

          neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
          const request = server.requests[0];
          request.respond(
            200,
            { "Content-Type": "application/json; encoding=UTF-8" },
            JSON.stringify(apiResponse)
          );

          const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
          const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];

          expect(siteCat, "should not have site.cat").to.be.undefined;
          expect(contentData, "should still have content data").to.exist;
        });

        it("should not send IAB 1.0 filters in URL parameters", function () {
          const bidsConfig = bidsConfiglike();
          const conf = config();
          conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=5";
          conf.params.enableOrtb25Fields = false;
          conf.params.iabTaxonomyFilters = {
            ContentTier1: { limit: 3 },
            ContentTier2: { limit: 5 }
          };

          neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
          const request = server.requests[0];

          expect(request.url, "should not have segtax 1 filters").to.not.match(/filter_1_/);
          expect(request.url, "should have segtax 6 filters").to.include("filter_6_1_limit=3");
          expect(request.url, "should have segtax 6 tier 2 filters").to.include("filter_6_2_limit=5");
        });
      });
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
    it("should not inject data if response contains no segments", function () {
      const apiResponse = { "6": {}, "4": {} }; // Empty response (no segments)
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

      // After a successful response with no segments, the global ortb2 fragments should remain empty
      // as the data injection logic only injects when segments exist
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

    it("should correctly construct API URL when neuwoApiUrl already contains query parameters", function () {
      const apiResponse = getNeuwoApiResponse();
      const bidsConfig = bidsConfiglike();
      const conf = config();
      // Set API URL that already has query parameters
      conf.params.neuwoApiUrl = "https://edge.neuwo.ai/api/aitopics/edge/v1/iab?environment=production";
      conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=5";

      neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
      const request = server.requests[0];

      // Should use & as joiner instead of ?
      expect(request.url, "URL should contain environment param from base URL").to.include("environment=production");
      expect(request.url, "URL should contain token param joined with &").to.include("&token=");
      expect(request.url, "URL should contain url param").to.include("&url=");
      expect(request.url, "URL should contain product identifier").to.include("&_neuwo_prod=PrebidModule");
      expect(request.url, "URL should include iabVersions parameter").to.include("iabVersions=");
      // Should not have ?? in the URL
      expect(request.url, "URL should not contain double question marks").to.not.include("??");

      request.respond(
        200,
        { "Content-Type": "application/json; encoding=UTF-8" },
        JSON.stringify(apiResponse)
      );

      const contentData = bidsConfig.ortb2Fragments.global.site.content.data[0];
      expect(contentData.name, "Should successfully process response").to.equal(neuwo.DATA_PROVIDER);
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

      it("should handle concurrent requests by sharing a pending request promise", function (done) {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const bidsConfig3 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=concurrent";
        conf.params.enableCache = true;

        let callbackCount = 0;
        const callback = () => {
          callbackCount++;
          if (callbackCount === 3) {
            // All callbacks have been called, now verify the data
            try {
              const contentData1 = bidsConfig1.ortb2Fragments.global.site.content.data[0];
              const contentData2 = bidsConfig2.ortb2Fragments.global.site.content.data[0];
              const contentData3 = bidsConfig3.ortb2Fragments.global.site.content.data[0];

              expect(contentData1, "First config should have Neuwo data").to.exist;
              expect(contentData2, "Second config should have Neuwo data from pending request").to.exist;
              expect(contentData3, "Third config should have Neuwo data from pending request").to.exist;
              expect(contentData1.name, "First config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
              expect(contentData2.name, "Second config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
              expect(contentData3.name, "Third config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
              done();
            } catch (e) {
              done(e);
            }
          }
        };

        // Make three concurrent calls before responding to the first request
        neuwo.getBidRequestData(bidsConfig1, callback, conf, "consent data");
        neuwo.getBidRequestData(bidsConfig2, callback, conf, "consent data");
        neuwo.getBidRequestData(bidsConfig3, callback, conf, "consent data");

        // Only one API request should be made
        expect(server.requests.length, "Only one API request should be made for concurrent calls").to.equal(1);

        const request = server.requests[0];
        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );
      });

      it("should transition through all three cache states: pending request, then cached response", function (done) {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const bidsConfig3 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=three-stage";
        conf.params.enableCache = true;

        let callback1and2Count = 0;

        const callback1and2 = () => {
          callback1and2Count++;
          if (callback1and2Count === 2) {
            // Both first and second callbacks have been called
            // Stage 3: Third request should use cached response (not pending request)
            neuwo.getBidRequestData(bidsConfig3, () => {
              try {
                expect(server.requests.length, "Third call should use cache and not make a new API request").to.equal(1);

                // All three configs should have the same data
                const contentData1 = bidsConfig1.ortb2Fragments.global.site.content.data[0];
                const contentData2 = bidsConfig2.ortb2Fragments.global.site.content.data[0];
                const contentData3 = bidsConfig3.ortb2Fragments.global.site.content.data[0];

                expect(contentData1, "First config should have Neuwo data").to.exist;
                expect(contentData2, "Second config should have Neuwo data from pending request").to.exist;
                expect(contentData3, "Third config should have Neuwo data from cache").to.exist;
                expect(contentData1.name, "First config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
                expect(contentData2.name, "Second config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
                expect(contentData3.name, "Third config should have correct provider").to.equal(neuwo.DATA_PROVIDER);
                done();
              } catch (e) {
                done(e);
              }
            }, conf, "consent data");
          }
        };

        // Stage 1: First request initiates API call (creates pending request)
        neuwo.getBidRequestData(bidsConfig1, callback1and2, conf, "consent data");
        expect(server.requests.length, "First call should make an API request").to.equal(1);

        // Stage 2: Second request should attach to pending request before response
        neuwo.getBidRequestData(bidsConfig2, callback1and2, conf, "consent data");
        expect(server.requests.length, "Second call should not make a new API request").to.equal(1);

        // Respond to the API request, which populates the cache
        const request = server.requests[0];
        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );
      });

      it("should not share cache between requests with different parameters", function (done) {
        const apiResponse1 = getNeuwoApiResponse();
        const apiResponse2 = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const conf1 = config();
        conf1.params.websiteToAnalyseUrl = "https://publisher.works/page-a";
        conf1.params.enableCache = true;
        const conf2 = config();
        conf2.params.websiteToAnalyseUrl = "https://publisher.works/page-b";
        conf2.params.enableCache = true;

        let callbackCount = 0;
        const callback = () => {
          callbackCount++;
          if (callbackCount === 2) {
            try {
              // Both should have made separate API requests
              expect(server.requests.length, "Should make two separate API requests for different URLs").to.equal(2);
              expect(server.requests[0].url).to.contain("page-a");
              expect(server.requests[1].url).to.contain("page-b");
              done();
            } catch (e) {
              done(e);
            }
          }
        };

        // Two concurrent calls with different URLs
        neuwo.getBidRequestData(bidsConfig1, callback, conf1, "consent data");
        neuwo.getBidRequestData(bidsConfig2, callback, conf2, "consent data");

        expect(server.requests.length, "Should make two separate API requests").to.equal(2);

        server.requests[0].respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse1)
        );
        server.requests[1].respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse2)
        );
      });

      it("should use cache for same URL but make new request after config change", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const bidsConfig3 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/page-a";
        conf.params.enableCache = true;

        // First call
        neuwo.getBidRequestData(bidsConfig1, () => {}, conf, "consent data");
        expect(server.requests.length).to.equal(1);
        server.requests[0].respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        // Second call with same URL - should use cache
        neuwo.getBidRequestData(bidsConfig2, () => {}, conf, "consent data");
        expect(server.requests.length, "Same URL should use cache").to.equal(1);

        // Third call with different URL (simulating config change) - should make new request
        conf.params.websiteToAnalyseUrl = "https://publisher.works/page-b";
        neuwo.getBidRequestData(bidsConfig3, () => {}, conf, "consent data");
        expect(server.requests.length, "Different URL should make new request").to.equal(2);
        expect(server.requests[1].url).to.contain("page-b");
      });

      it("should not share cache when iabContentTaxonomyVersion changes", function () {
        const apiResponse = getNeuwoApiResponse();
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const bidsConfig3 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/same-page";
        conf.params.enableCache = true;
        conf.params.iabContentTaxonomyVersion = "2.2";

        // First call with taxonomy 2.2
        neuwo.getBidRequestData(bidsConfig1, () => {}, conf, "consent data");
        expect(server.requests.length).to.equal(1);
        expect(server.requests[0].url).to.contain("iabVersions=6"); // segtax 6 = taxonomy 2.2
        server.requests[0].respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(apiResponse)
        );

        // Second call with same taxonomy - should use cache
        neuwo.getBidRequestData(bidsConfig2, () => {}, conf, "consent data");
        expect(server.requests.length, "Same taxonomy version should use cache").to.equal(1);

        // Third call with different taxonomy version - should make new request
        conf.params.iabContentTaxonomyVersion = "3.0";
        neuwo.getBidRequestData(bidsConfig3, () => {}, conf, "consent data");
        expect(server.requests.length, "Different taxonomy version should make new request").to.equal(2);
        expect(server.requests[1].url).to.contain("iabVersions=7"); // segtax 7 = taxonomy 3.0
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

      it("should clear pending request after error response and retry on next call", function (done) {
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=error-test";
        conf.params.enableCache = true;

        // First call - will get 404 error
        neuwo.getBidRequestData(bidsConfig1, () => {
          // After error, data should not be injected
          const contentData = bidsConfig1.ortb2Fragments.global?.site?.content?.data;
          expect(contentData, "No data should be injected after error").to.be.undefined;

          // Second call - should retry API (pending should be cleared)
          neuwo.getBidRequestData(bidsConfig2, () => {
            try {
              expect(server.requests.length, "Second call should retry after error").to.equal(2);
              const contentData2 = bidsConfig2.ortb2Fragments.global?.site?.content?.data?.[0];
              expect(contentData2, "Second call should have Neuwo data after retry").to.exist;
              expect(contentData2.name, "Second call should have correct provider").to.equal(neuwo.DATA_PROVIDER);
              done();
            } catch (e) {
              done(e);
            }
          }, conf, "consent data");

          // Respond with success to second request
          const request2 = server.requests[1];
          request2.respond(
            200,
            { "Content-Type": "application/json; encoding=UTF-8" },
            JSON.stringify(getNeuwoApiResponse())
          );
        }, conf, "consent data");

        expect(server.requests.length, "First call should make an API request").to.equal(1);

        // Respond with error to first request
        const request1 = server.requests[0];
        request1.respond(
          404,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify({ error: "Not found" })
        );
      });

      it("should handle concurrent requests when API returns error", function (done) {
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const bidsConfig3 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=concurrent-error";
        conf.params.enableCache = true;

        let callbackCount = 0;
        const callback = () => {
          callbackCount++;
          if (callbackCount === 3) {
            try {
              // None of the configs should have data after error
              const contentData1 = bidsConfig1.ortb2Fragments.global?.site?.content?.data;
              const contentData2 = bidsConfig2.ortb2Fragments.global?.site?.content?.data;
              const contentData3 = bidsConfig3.ortb2Fragments.global?.site?.content?.data;

              expect(contentData1, "First config should not have data after error").to.be.undefined;
              expect(contentData2, "Second config should not have data after error").to.be.undefined;
              expect(contentData3, "Third config should not have data after error").to.be.undefined;
              done();
            } catch (e) {
              done(e);
            }
          }
        };

        // Make three concurrent calls
        neuwo.getBidRequestData(bidsConfig1, callback, conf, "consent data");
        neuwo.getBidRequestData(bidsConfig2, callback, conf, "consent data");
        neuwo.getBidRequestData(bidsConfig3, callback, conf, "consent data");

        expect(server.requests.length, "Only one API request should be made").to.equal(1);

        // Respond with error
        const request = server.requests[0];
        request.respond(
          500,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify({ error: "Internal server error" })
        );
      });

      it("should handle JSON parsing error in success callback", function (done) {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=parse-error";
        conf.params.enableCache = true;

        neuwo.getBidRequestData(bidsConfig, () => {
          // Callback should still be called
          const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data;
          expect(contentData, "No data should be injected after parsing error").to.be.undefined;
          done();
        }, conf, "consent data");

        expect(server.requests.length, "Should make an API request").to.equal(1);

        // Respond with invalid JSON
        const request = server.requests[0];
        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          "{ invalid json content }"
        );
      });

      it("should not cache response after JSON parsing error and allow retry", function (done) {
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=parse-error-retry";
        conf.params.enableCache = true;

        neuwo.getBidRequestData(bidsConfig1, () => {
          // First call with parsing error
          const contentData1 = bidsConfig1.ortb2Fragments.global?.site?.content?.data;
          expect(contentData1, "No data after parsing error").to.be.undefined;

          // Second call should retry (not use cached error)
          neuwo.getBidRequestData(bidsConfig2, () => {
            try {
              expect(server.requests.length, "Should retry after parsing error").to.equal(2);
              const contentData2 = bidsConfig2.ortb2Fragments.global?.site?.content?.data?.[0];
              expect(contentData2, "Second call should have valid data").to.exist;
              expect(contentData2.name, "Should have correct provider").to.equal(neuwo.DATA_PROVIDER);
              done();
            } catch (e) {
              done(e);
            }
          }, conf, "consent data");

          // Second request gets valid response
          const request2 = server.requests[1];
          request2.respond(
            200,
            { "Content-Type": "application/json; encoding=UTF-8" },
            JSON.stringify(getNeuwoApiResponse())
          );
        }, conf, "consent data");

        // First request gets invalid JSON
        const request1 = server.requests[0];
        request1.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          "{ this is not valid JSON }"
        );
      });

      it("should handle response with empty segments", function (done) {
        const bidsConfig = bidsConfiglike();
        const conf = config();
        conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=no-categories";

        neuwo.getBidRequestData(bidsConfig, () => {
          // Callback should still be called even with empty response
          const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data;
          expect(contentData, "No data should be injected without segments").to.be.undefined;
          done();
        }, conf, "consent data");

        const request = server.requests[0];
        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify({ "6": {}, "4": {} }) // Empty segments
        );
      });
    });

    describe("with URL query param stripping", function () {
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

  // V1 API Format Tests
  // These tests use the legacy V1 API response format with marketing_categories structure.
  // V1 API uses GET requests and returns: { marketing_categories: { iab_tier_1: [], iab_tier_2: [], etc. } }
  // Field names in V1: ID, label, relevance (capital letters)
  describe("V1 API", function () {
    describe("getBidRequestData", function () {
      describe("when using IAB Content Taxonomy 3.0", function () {
        it("should correctly structure the bids object after a successful API response", function () {
          const apiResponse = getNeuwoApiResponseV1();
          const bidsConfig = bidsConfiglike();
          const conf = configV1();
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
          expect(request.url, "The request URL should include the product identifier").to.include(
            "_neuwo_prod=PrebidModule"
          );
          expect(request.url, "V1 API should NOT include iabVersions parameter").to.not.include(
            "iabVersions"
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
            "The first segment ID should match the API response (transformed from V1)"
          ).to.equal(apiResponse.marketing_categories.iab_tier_1[0].ID);
          expect(
            contentData.segment[1].id,
            "The second segment ID should match the API response (transformed from V1)"
          ).to.equal(apiResponse.marketing_categories.iab_tier_2[0].ID);
        });
      });

      describe("when using IAB Audience Taxonomy 1.1", function () {
        it("should correctly structure the bids object after a successful API response", function () {
          const apiResponse = getNeuwoApiResponseV1();
          const bidsConfig = bidsConfiglike();
          const conf = configV1();
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
            "The first segment ID should match the API response (transformed from V1)"
          ).to.equal(apiResponse.marketing_categories.iab_audience_tier_3[0].ID);
          expect(
            userData.segment[1].id,
            "The second segment ID should match the API response (transformed from V1)"
          ).to.equal(apiResponse.marketing_categories.iab_audience_tier_4[0].ID);
        });
      });

      describe("edge cases", function () {
        it("should not inject data if 'marketing_categories' is missing from the successful API response", function () {
          const apiResponse = { brand_safety: { BS_score: "1.0" } }; // Missing marketing_categories
          const bidsConfig = bidsConfiglike();
          const bidsConfigCopy = bidsConfiglike();
          const conf = configV1();

          neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
          const request = server.requests[0];
          request.respond(
            200,
            { "Content-Type": "application/json; encoding=UTF-8" },
            JSON.stringify(apiResponse)
          );

          // After a successful response with missing data, the global ortb2 fragments should remain empty
          // as the data injection logic checks for marketing_categories in V1 format
          expect(
            bidsConfig.ortb2Fragments.global,
            "The global ORTB fragments should remain empty"
          ).to.deep.equal(bidsConfigCopy.ortb2Fragments.global);
        });

        it("should handle response with missing marketing_categories", function (done) {
          const bidsConfig = bidsConfiglike();
          const conf = configV1();
          conf.params.websiteToAnalyseUrl = "https://publisher.works/article.php?id=no-categories";

          neuwo.getBidRequestData(bidsConfig, () => {
            // Callback should still be called even without marketing_categories
            const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data;
            expect(contentData, "No data should be injected without marketing_categories").to.be.undefined;
            done();
          }, conf, "consent data");

          const request = server.requests[0];
          request.respond(
            200,
            { "Content-Type": "application/json; encoding=UTF-8" },
            JSON.stringify({ brand_safety: { BS_score: "1.0" } }) // Missing marketing_categories
          );
        });
      });
    });

    describe("with iabTaxonomyFilters (client-side filtering)", function () {
      it("should work without filtering when no iabTaxonomyFilters provided", function (done) {
        const bidsConfig = bidsConfiglike();
        const conf = configV1();

        neuwo.getBidRequestData(
          bidsConfig,
          () => {
            const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
            const userData = bidsConfig.ortb2Fragments.global?.user?.data?.[0];

            expect(contentData, "should have content data").to.exist;
            expect(contentData.segment, "should have unfiltered content segments").to.have.lengthOf(2);
            expect(userData, "should have user data").to.exist;
            expect(userData.segment, "should have unfiltered audience segments").to.have.lengthOf(3);
            done();
          },
          conf,
          "consent data"
        );

        const request = server.requests[0];
        request.respond(200, {}, JSON.stringify(getNeuwoApiResponseV1()));
      });

      it("should apply client-side filtering when iabTaxonomyFilters are provided", function (done) {
        const bidsConfig = bidsConfiglike();
        const conf = configV1();
        conf.params.iabTaxonomyFilters = {
          ContentTier1: { limit: 1, threshold: 0.4 },
          AudienceTier3: { limit: 1, threshold: 0.9 }
        };

        neuwo.getBidRequestData(
          bidsConfig,
          () => {
            const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
            const userData = bidsConfig.ortb2Fragments.global?.user?.data?.[0];

            expect(contentData, "should have content data").to.exist;
            expect(contentData.segment, "should have filtered content segments").to.have.lengthOf(2);

            // Check that tier 1 was limited to 1
            const tier1Items = contentData.segment.filter(s => s.id === "274");
            expect(tier1Items, "should have only 1 tier 1 item").to.have.lengthOf(1);

            expect(userData, "should have user data").to.exist;
            // Audience tier 3 should be filtered to 1, but tiers 4 and 5 should remain
            expect(userData.segment, "should have filtered audience segments").to.have.lengthOf(3);

            done();
          },
          conf,
          "consent data"
        );

        const request = server.requests[0];
        request.respond(200, {}, JSON.stringify(getNeuwoApiResponseV1()));
      });

      it("should apply strict client-side filtering that removes all low-relevance items", function (done) {
        const bidsConfig = bidsConfiglike();
        const conf = configV1();
        conf.params.iabTaxonomyFilters = {
          ContentTier1: { threshold: 0.9 }, // Only keep items with 90%+ relevance
          ContentTier2: { threshold: 0.9 },
          AudienceTier4: { threshold: 0.99 },
          AudienceTier5: { threshold: 0.99 }
        };

        neuwo.getBidRequestData(
          bidsConfig,
          () => {
            const contentData = bidsConfig.ortb2Fragments.global?.site?.content?.data?.[0];
            const userData = bidsConfig.ortb2Fragments.global?.user?.data?.[0];

            expect(contentData, "should have content data").to.exist;
            // Tier 1 has 0.47, Tier 2 has 0.41 - both below 0.9 threshold
            // Only tier 3 (empty) should remain, resulting in no segments
            expect(contentData.segment, "should have no content segments due to strict filtering").to.have.lengthOf(0);

            expect(userData, "should have user data").to.exist;
            // Tier 3 has 0.9923 (passes), Tier 4 has 0.9673 (fails), Tier 5 has 0.9066 (fails)
            expect(userData.segment, "should have only 1 audience segment").to.have.lengthOf(1);

            done();
          },
          conf,
          "consent data"
        );

        const request = server.requests[0];
        request.respond(200, {}, JSON.stringify(getNeuwoApiResponseV1()));
      });

      it("should handle client-side filtering with cached response", function (done) {
        const bidsConfig1 = bidsConfiglike();
        const bidsConfig2 = bidsConfiglike();
        const conf = configV1();
        conf.params.iabTaxonomyFilters = {
          ContentTier1: { limit: 1 }
        };

        // First request
        neuwo.getBidRequestData(
          bidsConfig1,
          () => {
          // Second request (should use cache)
            neuwo.getBidRequestData(
              bidsConfig2,
              () => {
                const contentData = bidsConfig2.ortb2Fragments.global?.site?.content?.data?.[0];
                expect(contentData, "should have content data from cache").to.exist;
                expect(contentData.segment, "should apply filtering to cached response").to.have.lengthOf(2);
                done();
              },
              conf,
              "consent data"
            );
          },
          conf,
          "consent data"
        );

        const request = server.requests[0];
        expect(server.requests, "should only make one API request").to.have.lengthOf(1);
        request.respond(200, {}, JSON.stringify(getNeuwoApiResponseV1()));
      });
    });

    describe("OpenRTB 2.5 category fields (V1 API compatibility)", function () {
      it("should not include iabVersions parameter with legacy API", function () {
        const bidsConfig = bidsConfiglike();
        const conf = configV1();
        conf.params.enableOrtb25Fields = true;

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");

        const request = server.requests[0];
        expect(request.url, "should not include iabVersions parameter").to.not.include("iabVersions");
      });

      it("should not inject category fields with legacy API", function () {
        const bidsConfig = bidsConfiglike();
        const conf = configV1();
        conf.params.enableOrtb25Fields = true;

        neuwo.getBidRequestData(bidsConfig, () => {}, conf, "consent data");
        const request = server.requests[0];
        request.respond(
          200,
          { "Content-Type": "application/json; encoding=UTF-8" },
          JSON.stringify(getNeuwoApiResponseV1())
        );

        const siteCat = bidsConfig.ortb2Fragments.global?.site?.cat;
        expect(siteCat, "should not have site.cat with legacy API").to.be.undefined;
      });
    });

    describe("filterIabTaxonomyTier", function () {
      it("should return original array when no filter is provided", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2", relevance: "0.5" },
          { ID: "3", label: "Category 3", relevance: "0.3" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies, {});
        expect(result, "should return all items when no filter is provided").to.have.lengthOf(3);
      });

      it("should return original array when filter is empty", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2", relevance: "0.5" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies);
        expect(result, "should return all items when no filter parameter").to.have.lengthOf(2);
      });

      it("should filter by threshold only", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2", relevance: "0.5" },
          { ID: "3", label: "Category 3", relevance: "0.3" },
          { ID: "4", label: "Category 4", relevance: "0.1" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies, { threshold: 0.4 });
        expect(result, "should filter out items below threshold").to.have.lengthOf(2);
        expect(result[0].ID, "should keep highest relevance item").to.equal("1");
        expect(result[1].ID, "should keep second highest relevance item").to.equal("2");
      });

      it("should limit by count only", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2", relevance: "0.5" },
          { ID: "3", label: "Category 3", relevance: "0.3" },
          { ID: "4", label: "Category 4", relevance: "0.1" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies, { limit: 2 });
        expect(result, "should limit to specified count").to.have.lengthOf(2);
        expect(result[0].ID, "should keep highest relevance item").to.equal("1");
        expect(result[1].ID, "should keep second highest relevance item").to.equal("2");
      });

      it("should apply both threshold and limit", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.9" },
          { ID: "2", label: "Category 2", relevance: "0.7" },
          { ID: "3", label: "Category 3", relevance: "0.6" },
          { ID: "4", label: "Category 4", relevance: "0.5" },
          { ID: "5", label: "Category 5", relevance: "0.2" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies, { threshold: 0.5, limit: 2 });
        expect(result, "should apply both threshold and limit").to.have.lengthOf(2);
        expect(result[0].ID, "should keep highest relevance item").to.equal("1");
        expect(result[1].ID, "should keep second highest relevance item").to.equal("2");
      });

      it("should sort by relevance in descending order", function () {
        const taxonomies = [
          { ID: "3", label: "Category 3", relevance: "0.3" },
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2", relevance: "0.5" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies, {});
        expect(result[0].ID, "first item should have highest relevance").to.equal("1");
        expect(result[1].ID, "second item should have second highest relevance").to.equal("2");
        expect(result[2].ID, "third item should have lowest relevance").to.equal("3");
      });

      it("should handle empty array", function () {
        const result = neuwo.filterIabTaxonomyTier([], { threshold: 0.5, limit: 2 });
        expect(result, "should return empty array for empty input").to.be.an("array").that.is.empty;
      });

      it("should handle null input", function () {
        const result = neuwo.filterIabTaxonomyTier(null, { threshold: 0.5 });
        expect(result, "should return null for null input").to.be.null;
      });

      it("should handle undefined input", function () {
        const result = neuwo.filterIabTaxonomyTier(undefined, { threshold: 0.5 });
        expect(result, "should return undefined for undefined input").to.be.undefined;
      });

      it("should handle items with missing relevance", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2" },
          { ID: "3", label: "Category 3", relevance: "0.5" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies, { threshold: 0.3 });
        expect(result, "should handle missing relevance").to.have.lengthOf(2);
      });

      it("should not mutate original array", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2", relevance: "0.5" },
          { ID: "3", label: "Category 3", relevance: "0.3" }
        ];
        const original = [...taxonomies];
        neuwo.filterIabTaxonomyTier(taxonomies, { limit: 1 });
        expect(taxonomies, "should not mutate original array").to.deep.equal(original);
      });

      it("should sort items with undefined/null relevance to the end", function () {
        const taxonomies = [
          { ID: "1", label: "Category 1", relevance: "0.8" },
          { ID: "2", label: "Category 2" }, // missing relevance
          { ID: "3", label: "Category 3", relevance: null },
          { ID: "4", label: "Category 4", relevance: undefined },
          { ID: "5", label: "Category 5", relevance: "0.5" }
        ];
        const result = neuwo.filterIabTaxonomyTier(taxonomies, { limit: 5 });
        expect(result, "should return all items").to.have.lengthOf(5);
        expect(result[0].ID, "should have highest relevance first").to.equal("1");
        expect(result[1].ID, "should have second highest relevance").to.equal("5");
        // Items with missing/null/undefined relevance should be sorted to the end
        const lastThreeIds = [result[2].ID, result[3].ID, result[4].ID].sort();
        expect(lastThreeIds, "items with no relevance should be at the end").to.deep.equal(["2", "3", "4"]);
      });
    });

    describe("filterIabTaxonomies", function () {
      function getTestMarketingCategories() {
        return {
          iab_tier_1: [
            { ID: "1", label: "Cat 1", relevance: "0.9" },
            { ID: "2", label: "Cat 2", relevance: "0.7" },
            { ID: "3", label: "Cat 3", relevance: "0.5" }
          ],
          iab_tier_2: [
            { ID: "4", label: "Cat 4", relevance: "0.8" },
            { ID: "5", label: "Cat 5", relevance: "0.6" }
          ],
          iab_audience_tier_3: [
            { ID: "6", label: "Aud 1", relevance: "0.95" },
            { ID: "7", label: "Aud 2", relevance: "0.85" },
            { ID: "8", label: "Aud 3", relevance: "0.75" }
          ]
        };
      }

      it("should return original data when no filters provided", function () {
        const marketingCategories = getTestMarketingCategories();
        const result = neuwo.filterIabTaxonomies(marketingCategories, {});
        expect(result.iab_tier_1, "should return all tier 1 items").to.have.lengthOf(3);
        expect(result.iab_tier_2, "should return all tier 2 items").to.have.lengthOf(2);
        expect(result.iab_audience_tier_3, "should return all audience tier 3 items").to.have.lengthOf(3);
      });

      it("should return original data when filters parameter is undefined", function () {
        const marketingCategories = getTestMarketingCategories();
        const result = neuwo.filterIabTaxonomies(marketingCategories);
        expect(result.iab_tier_1, "should return all tier 1 items").to.have.lengthOf(3);
      });

      it("should filter ContentTier1 correctly", function () {
        const marketingCategories = getTestMarketingCategories();
        const filters = {
          ContentTier1: { limit: 1, threshold: 0.8 }
        };
        const result = neuwo.filterIabTaxonomies(marketingCategories, filters);
        expect(result.iab_tier_1, "should filter tier 1").to.have.lengthOf(1);
        expect(result.iab_tier_1[0].ID, "should keep highest relevance item").to.equal("1");
        expect(result.iab_tier_2, "should not filter tier 2").to.have.lengthOf(2);
      });

      it("should filter multiple tiers independently", function () {
        const marketingCategories = getTestMarketingCategories();
        const filters = {
          ContentTier1: { limit: 2, threshold: 0.6 },
          ContentTier2: { limit: 1, threshold: 0.7 },
          AudienceTier3: { limit: 2, threshold: 0.8 }
        };
        const result = neuwo.filterIabTaxonomies(marketingCategories, filters);
        expect(result.iab_tier_1, "should filter tier 1 to 2 items").to.have.lengthOf(2);
        expect(result.iab_tier_2, "should filter tier 2 to 1 item").to.have.lengthOf(1);
        expect(result.iab_tier_2[0].ID, "tier 2 should keep highest item").to.equal("4");
        expect(result.iab_audience_tier_3, "should filter audience tier 3 to 2 items").to.have.lengthOf(2);
      });

      it("should handle tier with no matching config", function () {
        const marketingCategories = getTestMarketingCategories();
        const filters = {
          ContentTier1: { limit: 1 }
        };
        const result = neuwo.filterIabTaxonomies(marketingCategories, filters);
        expect(result.iab_tier_1, "should filter configured tier").to.have.lengthOf(1);
        expect(result.iab_tier_2, "should keep all items in non-configured tier").to.have.lengthOf(2);
      });

      it("should preserve non-array tier data", function () {
        const marketingCategories = {
          iab_tier_1: [{ ID: "1", label: "Cat 1", relevance: "0.9" }],
          some_other_field: "string value",
          another_field: 123
        };
        const filters = {
          ContentTier1: { limit: 1 }
        };
        const result = neuwo.filterIabTaxonomies(marketingCategories, filters);
        expect(result.some_other_field, "should preserve string field").to.equal("string value");
        expect(result.another_field, "should preserve number field").to.equal(123);
      });

      it("should handle null marketingCategories", function () {
        const result = neuwo.filterIabTaxonomies(null, { ContentTier1: { limit: 1 } });
        expect(result, "should return null for null input").to.be.null;
      });

      it("should handle undefined marketingCategories", function () {
        const result = neuwo.filterIabTaxonomies(undefined, { ContentTier1: { limit: 1 } });
        expect(result, "should return undefined for undefined input").to.be.undefined;
      });

      it("should handle all tier configurations", function () {
        const marketingCategories = {
          iab_tier_1: [
            { ID: "1", label: "C1", relevance: "0.9" },
            { ID: "2", label: "C2", relevance: "0.5" }
          ],
          iab_tier_2: [
            { ID: "3", label: "C3", relevance: "0.8" },
            { ID: "4", label: "C4", relevance: "0.4" }
          ],
          iab_tier_3: [
            { ID: "5", label: "C5", relevance: "0.7" },
            { ID: "6", label: "C6", relevance: "0.3" }
          ],
          iab_audience_tier_3: [
            { ID: "7", label: "A1", relevance: "0.95" },
            { ID: "8", label: "A2", relevance: "0.45" }
          ],
          iab_audience_tier_4: [
            { ID: "9", label: "A3", relevance: "0.85" },
            { ID: "10", label: "A4", relevance: "0.35" }
          ],
          iab_audience_tier_5: [
            { ID: "11", label: "A5", relevance: "0.75" },
            { ID: "12", label: "A6", relevance: "0.25" }
          ]
        };
        const filters = {
          ContentTier1: { limit: 1, threshold: 0.8 },
          ContentTier2: { limit: 1, threshold: 0.7 },
          ContentTier3: { limit: 1, threshold: 0.6 },
          AudienceTier3: { limit: 1, threshold: 0.9 },
          AudienceTier4: { limit: 1, threshold: 0.8 },
          AudienceTier5: { limit: 1, threshold: 0.7 }
        };
        const result = neuwo.filterIabTaxonomies(marketingCategories, filters);
        expect(result.iab_tier_1, "ContentTier1 filtered").to.have.lengthOf(1);
        expect(result.iab_tier_2, "ContentTier2 filtered").to.have.lengthOf(1);
        expect(result.iab_tier_3, "ContentTier3 filtered").to.have.lengthOf(1);
        expect(result.iab_audience_tier_3, "AudienceTier3 filtered").to.have.lengthOf(1);
        expect(result.iab_audience_tier_4, "AudienceTier4 filtered").to.have.lengthOf(1);
        expect(result.iab_audience_tier_5, "AudienceTier5 filtered").to.have.lengthOf(1);
      });
    });

    describe("transformSegmentsV1ToV2", function () {
      it("should transform V1 segment format to V2 format", function () {
        const v1Segments = [
          { ID: "274", label: "Home & Garden", relevance: "0.47" },
          { ID: "216", label: "Cooking", relevance: "0.41" }
        ];
        const result = neuwo.transformSegmentsV1ToV2(v1Segments);

        expect(result, "should return array with same length").to.have.lengthOf(2);
        expect(result[0], "first segment should have id property").to.have.property("id", "274");
        expect(result[0], "first segment should have name property").to.have.property("name", "Home & Garden");
        expect(result[0], "first segment should have relevance property").to.have.property("relevance", "0.47");
        expect(result[1], "second segment should have id property").to.have.property("id", "216");
        expect(result[1], "second segment should have name property").to.have.property("name", "Cooking");
        expect(result[1], "second segment should have relevance property").to.have.property("relevance", "0.41");
      });

      it("should handle empty array", function () {
        const result = neuwo.transformSegmentsV1ToV2([]);
        expect(result, "should return empty array").to.be.an("array").that.is.empty;
      });

      it("should handle null input", function () {
        const result = neuwo.transformSegmentsV1ToV2(null);
        expect(result, "should return empty array for null").to.be.an("array").that.is.empty;
      });

      it("should handle undefined input", function () {
        const result = neuwo.transformSegmentsV1ToV2(undefined);
        expect(result, "should return empty array for undefined").to.be.an("array").that.is.empty;
      });

      it("should handle non-array input", function () {
        const result = neuwo.transformSegmentsV1ToV2("not an array");
        expect(result, "should return empty array for non-array").to.be.an("array").that.is.empty;
      });

      it("should handle segments with missing properties", function () {
        const v1Segments = [
          { ID: "274", label: "Home & Garden" }, // missing relevance
          { ID: "216", relevance: "0.41" }, // missing label
          { label: "Test", relevance: "0.5" } // missing ID
        ];
        const result = neuwo.transformSegmentsV1ToV2(v1Segments);

        expect(result, "should return array with same length").to.have.lengthOf(3);
        expect(result[0].id, "should handle missing relevance").to.equal("274");
        expect(result[0].relevance, "should set undefined for missing relevance").to.be.undefined;
        expect(result[1].name, "should set undefined for missing label").to.be.undefined;
        expect(result[2].id, "should set undefined for missing ID").to.be.undefined;
      });

      it("should preserve all properties from V1 format", function () {
        const v1Segments = [
          { ID: "49", label: "Female", relevance: "0.9923" }
        ];
        const result = neuwo.transformSegmentsV1ToV2(v1Segments);

        expect(result[0], "should only have id, name, and relevance properties").to.have.all.keys("id", "name", "relevance");
      });
    });

    describe("transformV1ResponseToV2", function () {
      it("should transform complete V1 response to V2 format", function () {
        const v1Response = {
          marketing_categories: {
            iab_tier_1: [{ ID: "274", label: "Home & Garden", relevance: "0.47" }],
            iab_tier_2: [{ ID: "216", label: "Cooking", relevance: "0.41" }],
            iab_tier_3: [{ ID: "388", label: "Recipes", relevance: "0.35" }],
            iab_audience_tier_3: [{ ID: "49", label: "Female", relevance: "0.9923" }],
            iab_audience_tier_4: [{ ID: "431", label: "Age 25-34", relevance: "0.9673" }],
            iab_audience_tier_5: [{ ID: "98", label: "Interest: Cooking", relevance: "0.9066" }]
          }
        };
        const contentSegtax = 7; // IAB Content Taxonomy 3.0
        const result = neuwo.transformV1ResponseToV2(v1Response, contentSegtax);

        expect(result, "should have content segtax key").to.have.property("7");
        expect(result, "should have audience segtax key").to.have.property("4");
        expect(result["7"], "content segtax should have all tiers").to.have.all.keys("1", "2", "3");
        expect(result["4"], "audience segtax should have all tiers").to.have.all.keys("3", "4", "5");
        expect(result["7"]["1"][0], "content tier 1 should be transformed").to.deep.equal({
          id: "274",
          name: "Home & Garden",
          relevance: "0.47"
        });
        expect(result["4"]["3"][0], "audience tier 3 should be transformed").to.deep.equal({
          id: "49",
          name: "Female",
          relevance: "0.9923"
        });
      });

      it("should handle different content segtax values", function () {
        const v1Response = {
          marketing_categories: {
            iab_tier_1: [{ ID: "274", label: "Home & Garden", relevance: "0.47" }]
          }
        };

        // Test with segtax 6 (IAB 2.2)
        const result6 = neuwo.transformV1ResponseToV2(v1Response, 6);
        expect(result6, "should use segtax 6 for content").to.have.property("6");
        expect(result6["6"], "should have tier 1").to.have.property("1");

        // Test with segtax 1 (IAB 1.0)
        const result1 = neuwo.transformV1ResponseToV2(v1Response, 1);
        expect(result1, "should use segtax 1 for content").to.have.property("1");
        expect(result1["1"], "should have tier 1").to.have.property("1");
      });

      it("should handle missing marketing_categories", function () {
        const v1Response = {};
        const result = neuwo.transformV1ResponseToV2(v1Response, 6);

        expect(result, "should have content segtax key").to.have.property("6");
        expect(result, "should have audience segtax key").to.have.property("4");
        expect(result["6"], "content segtax should be empty object").to.deep.equal({});
        expect(result["4"], "audience segtax should be empty object").to.deep.equal({});
      });

      it("should handle null v1Response", function () {
        const result = neuwo.transformV1ResponseToV2(null, 6);

        expect(result, "should have content segtax key").to.have.property("6");
        expect(result, "should have audience segtax key").to.have.property("4");
        expect(result["6"], "content segtax should be empty object").to.deep.equal({});
        expect(result["4"], "audience segtax should be empty object").to.deep.equal({});
      });

      it("should handle undefined v1Response", function () {
        const result = neuwo.transformV1ResponseToV2(undefined, 6);

        expect(result, "should have content segtax key").to.have.property("6");
        expect(result, "should have audience segtax key").to.have.property("4");
        expect(result["6"], "content segtax should be empty object").to.deep.equal({});
        expect(result["4"], "audience segtax should be empty object").to.deep.equal({});
      });

      it("should handle partial V1 response with only content tiers", function () {
        const v1Response = {
          marketing_categories: {
            iab_tier_1: [{ ID: "274", label: "Home & Garden", relevance: "0.47" }],
            iab_tier_2: [{ ID: "216", label: "Cooking", relevance: "0.41" }]
            // No tier 3, no audience tiers
          }
        };
        const result = neuwo.transformV1ResponseToV2(v1Response, 6);

        expect(result["6"], "should have only tier 1 and 2").to.have.all.keys("1", "2");
        expect(result["6"], "should not have tier 3").to.not.have.property("3");
        expect(result["4"], "audience segtax should be empty").to.deep.equal({});
      });

      it("should handle partial V1 response with only audience tiers", function () {
        const v1Response = {
          marketing_categories: {
            iab_audience_tier_3: [{ ID: "49", label: "Female", relevance: "0.9923" }],
            iab_audience_tier_4: [{ ID: "431", label: "Age 25-34", relevance: "0.9673" }]
            // No content tiers
          }
        };
        const result = neuwo.transformV1ResponseToV2(v1Response, 6);

        expect(result["6"], "content segtax should be empty").to.deep.equal({});
        expect(result["4"], "should have tier 3 and 4").to.have.all.keys("3", "4");
        expect(result["4"], "should not have tier 5").to.not.have.property("5");
      });

      it("should handle empty arrays in V1 response", function () {
        const v1Response = {
          marketing_categories: {
            iab_tier_1: [],
            iab_tier_2: [],
            iab_audience_tier_3: []
          }
        };
        const result = neuwo.transformV1ResponseToV2(v1Response, 6);

        expect(result["6"]["1"], "content tier 1 should be empty array").to.be.an("array").that.is.empty;
        expect(result["6"]["2"], "content tier 2 should be empty array").to.be.an("array").that.is.empty;
        expect(result["4"]["3"], "audience tier 3 should be empty array").to.be.an("array").that.is.empty;
      });

      it("should convert segtax to string keys", function () {
        const v1Response = {
          marketing_categories: {
            iab_tier_1: [{ ID: "274", label: "Home & Garden", relevance: "0.47" }]
          }
        };
        const result = neuwo.transformV1ResponseToV2(v1Response, 6);

        expect(Object.keys(result), "segtax keys should be strings").to.include.members(["6", "4"]);
        expect(typeof Object.keys(result)[0], "key type should be string").to.equal("string");
      });

      it("should preserve brand_safety and other non-marketing_categories fields", function () {
        const v1Response = {
          brand_safety: { BS_score: "1.0" },
          marketing_categories: {
            iab_tier_1: [{ ID: "274", label: "Home & Garden", relevance: "0.47" }]
          },
          custom_field: "value"
        };
        const result = neuwo.transformV1ResponseToV2(v1Response, 6);

        expect(result, "should not have brand_safety").to.not.have.property("brand_safety");
        expect(result, "should not have custom_field").to.not.have.property("custom_field");
        expect(result, "should only have segtax keys").to.have.all.keys("6", "4");
      });
    });
  });
});
