FROM node:10-alpine AS builder
RUN apk update && apk upgrade && apk add --no-cache \
  make \
  g++ \
  python
WORKDIR /app
COPY . .
RUN npm install --prod && npm run build

FROM node:10-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
CMD ["npm", "start"]
