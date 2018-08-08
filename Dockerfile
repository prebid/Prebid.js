FROM node:6.11.1

MAINTAINER Stanza

# give necessary key privileges
COPY id_rsa /root/.ssh/id_rsa
COPY id_rsa.pub /root/.ssh/id_rsa.pub
RUN ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN chmod 600 /root/.ssh/id_rsa && echo "Host github.com\n\tStrictHostKeyChecking no\n" >> /root/.ssh/config

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app
RUN npm install gulp-cli -g
RUN npm install
RUN npm build

EXPOSE 9999

CMD ["npm", "start"]