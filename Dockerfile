# Use official Node.js runtime as a base image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy only package files first (for caching)
COPY ../../src/webpush/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app source
COPY ../../src/webpush .

# Expose port
EXPOSE 3000

# Run app
CMD ["npm", "start"]