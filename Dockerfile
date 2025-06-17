# Use official Node 21 image
FROM node:21

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the code
COPY . .

# Expose the port (make sure it matches your .env PORT)
EXPOSE 5000

# Start the app
CMD ["npm", "start"]