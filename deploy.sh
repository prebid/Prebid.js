# deploy.sh
#! /bin/bash

SHA1=$1
ENV=$2
PORT=$3

TEST_1_TRIGGER_BRANCH="master"
AWS_APPLICATION_NAME="Stanza Prebid"
EB_ENV_NAME_ROOT="stanza-prebid"
DOCKER_PATH="stanza/prebid"

if [[ ($ENV = "production" && $CIRCLE_BRANCH = "production") || ($ENV = "staging" && ($CIRCLE_BRANCH = $TEST_1_TRIGGER_BRANCH || $CIRCLE_BRANCH = "staging")) || ( $TEST_PUSH && $TEST_PUSH = "staging" && $ENV != "production" ) ]]; then
	echo "Beginning deployment of branch ${CIRCLE_BRANCH} to ${ENV} environment with TEST_PUSH: ${TEST_PUSH}, TEST_ENV: ${TEST_ENV}"
	# Deploy image to Docker Hub
	docker push $DOCKER_PATH:$SHA1

	# Create new Elastic Beanstalk version
	EB_BUCKET=elasticbeanstalk-us-west-2-334133020808
	DATE_TIME_STAMP=$(date +"%Y-%m-%d_%T")
	DOCKERRUN_FILE=$DATE_TIME_STAMP-$SHA1-Dockerrun.aws.json
	sed "s/<AWS_SECRET_ACCESS_KEY>/$AWS_SECRET_ACCESS_KEY/;s/<AWS_ACCESS_KEY_ID>/$AWS_ACCESS_KEY_ID/;s/<TAG>/$SHA1/;s/<ENV>/$ENV/;s/<PORT>/$PORT/" < Dockerrun.aws.json.template > $DOCKERRUN_FILE

	aws s3 cp $DOCKERRUN_FILE s3://$EB_BUCKET/$DOCKERRUN_FILE
	aws elasticbeanstalk create-application-version --application-name "$AWS_APPLICATION_NAME" \
	  --version-label $DATE_TIME_STAMP-$SHA1 --source-bundle S3Bucket=$EB_BUCKET,S3Key=$DOCKERRUN_FILE

	# Figure out which testing env to use
	# Supports deploying master to test-2 via a boton command
	if [[ ($CIRCLE_BRANCH = $TEST_1_TRIGGER_BRANCH) && (! $TEST_ENV) ]]; then
		TEST_ENV="test-1"
	fi

	if [[ (! $TEST_ENV )]]; then
		EB_ENV=$ENV
	else
		EB_ENV=$ENV-$TEST_ENV
	fi

	# Update Elastic Beanstalk environment to new version
	aws elasticbeanstalk update-environment --environment-name $EB_ENV_NAME_ROOT-$EB_ENV \
	    --version-label $DATE_TIME_STAMP-$SHA1
else
	echo "Skipping deployment of branch ${CIRCLE_BRANCH} to ${ENV} environment"
fi
