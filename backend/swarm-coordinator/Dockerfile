FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set health port environment variable
ENV HEALTH_PORT=8081

# Expose health check port
EXPOSE 8081

# Start
CMD ["npm", "start"]
