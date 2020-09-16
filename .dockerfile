FROM node:latest-slim

EXPOSE ${PORT}
COPY package.json package.json
RUN npm clean-install

COPY . .

CMD ["npm", "start"]