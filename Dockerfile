# Use official Node 21 image
FROM node:21-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (including dev dependencies for building)
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the app (if needed)
# RUN npm run build

# Expose port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]