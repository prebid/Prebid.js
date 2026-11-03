import importlib.util
import pathlib
import os
import tempfile
import json
import unittest
from unittest.mock import patch, MagicMock

target = pathlib.Path(__file__).with_name("bounded_qwen_review.py")
spec = importlib.util.spec_from_file_location("bounded_qwen_review", target)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)

PATCH = "@@ -0,0 +1,3 @@\n+export function inWindow(x, a, b) {\n+  return x >= a || x <= b;\n+}\n"
FINDING = {
    "line": 2,
    "quote": "  return x >= a || x <= b;",
    "problem": "The OR condition accepts numbers outside the intended range.",
    "failure_case": "For a=2, b=5 and x=0, this returns true instead of false.",
    "fix": "  return x >= a && x <= b;",
}


class ReviewTests(unittest.TestCase):
    def test_hunk_new_side_lines(self):
        self.assertEqual(review.added_lines(PATCH)[2], "  return x >= a || x <= b;")

    def test_removed_lines_not_commentable(self):
        patch = "@@ -1,3 +1,3 @@\n function example(x) {\n-  return false;\n+  return !!x;\n }"
        self.assertEqual(review.added_lines(patch), {2: "  return !!x;"})

    def test_valid_finding(self):
        self.assertTrue(review.validate(FINDING, review.added_lines(PATCH)))

    def test_reject_wrong_anchor(self):
        finding = dict(FINDING, quote="  return x >= a && x <= b;")
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))

    def test_reject_unadded_line(self):
        finding = dict(FINDING, line=77)
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))

    def test_reject_comment_anchor(self):
        finding = dict(FINDING, line=1, quote="// test comment")
        self.assertFalse(review.validate(finding, {1: "// test comment"}))

    def test_reject_noop_fix(self):
        finding = dict(FINDING, fix="  return x >= a || x <= b;")
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))

    def test_reject_formatting_only_fix(self):
        finding = dict(FINDING, fix="return   x>=a||x<=b ;")
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))

    def test_reject_whole_function_rewrite(self):
        finding = dict(FINDING, fix="function f(x) { return x >= a && x <= b; }")
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))

    def test_review_loop_records_clean_diagnostic(self):
        file = {"filename": "src/example.ts", "status": "added", "patch": PATCH}
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {
            "GITHUB_REPOSITORY": "prebid/Prebid.js",
            "PR_NUMBER": "15928",
            "PR_HEAD_SHA": "a" * 40,
            "GITHUB_TOKEN": "test-only",
            "RUNNER_TEMP": directory,
            "REVIEW_MODEL": "test-model",
        }), patch.object(review, "paged", side_effect=lambda repo, number, token, endpoint: (
            [file] if endpoint == "files" else []
        )), patch.object(review, "predict", return_value=([], {"message": {"content": '{"findings":[]}'}})):
            review.main()
            report = json.loads((pathlib.Path(directory) / "bounded-qwen-result.json").read_text())
            self.assertEqual(report["reviewed"], 1)
            self.assertEqual(report["files"][0]["outcome"], "clean")
            self.assertEqual(report["files"][0]["parsed_findings"], [])
            self.assertIn("raw_response", report["files"][0])

    def test_chunk_preserves_added_line_numbers(self):
        diff = ("@@ -1,5 +1,6 @@\n existing\n-old\n+new\n"
                "+++literal plus\n unchanged\n+return okay;\n"
                "@@ -10,0 +11,2 @@\n+return another;\n+}\n")
        chunks, omitted = review.chunk_patch(diff, max_chars=110)
        self.assertEqual(omitted, 0)
        self.assertGreater(len(chunks), 1)
        collected = {}
        for chunk in chunks:
            self.assertLessEqual(len(chunk), 110)
            collected.update(review.added_lines(chunk))
        self.assertEqual(collected[2], "new")
        self.assertEqual(collected[3], "++literal plus")
        self.assertEqual(collected[5], "return okay;")
        self.assertEqual(collected[11], "return another;")

    def test_chunk_too_long_line_is_omitted_not_truncated(self):
        diff = "@@ -0,0 +1,3 @@\n+" + "x" * 300 + "\n+return true;\n+}\n"
        chunks, omitted = review.chunk_patch(diff, max_chars=120)
        self.assertEqual(omitted, 1)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(review.added_lines(chunks[0]), {2: "return true;", 3: "}"})

    def test_small_smoke_single_chunk(self):
        chunks, omitted = review.chunk_patch(PATCH)
        self.assertEqual(omitted, 0)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(review.added_lines(chunks[0]), review.added_lines(PATCH))

    def test_timeout_is_logged_without_marking_chunk_clean(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(
            review, "predict", side_effect=TimeoutError("timed out")
        ):
            report = {"files": [], "chunks_unreviewed": 0, "skipped_files": [],
                      "errors": [], "rejected": 0, "posted": 0}
            review.review_chunk("test-model", "src/test.ts", PATCH, 1, 1,
                                "a" * 40, "prebid/Prebid.js", "1", "token",
                                set(), report, pathlib.Path(directory) / "result.json")
            self.assertEqual(report["chunks_unreviewed"], 1)
            self.assertEqual(report["files"][0]["outcome"], "inference_timeout")

    def test_truncated_json_is_unreviewed_not_error(self):
        # Fork replay run 41087339834: output hit num_predict mid-string.
        raw = {"message": {"content": '{"findings": [{"line": 2, "problem": "unterminated'},
               "eval_count": 650}
        with tempfile.TemporaryDirectory() as directory, patch.object(
            review, "api", return_value=raw
        ):
            report = {"files": [], "chunks_unreviewed": 0, "skipped_files": [],
                      "errors": [], "rejected": 0, "posted": 0}
            review.review_chunk("test-model", "src/test.ts", PATCH, 1, 1,
                                "a" * 40, "prebid/Prebid.js", "1", "token",
                                set(), report, pathlib.Path(directory) / "result.json")
            self.assertEqual(report["errors"], [])
            self.assertEqual(report["chunks_unreviewed"], 1)
            self.assertEqual(report["files"][0]["outcome"], "unparseable_response")
            self.assertEqual(report["files"][0]["raw_response"], raw)

    def test_production_first_file_limit_skip_diagnostics(self):
        # GitHub can return test files before production files.
        files = [{"filename": f"test/spec/file{i}.js", "status": "modified", "patch": PATCH}
                 for i in range(8)]
        files.append({"filename": "modules/production.ts", "status": "modified", "patch": PATCH})
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {
            "GITHUB_REPOSITORY": "prebid/Prebid.js",
            "PR_NUMBER": "15942",
            "PR_HEAD_SHA": "a" * 40,
            "GITHUB_TOKEN": "test-only",
            "RUNNER_TEMP": directory,
            "REVIEW_MODEL": "test-model",
        }), patch.object(review, "paged", side_effect=lambda repo, number, token, endpoint: (
            files if endpoint == "files" else []
        )), patch.object(review, "predict", return_value=([], {"message": {"content": '{"findings":[]}'}})):
            review.main()
            report = json.loads((pathlib.Path(directory) / "bounded-qwen-result.json").read_text())
            skipped = [item["path"] for item in report["skipped_files"]
                       if item["reason"] == "file_count_limit"]
            self.assertEqual(skipped, ["test/spec/file7.js"])
            self.assertNotIn("modules/production.ts", skipped)
            self.assertIn("modules/production.ts", [item["path"] for item in report["files"]])

    def test_reject_fix_that_reverts_removed_line(self):
        # prebid.github.io#6894: the model "fixed" an intended change back.
        diff = ("@@ -91,3 +91,3 @@\n"
                "             var filename = \"prebid\" + form_data[\"version\"] + \".js\";\n"
                "-            var jsBlob = new Blob([data], { type: \"text/javascript\" });\n"
                "+            var jsBlob = new Blob([data.source], { type: \"text/javascript\" });\n")
        finding = dict(FINDING, line=92,
                       quote="            var jsBlob = new Blob([data.source], { type: \"text/javascript\" });",
                       fix="var jsBlob = new Blob([data], {type: \"text/javascript\"});")
        self.assertEqual(review.replaced_lines(diff, 92),
                         ["            var jsBlob = new Blob([data], { type: \"text/javascript\" });"])
        self.assertTrue(review.validate(finding, review.added_lines(diff)))
        self.assertFalse(review.validate(finding, review.added_lines(diff), review.replaced_lines(diff, 92)))

    def test_deletion_in_another_block_does_not_block_fix(self):
        # The hunk deletes "return x >= a && x <= b;" elsewhere; fixing the
        # flagged line to that text does not revert this block's change.
        diff = ("@@ -1,6 +1,5 @@\n"
                "-  return x >= a && x <= b;\n"
                " }\n"
                " export function inWindow(x, a, b) {\n"
                "+  return x >= a || x <= b;\n"
                " }\n")
        lines = review.added_lines(diff)
        finding = dict(FINDING, line=3)
        self.assertEqual(review.replaced_lines(diff, 3), [])
        self.assertTrue(review.validate(finding, lines, review.replaced_lines(diff, 3)))

    def test_replaced_lines_cover_multi_line_block(self):
        diff = ("@@ -1,4 +1,4 @@\n context\n-old one\n-old two\n+new one\n+new two\n context\n")
        self.assertEqual(review.replaced_lines(diff, 3), ["old one", "old two"])
        self.assertEqual(review.replaced_lines(diff, 1), [])
        self.assertEqual(review.replaced_lines(diff, "2"), [])

    # Fork replays of real fixes: patmmccann/Prebid.js#341 (Intenze #15766
    # reverted), #342 (Missena #15850 reverted) and #343 (the Intenze fix).
    INTENZE_BUG = ("@@ -55,7 +55,7 @@\n   imp(buildImp, bidRequest, context) {\n"
                   "     const imp = buildImp(bidRequest, context);\n \n"
                   "-    if (imp.bidfloor == null && bidRequest.params.bidfloor != null) {\n"
                   "+    if (!imp.bidfloor && bidRequest.params.bidfloor) {\n"
                   "       imp.bidfloor = bidRequest.params.bidfloor;\n")
    INTENZE_SPEC_DELETED = ['    it("sends a zero params.bidfloor", function () {',
                            '          params: { placementId: "25", bidfloor: 0 },',
                            '      expect(requests[0].data.imp[0].bidfloor).to.equal(0);']
    INTENZE_FINDING = dict(FINDING, line=58,
                           quote="if (!imp.bidfloor && bidRequest.params.bidfloor)",
                           fix="if (imp.bidfloor == null && bidRequest.params.bidfloor != null)")

    def intenze(self, spec_removed):
        lines = review.added_lines(self.INTENZE_BUG)
        finding = review.normalize_finding(self.INTENZE_FINDING, lines)
        return finding, review.validate(finding, lines, review.replaced_lines(self.INTENZE_BUG, 58),
                                        spec_removed)

    def test_partial_quote_is_completed(self):
        finding, _ = self.intenze([])
        self.assertEqual(finding["quote"], "if (!imp.bidfloor && bidRequest.params.bidfloor) {")
        self.assertEqual(finding["fix"], "if (imp.bidfloor == null && bidRequest.params.bidfloor != null) {")

    def test_tested_regression_restore_accepted(self):
        self.assertTrue(self.intenze(self.INTENZE_SPEC_DELETED)[1])

    def test_untested_revert_still_rejected(self):
        self.assertFalse(self.intenze([])[1])
        self.assertFalse(self.intenze(["  it('renders the creative', () => {"])[1])

    def test_condition_fix_that_is_not_a_restore_rejected(self):
        clean = ("@@ -55,7 +55,7 @@\n \n-    if (!imp.bidfloor && bidRequest.params.bidfloor) {\n"
                 "+    if (imp.bidfloor == null && bidRequest.params.bidfloor != null) {\n")
        finding = dict(FINDING, line=56,
                       quote="if (imp.bidfloor == null && bidRequest.params.bidfloor != null) {",
                       fix="if (!imp.bidfloor && bidRequest.params.bidfloor != null) {")
        lines = review.added_lines(clean)
        self.assertFalse(review.validate(finding, lines, review.replaced_lines(clean, 56),
                                         self.INTENZE_SPEC_DELETED))

    def test_tested_return_restore_accepted(self):
        missena = ("@@ -142,5 +142,5 @@\n    */\n   isBidRequestValid: function (bid) {\n"
                   "-    return !!(bid && typeof bid === 'object' && bid.params && bid.params.apiKey);\n"
                   "+    return typeof bid === 'object' && !!bid.params.apiKey;\n   },\n")
        finding = dict(FINDING, line=144, quote="return typeof bid === 'object' && !!bid.params.apiKey;",
                       fix="return !!(bid && typeof bid === 'object' && bid.params && bid.params.apiKey);")
        lines, replaced = review.added_lines(missena), review.replaced_lines(missena, 144)
        self.assertTrue(review.validate(finding, lines, replaced,
                                        ["        spec.isBidRequestValid({ ...bid, params: {} }),"]))
        self.assertFalse(review.validate(finding, lines, replaced, []))

    def test_new_adapter_false_positives_rejected(self):
        # patmmccann/Prebid.js#349 (Ad Spiro replay): both "fixes" were wrong.
        self.assertFalse(review.meaningful_fix(
            "const data = converter.toORTB({ bidRequests, bidderRequest });",
            "const data = converter.toORTB({ bidRequests, bidderRequest: bidderRequest });"))
        self.assertFalse(review.meaningful_fix(
            "const query = params.toString() ? `?${params}` : '';",
            "const query = params.toString();"))

    def test_literal_preserving_fixes_still_accepted(self):
        self.assertTrue(review.meaningful_fix(
            "return typeof bid === 'object' && !!bid.params.apiKey;",
            "return !!(bid && typeof bid === 'object' && bid.params && bid.params.apiKey);"))
        self.assertTrue(review.meaningful_fix("const sep = url.includes('?') ? '?' : '&';",
                                              "const sep = url.includes('?') ? '&' : '?';"))

    def test_ambiguous_partial_quote_not_reanchored(self):
        lines = {1: "  if (a && b) { x(); }", 2: "  if (a && b) { y(); }"}
        finding = dict(FINDING, line=7, quote="if (a && b) {", fix="if (a || b) {")
        self.assertEqual(review.normalize_finding(finding, lines), finding)

    def test_spec_deleted_lines_match_module(self):
        patches = {"test/spec/modules/intenzeBidAdapter_spec.js": "@@ -1,2 +1,1 @@\n-gone\n kept",
                   "test/spec/modules/otherBidAdapter_spec.js": "@@ -1,1 +0,0 @@\n-other"}
        self.assertEqual(review.spec_deleted_lines("modules/intenzeBidAdapter.js", patches), ["gone"])

    def test_reject_incomplete_finding(self):
        finding = dict(FINDING, failure_case="")
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))


if __name__ == "__main__":
    unittest.main()
