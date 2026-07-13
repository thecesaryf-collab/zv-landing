# Sitio 100% estático servido con Nginx.
# Nginx sí soporta Range requests → los vídeos cargan y hacen seek sin fallos.
FROM nginx:alpine

# Config propia (streaming de vídeo, cache, etc.)
COPY nginx.conf /etc/nginx/nginx.conf

# Los archivos del sitio. El .dockerignore excluye lo que no va a producción.
COPY . /usr/share/nginx/html

# Quitamos del contenedor los archivos que no deben servirse
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/.gitignore

EXPOSE 80
