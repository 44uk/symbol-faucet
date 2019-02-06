FROM node:8-alpine AS builder
RUN apk update && apk upgrade && apk add --no-cache \
  make \
  g++ \
  python
WORKDIR /app
COPY . .
RUN npm install --prod

FROM node:8-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
ENTRYPOINT ["npm"]
CMD ["start"]
