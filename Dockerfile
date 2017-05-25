FROM node:6.10.3

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
RUN apt-get update && apt-get install -y libsodium-dev
RUN npm install sodium --unsafe-perm
COPY package.json /usr/src/app/
RUN npm install --production

# Bundle app statics
RUN mkdir -p /usr/src/app/src/static
COPY ./src/static /usr/src/app/src/static

# Bundle app statics
RUN mkdir -p /usr/src/app/src/server
COPY ./src/server /usr/src/app/src/server

EXPOSE 12004
EXPOSE 12005
CMD [ "npm", "start" ]
