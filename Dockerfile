FROM node:8-alpine
RUN apk update && apk upgrade && apk add --no-cache \
  make \
  g++ \
  python
WORKDIR /app
COPY . .
RUN npm install --prod
ENTRYPOINT ["npm"]
CMD ["start"]
