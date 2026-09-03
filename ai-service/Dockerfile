# The AI service. tsx runs the TypeScript directly, same as `npm start`
# has always done locally and on Railway.
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# Dev deps included on purpose: tsx and typescript live there.
RUN npm ci --include=dev

COPY . .

EXPOSE 8001
CMD ["npm", "start"]