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

    def test_reject_incomplete_finding(self):
        finding = dict(FINDING, failure_case="")
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))


if __name__ == "__main__":
    unittest.main()
