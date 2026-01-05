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

# Set port environment variable
ENV PORT=8081

# Expose port
EXPOSE 8081

# Start
CMD ["node", "dist/index.js"]
