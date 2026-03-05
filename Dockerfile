FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/render/project/src

COPY package*.json ./
RUN npm ci

COPY legacy-python/requirements.txt legacy-python/requirements.txt
RUN python3 -m venv .venv \
  && .venv/bin/pip install --no-cache-dir -r legacy-python/requirements.txt

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000

EXPOSE 10000

CMD ["sh", "-c", "npm run start -- -H 0.0.0.0 -p ${PORT}"]
