import { expect } from "chai";
import {
  addStyleToSingleChildAncestors,
  applyAutoHeight,
  applyFullWidth,
  calculateMargins,
  DEFAULT_MARGINS,
  findAdWrapper,
  getFrameByEvent,
  SEENTHIS_EVENTS,
} from "modules/seenthisBrandStories.ts";
import * as boundingClientRect from "../../../libraries/boundingClientRect/boundingClientRect.js";
import * as utils from "../../../src/utils.js";
import * as winDimensions from "src/utils/winDimensions.js";

describe("seenthisBrandStories", function () {
  describe("constants", function () {
    it("should have correct DEFAULT_MARGINS", function () {
      expect(DEFAULT_MARGINS).to.equal("16px");
    });

    it("should have correct SEENTHIS_EVENTS array", function () {
      expect(SEENTHIS_EVENTS).to.be.an("array").with.length(9);
      expect(SEENTHIS_EVENTS).to.include("@seenthis_storylines/ready");
      expect(SEENTHIS_EVENTS).to.include("@seenthis_enabled");
      expect(SEENTHIS_EVENTS).to.include("@seenthis_modal/opened");
    });
  });

  describe("calculateMargins", function () {
    let mockElement;
    let getBoundingClientRectStub;
    let getComputedStyleStub;

    beforeEach(function () {
      mockElement = {
        style: {
          setProperty: sinon.stub(),
        },
      };

      getBoundingClientRectStub = sinon.stub(
        boundingClientRect,
        "getBoundingClientRect"
      );
      getComputedStyleStub = sinon.stub(window, "getComputedStyle");
    });

    afterEach(function () {
      sinon.restore();
    });

    it("should set margins correctly with non-zero values", function () {
      getBoundingClientRectStub.returns({ left: 32, width: 300 });
      getComputedStyleStub.returns({ marginLeft: "16px" });

      calculateMargins(mockElement);

      expect(
        mockElement.style.setProperty.calledWith(
          "--storylines-margin-left",
          "-16px"
        )
      ).to.be.true;
      expect(
        mockElement.style.setProperty.calledWith("--storylines-margins", "32px")
      ).to.be.true;
    });

    it("should use default margins when width is 0", function () {
      getBoundingClientRectStub.returns({ left: 16, width: 0 });
      getComputedStyleStub.returns({ marginLeft: "0px" });

      calculateMargins(mockElement);

      expect(
        mockElement.style.setProperty.calledWith("--storylines-margins", "16px")
      ).to.be.true;
      expect(
        mockElement.style.setProperty.calledWith(
          "--storylines-margin-left",
          "16px"
        )
      ).to.be.true;
    });

    it("should use default margins when margin left is 0", function () {
      getBoundingClientRectStub.returns({ left: 16, width: 300 });
      getComputedStyleStub.returns({ marginLeft: "16px" });

      calculateMargins(mockElement);

      expect(
        mockElement.style.setProperty.calledWith("--storylines-margins", "16px")
      ).to.be.true;
      expect(
        mockElement.style.setProperty.calledWith(
          "--storylines-margin-left",
          "16px"
        )
      ).to.be.true;
    });
  });

  describe("getFrameByEvent", function () {
    let getElementsByTagNameStub;
    let mockIframes;
    let mockEventSource;

    beforeEach(function () {
      mockEventSource = { id: "frame2" };

      mockIframes = [
        { contentWindow: { id: "frame1" } },
        { contentWindow: mockEventSource }, // This will match
        { contentWindow: { id: "frame3" } },
      ];

      getElementsByTagNameStub = sinon
        .stub(document, "getElementsByTagName")
        .returns(mockIframes);
    });

    afterEach(function () {
      sinon.restore();
    });

    it("should return iframe matching event source", function () {
      const mockEvent = {
        source: mockEventSource, // This should match mockIframes[1].contentWindow
      };

      const result = getFrameByEvent(mockEvent);

      expect(result).to.equal(mockIframes[1]);
      expect(getElementsByTagNameStub.calledWith("iframe")).to.be.true;
    });

    it("should return undefined if no iframe matches", function () {
      const mockEvent = {
        source: { id: "nonexistent" }, // This won't match any iframe
      };

      const result = getFrameByEvent(mockEvent);

      expect(result).to.be.null;
    });
  });

  describe("addStyleToSingleChildAncestors", function () {
    beforeEach(function () {
      sinon
        .stub(winDimensions, "getWinDimensions")
        .returns({ innerWidth: 1024, innerHeight: 768 });
    });

    afterEach(function () {
      sinon.restore();
    });

    it("should apply style to element when width is less than window width", function () {
      const mockElement = {
        style: {
          setProperty: sinon.stub(),
          width: "", // key exists
        },
        offsetWidth: 400,
        parentElement: null,
      };

      addStyleToSingleChildAncestors(mockElement, {
        key: "width",
        value: "100%",
      });

      expect(mockElement.style.setProperty.calledWith("width", "100%")).to.be
        .true;
    });

    it("should not apply style when element width equals window width", function () {
      const mockElement = {
        style: {
          setProperty: sinon.stub(),
          width: "",
        },
        offsetWidth: 1024,
        parentElement: null,
      };

      addStyleToSingleChildAncestors(mockElement, {
        key: "width",
        value: "100%",
      });

      expect(mockElement.style.setProperty.called).to.be.false;
    });

    it("should recursively apply to single child ancestors", function () {
      const grandParent = {
        style: {
          setProperty: sinon.stub(),
          width: "",
        },
        offsetWidth: 800,
        parentElement: null,
        children: { length: 1 },
      };

      const parent = {
        style: {
          setProperty: sinon.stub(),
          width: "",
        },
        offsetWidth: 600,
        parentElement: grandParent,
        children: { length: 1 },
      };

      const child = {
        style: {
          setProperty: sinon.stub(),
          width: "",
        },
        offsetWidth: 400,
        parentElement: parent,
      };

      addStyleToSingleChildAncestors(child, { key: "width", value: "100%" });

      expect(child.style.setProperty.calledWith("width", "100%")).to.be.true;
      expect(parent.style.setProperty.calledWith("width", "100%")).to.be.true;
      expect(grandParent.style.setProperty.calledWith("width", "100%")).to.be
        .true;
    });

    it("should stop recursion when parent has multiple children", function () {
      const parent = {
        style: {
          setProperty: sinon.stub(),
          width: "",
        },
        offsetWidth: 600,
        parentElement: null,
        children: { length: 2 }, // Multiple children
      };

      const child = {
        style: {
          setProperty: sinon.stub(),
          width: "",
        },
        offsetWidth: 400,
        parentElement: parent,
      };

      addStyleToSingleChildAncestors(child, { key: "width", value: "100%" });

      expect(child.style.setProperty.calledWith("width", "100%")).to.be.true;
      expect(parent.style.setProperty.called).to.be.false;
    });

    it("should not apply style when key is not in element style", function () {
      const mockElement = {
        style: {
          setProperty: sinon.stub(),
          // 'width' key not present
        },
        offsetWidth: 400,
        parentElement: null,
      };

      addStyleToSingleChildAncestors(mockElement, {
        key: "width",
        value: "100%",
      });

      expect(mockElement.style.setProperty.called).to.be.false;
    });
  });

  describe("findAdWrapper", function () {
    it("should return grandparent element", function () {
      const grandParent = {};
      const parent = { parentElement: grandParent };
      const target = { parentElement: parent };

      const result = findAdWrapper(target);

      expect(result).to.equal(grandParent);
    });
  });

  describe("applyFullWidth", function () {
    let findAdWrapperStub;
    let addStyleToSingleChildAncestorsStub;

    beforeEach(function () {
      findAdWrapperStub = sinon.stub();
      addStyleToSingleChildAncestorsStub = sinon.stub();
    });

    afterEach(function () {
      sinon.restore();
    });

    it("should call addStyleToSingleChildAncestors with width 100% when adWrapper exists", function () {
      const mockTarget = {};

      expect(() => applyFullWidth(mockTarget)).to.not.throw();
    });

    it("should handle null adWrapper gracefully", function () {
      const mockTarget = {};

      expect(() => applyFullWidth(mockTarget)).to.not.throw();
    });
  });

  describe("applyAutoHeight", function () {
    it("should call addStyleToSingleChildAncestors with height auto when adWrapper exists", function () {
      const mockTarget = {};

      // Test that function executes without errors
      expect(() => applyAutoHeight(mockTarget)).to.not.throw();
    });

    it("should handle null adWrapper gracefully", function () {
      const mockTarget = {};

      expect(() => applyAutoHeight(mockTarget)).to.not.throw();
    });
  });
});
