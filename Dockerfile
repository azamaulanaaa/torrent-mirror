FROM node as builder

WORKDIR /app

COPY ["./package.json", "./package-lock.json", "/app/"]

RUN npm ci

COPY "./" "/app/"

RUN npm run build
RUN npm prune --production

FROM node:slim as runtime

WORKDIR /app
ENV PORT 3000
EXPOSE ${PORT}

COPY --from=builder "/app/dist/" "/app/dist/"
COPY --from=builder "/app/node_modules/" "/app/node_modules/"
COPY --from=builder "/app/package.json" "/app/package.json"

CMD ["npm", "start"]