FROM node:8-alpine
WORKDIR /app
RUN apk update && apk upgrade && apk add --no-cache \
  make \
  g++ \
  python \
  && npm install --prod
COPY . .
ENTRYPOINT ["npm"]
CMD ["start"]
