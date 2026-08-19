FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# For local docker-compose only. Production deploys build a static bundle
# on Vercel instead of running this dev server (see docs/architecture).
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
