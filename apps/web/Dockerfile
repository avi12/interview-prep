# syntax=docker/dockerfile:1
FROM node:24-slim AS server-deps
WORKDIR /deps
COPY apps/web/dist-server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts && npm cache clean --force

FROM node:24-slim
ENV NODE_ENV=production \
    NODE_OPTIONS=--enable-source-maps \
    PORT=8080
WORKDIR /app
COPY --from=server-deps /deps/node_modules apps/web/dist-server/node_modules
COPY apps/web/dist-server/package.json apps/web/dist-server/server.js apps/web/dist-server/server.js.map apps/web/dist-server/
COPY apps/web/dist-client/ apps/web/dist-client/
COPY dist/index.json dist/index.json
COPY dist/lessons/ dist/lessons/
COPY dist/runner/ dist/runner/
COPY assets/ assets/
USER node
EXPOSE 8080
CMD ["node", "apps/web/dist-server/server.js"]
