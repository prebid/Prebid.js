#!/bin/bash

aws s3 cp ./gpt/definemedia_hello_world.html s3://conative-testpages/test.conative.de/prebid_js/definemedia_hello_world.html
aws s3 cp ./gpt/definemedia_integration-test.html s3://conative-testpages/test.conative.de/prebid_js/definemedia_integration-test.html

aws s3 cp ../build s3://conative-testpages/test.conative.de/build --recursive
