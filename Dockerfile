FROM node:14

# Create app directory
RUN mkdir -p /usr/src/app/src
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install --production

# Copy src files
COPY ./src /usr/src/app/src

EXPOSE 12008
CMD [ "npm", "start" ]
