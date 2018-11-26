node {
    env.NODEJS_HOME = "${tool 'node8.4.0'}"
    // on linux / mac voila3
    env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
    
    stage('Checkout'){
        echo 'Pulling...' + env.BRANCH_NAME
        checkout scm   
    }
    
    stage('Build'){
        //sh('npm install')
        //sh('node ./node_modules/gulp/bin/gulp.js build --modules=modules.json')
       
    }
    
    stage('Checkout Player'){
        dir('playerDigiteka') {
            git branch: 'master',
                url: 'https://github.com/digiteka/playerDigiteka.git',
                credentialsId: '54c5b16a-e2aa-41f1-aff7-169154fd52f5'
            
            // The rest of your Groovy here...
            //sh('git clone https://github.com/digiteka/playerDigiteka.git .')
            sh('git checkout ft-' +env.BRANCH_NAME+' 2>/dev/null || git checkout -b ft-' +env.BRANCH_NAME)
            sh('git branch')
            //sh('cp ../prebid.js src/app/library/dtkplayer/addons/PrebidLibrary.js')
            //sh('git commit src/app/library/dtkplayer/addons/PrebidLibrary.js -m "Update Prebid Library from Jenkins"')
           withCredentials([usernamePassword(credentialsId: '54c5b16a-e2aa-41f1-aff7-169154fd52f5', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
            sh 'echo $PASSWORD'
          // also available as a Groovy variable
          echo USERNAME
          // or inside double quotes for string interpolation
          echo "username is $USERNAME"
               sh('git push origin ft-' +env.BRANCH_NAME)
            }
          
        }
    }
    
    stage ('Deploy') {
        dir('build/dist'){
            sh 'scp -v -o StrictHostKeyChecking=no  prebid.js root@ovh-lb5.dginfra.net:/home/web/prod/ultimedia_v2/www/js/player-digiteka/prebid-'+env.BRANCH_NAME+'.js'
        }
     }
}
