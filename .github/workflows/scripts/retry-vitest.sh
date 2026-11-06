#!/usr/bin/env bash
# Runs a Vitest command up to 3 times, again only when it failed for want of a browser connection
# (test/vitest/infraFailureReporter.mjs leaves the marker then). Failing tests fail at once, and a retry runs every
# file again rather than the ones that didn't finish, so specs that interfere with each other still show.
marker=build/vitest-infra-failure
for attempt in 1 2 3; do
  rm -f "$marker"
  "$@" && exit 0
  status=$?
  if [[ $attempt -eq 3 || ! -e $marker ]]; then
    exit "$status"
  fi
  echo "::warning::Vitest lost its browser connection (attempt $attempt of 3); retrying the whole run"
done
