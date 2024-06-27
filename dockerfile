FROM node:22
WORKDIR /app
COPY package*.json ./
COPY . .
EXPOSE 3001
EXPOSE 3001/udp
CMD node index.js