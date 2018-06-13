properties([[$class: 'ParametersDefinitionProperty', parameterDefinitions: [
  [$class: 'BooleanParameterDefinition', defaultValue: true, description: 'Clean NPM install', name: 'NPM_INSTALL'],
  [$class: 'BooleanParameterDefinition', defaultValue: false, description: 'Deploy to S3', name: 'DEPLOY_TO_S3'],
  [$class: 'BooleanParameterDefinition', defaultValue: true, description: 'Unit Test', name: 'TEST_UNIT'],
  [$class: 'BooleanParameterDefinition', defaultValue: true, description: 'Build', name: 'BUILD'],
]]])

node('Auto generated CI slave') {

  stage('Cleanup') {
    sh returnStdout: true, script: 'rm -rf *'
  }

  stage('Clone source') {
    checkout scm
  }

  def S3_CREDENTIALS = [[
                          $class           : 'AmazonWebServicesCredentialsBinding',
                          accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                          credentialsId    : '794925bb-f8ff-44e5-9e47-410ca2a962ae',
                          secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                        ]]
  def buildVersion = getVersion()
  def versionUntilMinor = getVersionUntilMinor()
  def projectName = getProjectName()
  String NODE_MODULES_TGZ = "node_modules-${projectName}-${versionUntilMinor}.tgz"
  String CLIENT_BUILD_TGZ = "client_dist-${projectName}-${versionUntilMinor}.tgz"
  String CONSOLE_PACKAGES_BUCKET = "inneractive-assets/IA-JSTag/PrebidJS/dist"
  String MOBILE_WEB_PACKAGES_BUCKET = "inneractive-assets/IA-JSTag/Dist"

  if (buildVersion != null && versionUntilMinor != null && projectName != null) {
     withEnv(["PATH+NODE=${tool name: 'NodeJs 6.9.5', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'}/bin"]) {
          stage('Setting up global dependencies') {
            sh "npm set registry https://registry.npmjs.org/"
            sh 'npm install -g gulp-cli'
            if (anyBoolParamIsFalse([NPM_INSTALL, BUILD])) {
              sh "sudo pip install awscli"
            }
          }
          stage('Setting up project dependencies') {
            if (NPM_INSTALL.toBoolean()) {
              sh "npm install"
              stage('Compressing node_modules') {
                sh "tar -zvcf ${NODE_MODULES_TGZ} node_modules"
              }
              step(s3Publish(MOBILE_WEB_PACKAGES_BUCKET, NODE_MODULES_TGZ))
            } else {
              withCredentials(S3_CREDENTIALS) {
                stage('Downloading existing node_modules from S3') {
                  sh "aws s3 cp s3://${MOBILE_WEB_PACKAGES_BUCKET}/${NODE_MODULES_TGZ} ${NODE_MODULES_TGZ} --region eu-west-1"
                }
                stage("Decompressing ${NODE_MODULES_TGZ}") {
                  sh "tar -xvf ${NODE_MODULES_TGZ}"
                }
              }
            }
            sh "rm ${NODE_MODULES_TGZ}"
          }

        stage('Test') {

          if (TEST_UNIT.toBoolean()) {
            sh 'export NODE_ENV=ci'
            sh "gulp run-tests"
          }
        }

        stage('Build') {
          sh "mkdir dist"
          if (BUILD.toBoolean()) {
            sh 'export NODE_ENV=ci'
            sh "gulp zip"
            sh "mv *.zip ${CLIENT_BUILD_TGZ}"
          } else {
            withCredentials(S3_CREDENTIALS) {
              sh "aws s3 cp s3://${CONSOLE_PACKAGES_BUCKET}/${CLIENT_BUILD_TGZ} ${CLIENT_BUILD_TGZ}"
              sh "tar -xf ${CLIENT_BUILD_TGZ} -C dist"
            }
          }
        }

        stage('Package') {
          if (DEPLOY_TO_S3.toBoolean()) {
            step(s3Publish(CONSOLE_PACKAGES_BUCKET, CLIENT_BUILD_TGZ))
            sh "npm prune --production"
            sh "mkdir ../package-${buildVersion}"
            sh "mv * ../package-${buildVersion}"
            sh "mv ../package-${buildVersion} package"
            sh "tar -zcf ${projectName}-${buildVersion}.tgz package"
            step(s3Publish(CONSOLE_PACKAGES_BUCKET, "${projectName}-${buildVersion}.tgz"))
        }
      }
    }
  }
}

def getVersion() {
  def matcher = readFile("package.json") =~ '"version": "(.+)"'
  matcher ? matcher[0][1] : null
}

def getVersionUntilMinor() {
  def matcher = readFile("package.json") =~ '"version": "(\\d+\\.\\d+)\\.\\d+"'
  matcher ? matcher[0][1] : null
}

def getProjectName() {
  def matcher = readFile("package.json") =~ '"name": "(.+)"'
  matcher ? matcher[0][1] : null
}

def s3Publish(String bucket, String sourceFile) {
  [$class: 'S3BucketPublisher', pluginFailureResultConstraint: '', consoleLogLevel: 'WARNING', dontWaitForConcurrentBuildCompletion: false, entries: [[bucket: bucket, excludedFile: '', flatten: false, gzipFiles: false, keepForever: false, managedArtifacts: false, noUploadOnFailure: false, selectedRegion: 'eu-west-1', sourceFile: sourceFile, storageClass: 'STANDARD', uploadFromSlave: false, useServerSideEncryption: false]], profileName: 'Prod', userMetadata: []]
}

def anyBoolParamIsFalse(params) {
  boolean retVal = false
  for (item in params) {
    if (!item.toBoolean()) {
      retVal = true
      break
    }
  }
  retVal
}
