FROM node:9-alpine AS builder
RUN apk update && apk upgrade && apk add --no-cache \
  make \
  g++ \
  python \
  vim
WORKDIR /app
COPY . .
RUN npm install --prod --no-optional && npm run build

FROM node:9-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
COPY --from=builder /usr/bin/xxd /usr/bin/xxd
CMD ["npm", "start"]
