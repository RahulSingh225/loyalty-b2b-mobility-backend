FROM node:18-alpine

WORKDIR /app

# Install Yarn
RUN npm install -g yarn

# Copy root package.json and workspace configuration
COPY package.json yarn.lock ./

# Copy shared packages
COPY packages/shared-db ./packages/shared-db
COPY packages/shared-utils ./packages/shared-utils

# Copy service
COPY apps/master-service ./apps/master-service

# Install dependencies
RUN yarn install --frozen-lockfile

# Build shared packages
RUN yarn workspace @loyalty/shared-db build
RUN yarn workspace @loyalty/shared-utils build

# Build service
RUN yarn workspace master-service build

EXPOSE 3002

CMD ["yarn", "workspace", "master-service", "start"]
