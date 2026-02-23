# /vote-guard-server/Dockerfile (Backend)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Create a volume or directory for blockchain persistent storage
# In Hugging Face, /data is usually used for persistent storage
RUN mkdir -p /app/data

# Hugging Face Spaces expose port 7860
ENV PORT 7860
EXPOSE 7860

# Start the Node.js server
CMD ["npm", "start"]
