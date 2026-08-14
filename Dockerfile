# JavaGhor — Node.js + JDK in one lightweight image
FROM node:20-slim

# Install a headless JDK so javac/java are available for the run endpoint
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Non-root user for running untrusted-ish code more safely
RUN useradd -m runner && chown -R runner:runner /app
USER runner

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]
