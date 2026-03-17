# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build step if necessary (though using tsx in dev/seed)
# For production, we would use tsc
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
