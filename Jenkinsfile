node {
    env.NODEJS_HOME = "${tool 'node8.4.0'}"
    // on linux / mac voila3
    env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
    
    stage('Checkout'){
        echo 'Pulling...' + env.BRANCH_NAME
        checkout scm   
    }
    
    stage('Build'){
        sh('npm install')
        sh('node ./node_modules/gulp/bin/gulp.js build --modules=modules.json')
        
        dir('playerdigiteka') {
            sh('git clone https://davydgtk:af7ab00e1a960fd0c6a681793008c85c65d5a65a@github.com/digiteka/playerDigiteka.git .')
            sh('git checkout -f ft-' +env.BRANCH_NAME)
            sh('cp ../prebid.js src/app/library/dtkplayer/addons/PrebidLibrary.js')
            sh('git commit src/app/library/dtkplayer/addons/PrebidLibrary.js -m "Update Prebid Library from Jenkins"')
            sh('git push origin ft-' +env.BRANCH_NAME)
        }
    }
    
    stage ('Deploy') {
        dir('build/dist'){
            sh 'scp -v -o StrictHostKeyChecking=no  prebid.js root@ovh-lb5.dginfra.net:/home/web/prod/ultimedia_v2/www/js/player-digiteka/prebid-'+env.BRANCH_NAME+'.js'
        }
     }
}
