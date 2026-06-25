# 1. Choose the operating system and language
FROM node:20-alpine

# 2. Create a folder inside the container to hold our app
WORKDIR /app

# 3. Copy ONLY the package files first
COPY package*.json ./

# 4. Install the dependencies
RUN npm install

# 5. Copy the rest of your Titan Gate code
COPY . .

# 6. Open a hole in the container so traffic can get in
EXPOSE 5000

# 7. The final command to start the engine
CMD ["node", "server.js"]