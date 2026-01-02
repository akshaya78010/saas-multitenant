FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend application code
COPY backend/ .

# Copy database migrations and seeds
COPY database ./database

# Expose port
EXPOSE 5000

# Start server (migrations and seeds run automatically in server.js)
CMD ["node", "src/server.js"]

