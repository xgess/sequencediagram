# Dockerfile for Sequence Diagram Tool
# Serves static files using nginx

FROM nginx:alpine

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy application files
COPY public/ /usr/share/nginx/html/public/
COPY src/ /usr/share/nginx/html/src/
COPY lib/ /usr/share/nginx/html/lib/
COPY examples/ /usr/share/nginx/html/examples/

# Create a redirect from root to public/index.html
RUN echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/public/index.html"></head></html>' > /usr/share/nginx/html/index.html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/public/index.html || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
