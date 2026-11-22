# Require exactly one code_comment for the known inclusive-range bug.
def explains_bounds:
  ascii_downcase
  | . as $description
  | ((($description | contains("||")) or ($description | test("(^|[^a-z])or([^a-z]|$)")))
     and (($description | contains("&&")) or ($description | test("(^|[^a-z])(and|both)([^a-z]|$)")))
     and ($description | test("(^|[^a-z])(window|range|bound|bounds|between|outside|before|after|start|end)([^a-z]|$)")));

# Models often copy the diff's leading "+" into code fields; ignore it.
def code: (. // "") | gsub("[[:space:]]"; "") | ltrimstr("+");

(.choices[0].message.tool_calls // []) as $calls
| if ($calls | type) != "array" or ($calls | length) != 1 or $calls[0].function.name != "code_comment"
  then false
  else (($calls[0].function.arguments | fromjson?) // null) as $args
    | if ($args | type) != "object" or ($args.comments | type) != "array" or ($args.comments | length) != 1
      then false
      else $args.comments[0] as $comment
        | (($comment | type) == "object") and
          ($comment.path == "src/ocrQwen35SmokeTest.ts") and
          ($comment.category == "bug") and
          ($comment.severity == "medium" or $comment.severity == "high") and
          (($comment.content // "") | type) == "string" and
          (($comment.content // "") | length) >= 20 and
          ($comment.content | explains_bounds) and
          ($comment.existing_code | code) == "returnnow>=start||now<=end;" and
          ($comment.suggestion_code | code) == "returnnow>=start&&now<=end;"
      end
  end
