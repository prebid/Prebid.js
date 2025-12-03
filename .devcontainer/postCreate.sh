echo "Post Create Starting"

export NVM_DIR="/usr/local/share/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install
nvm use
npm install gulp-cli -g
npm ci
