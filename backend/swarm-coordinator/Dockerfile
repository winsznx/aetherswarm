FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (Documentation only, Railway sets PORT env var)
EXPOSE 3001

# Start
CMD ["node", "dist/index.js"]
