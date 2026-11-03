"""Check the OCR preflight validator before costly Ollama initialization."""
import json
from pathlib import Path
import subprocess
import unittest

CHECK = Path(__file__).with_name("ocr_preflight_check.jq")
BUG = "return now >= start || now <= end;"
FIX = "return now >= start && now <= end;"
COMMENT = {
    "path": "src/ocrQwen35SmokeTest.ts",
    "category": "bug",
    "severity": "high",
    "content": ("The OR (||) condition accepts every number outside the inclusive "
                "window. Use AND (&&) to require both start and end boundaries."),
    "existing_code": BUG,
    "suggestion_code": FIX,
}

def response(comment=None, calls=None):
    if calls is None:
        calls = [{"function": {"name": "code_comment",
                 "arguments": json.dumps({"comments": [comment or COMMENT]})}}]
    return {"choices": [{"message": {"tool_calls": calls}}]}

def valid(value):
    result = subprocess.run(["jq", "-e", "-f", str(CHECK)], input=json.dumps(value),
                            text=True, capture_output=True)
    if "compile error" in result.stderr:
        raise AssertionError(result.stderr)
    return result.returncode == 0

class Tests(unittest.TestCase):
    def test_valid(self):
        self.assertTrue(valid(response()))

    def test_actual_model_response(self):
        comment = {**COMMENT, "content": (
            "The condition 'now >= start || now <= end' has a logical error. "
            "It returns true if now is >= start OR now <= end, which accepts "
            "every number outside the inclusive window [start, end]. We need "
            "both comparisons, AND (&&), to reject values outside the bounds.")}
        self.assertTrue(valid(response(comment)))

    def test_copied_diff_plus_prefix(self):
        # Fork replay run 41087339676: correct fix, but with the diff's "+".
        self.assertTrue(valid(response({**COMMENT, "existing_code": "+  " + BUG,
                                        "suggestion_code": "+  " + FIX})))

    def test_extra_tool_call(self):
        item = response()
        item["choices"][0]["message"]["tool_calls"].append(
            {"function": {"name": "task_done", "arguments": '{"state":"DONE"}'}})
        self.assertFalse(valid(item))

    def test_flat_arguments(self):
        self.assertFalse(valid(response(calls=[{"function": {
            "name": "code_comment", "arguments": json.dumps(COMMENT)}}])))

    def test_wrong_fix(self):
        self.assertFalse(valid(response({**COMMENT,
            "suggestion_code": "return now >= start && now < end;"})))

    def test_unrelated_explanation(self):
        self.assertFalse(valid(response({**COMMENT,
            "content": "This implementation does not handle division by zero."})))

    def test_substring_false_positive(self):
        self.assertFalse(valid(response({**COMMENT,
            "content": "Change || to && because it is recommended."})))

    def test_malformed(self):
        self.assertFalse(valid(response(calls=[{"function": {
            "name": "code_comment", "arguments": "{invalid"}}])))
        self.assertFalse(valid({"choices": [{"message": {"tool_calls": []}}]}))

if __name__ == "__main__":
    unittest.main()
