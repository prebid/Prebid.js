import importlib.util
import pathlib
import unittest
from unittest.mock import patch

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

    def test_reject_incomplete_finding(self):
        finding = dict(FINDING, failure_case="")
        self.assertFalse(review.validate(finding, review.added_lines(PATCH)))


if __name__ == "__main__":
    unittest.main()
