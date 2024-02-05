FROM node:18

RUN apt-get update && apt-get install -y gcc g++ make build-essential chromium

RUN npm install --global gulp-cli

ENV CHROME_BIN=/usr/bin/chromium

WORKDIR /srv

ADD . .

# RUN npm ci && npm test

# CMD ["gulp", "serve", "--host=0.0.0.0", "--modules=consentManagement,criteoIdSystem,adyoulikeBidAdapter,pubmaticBidAdapter"]
# CMD ["gulp", "serve", "--host=0.0.0.0", "--modules=consentManagement,adyoulikeBidAdapter"]
CMD ["gulp", "serve-fast", "--host=0.0.0.0", "--modules=consentManagement,adyoulikeBidAdapter"]
