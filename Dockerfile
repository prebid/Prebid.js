# Run it
# docker build -t prebid .
# docker run -ti -v "$(pwd):/Prebid.js" prebid:latest npm run build

# syntax=docker/dockerfile:1
FROM node:12-alpine AS build
COPY package*.json ./
RUN npm install --production

FROM node:12-alpine
RUN npm install -g gulp gulp-cli
COPY --from=build ./node_modules ./node_modules
WORKDIR /Prebid.js

CMD [ "npm", "run", "build" ]
