FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Clean Next.js cache and rebuild
RUN rm -rf .next
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
