# Root Dockerfile for Render / Cloud deployments
FROM golang:alpine AS builder

WORKDIR /app

# Enable automatic Go toolchain resolution so go.mod versions never conflict
ENV GOTOOLCHAIN=auto

# Download dependencies using root-relative path
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# Final lightweight runner container
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /app/server /app/server
RUN mkdir -p /app/uploads

EXPOSE 8080
CMD ["/app/server"]
