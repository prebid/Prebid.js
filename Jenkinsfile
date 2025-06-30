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
       
    }
    
    stage('Checkout Player'){
        dir('playerDigiteka') {
            git branch: 'master',
                url: 'git@github.com:digiteka/playerDigitekaV2.git',
                credentialsId: '54c5b16a-e2aa-41f1-aff7-169154fd52f5'
            
            // The rest of your Groovy here...
            try{
                sh('git branch | grep -v "master" | xargs git branch -D')
            } catch (Exception e) {
                echo "A priori pas de cache des branches..."
            }
            
            sh('git fetch -p')
            sh('git checkout ' +env.BRANCH_NAME+' 2>/dev/null || git checkout -b ' +env.BRANCH_NAME)
            sh('git branch -r')
            sh('cp ../build/dist/prebid.js app/library/dtkplayer/ext_library/PrebidLibrary.js')
            
            /*withCredentials([usernamePassword(credentialsId: 'jenkins_access_repos', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                sh('git config --global user.email "jenkins@jenkins.com"')
                sh('git config --global user.name "$USERNAME"')
                sh('git commit app/library/dtkplayer/ext_library/PrebidLibrary.js -m "Update Prebid Library from Jenkins"')
                
                //sh 'echo $PASSWORD'
                // also available as a Groovy variable
                //echo USERNAME
                // or inside double quotes for string interpolation
                echo "username is $USERNAME"
                sh('git push origin ' +env.BRANCH_NAME)
            }*/
          
        }
    }
    
    stage ('Deploy') {
        dir('build/dist'){
            sh 'scp -v -o StrictHostKeyChecking=no  prebid.js root@ovh-lb5.dginfra.net:/home/web/prod/ultimedia_v2/www/js/player-digiteka/prebid-'+env.BRANCH_NAME+'.js'
        }
     }
}
