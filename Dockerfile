FROM node:20

WORKDIR /app

COPY my-video/package*.json ./

RUN npm install

COPY my-video .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]