# Árbitro de P2P Fiat para Cloudflare Containers (modo server: el Worker lo despierta con POST /tick).
# Sin secretos en la imagen: P2P_ARBITER_TOKEN, ARBITER_STATE_KEY y demás llegan como variables al arrancar.
FROM node:22.17.1-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production ARBITER_MODE=server PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src ./src

USER node
EXPOSE 8080
CMD ["node", "src/main.mjs"]
