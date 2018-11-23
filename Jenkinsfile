node {
    env.NODEJS_HOME = "${tool 'node8.4.0'}"
    // on linux / mac voila33
    env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
    
    stage('Checkout'){
        echo 'Pulling...' + env.BRANCH_NAME
        checkout scm   
    }
    
    stage('Build'){
        //dir('src'){
            //sh('npm install')
            //sh('npm run build')
        //}
    }
    
    stage ('Deploy') {
        //dir('src/build'){
         //sh 'scp -v -o StrictHostKeyChecking=no  dtkplayer-vjs.js root@ovh-lb5.dginfra.net:/home/web/prod/ultimedia_v2/www/js/player-digiteka/dtkplayer-vjs-'+env.BRANCH_NAME+'.js'
        //}
     }
}
