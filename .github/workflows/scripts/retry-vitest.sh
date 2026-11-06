#!/usr/bin/env bash
# Runs a Vitest command up to 4 times, again only when it failed for want of a browser connection
# (test/vitest/infraFailureReporter.mjs leaves the marker then). Failing tests fail at once, and a retry runs every
# file again rather than the ones that didn't finish, so specs that interfere with each other still show.
marker=build/vitest-infra-failure
attempts=4
for ((attempt = 1; attempt <= attempts; attempt++)); do
  rm -f "$marker"
  "$@" && exit 0
  status=$?
  if [[ $attempt -eq $attempts || ! -e $marker ]]; then
    exit "$status"
  fi
  # keep in sync with QUEUE_FULL in infraFailureReporter.mjs
  if [[ $(<"$marker") == queue-full ]]; then
    delay=$((attempt * 2))
    echo "::warning::BrowserStack's session queue is full (attempt $attempt of $attempts); retrying the whole run in ${delay} minutes"
    sleep $((delay * 60))
  else
    echo "::warning::Vitest lost its browser connection (attempt $attempt of $attempts); retrying the whole run"
  fi
done
