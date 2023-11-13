# syntax = docker/dockerfile:1.3

# ---- Build ----
FROM node:16 as build
RUN apt-get update && apt-get install -y jq gettext
ENV YARN_CACHE_FOLDER=/tmp/yarn-cache
# web user with nginx group
# 101 is nginx group in nginx-alpine image
RUN --mount=type=cache,target=/tmp/yarn-cache,mode=777,sharing=locked \
    groupadd -g 101 -o nginx && \
    useradd -u 1001 -g 101 -m web && \
    mkdir -p /app $YARN_CACHE_FOLDER && \
    chmod a+w $YARN_CACHE_FOLDER/. && \
    chown -R web: ~web /app $YARN_CACHE_FOLDER
# switch to web user
WORKDIR /app
USER web
ENV HOME=/home/web
# install app as regular web user
ARG VER
COPY --chown=web: ./ ./
# set src/config.js files
RUN --mount=type=cache,target=/tmp/yarn-cache,mode=777,sharing=locked \
    BACK_URL='' \
    BACK_FIRST_PART='XXXXXX' \
    MAPBOX_TOKEN='###MAPBOX_PUBLIC_KEY###' \
    yarn run setup && \
    yarn install && \
    yarn run i18n-compile && \
    yarn run build
RUN cd dist && \
    jq -r .version ../package.json > version && \
    for bjs in *.js; do \
        sha_bjs=$(sha1sum $bjs|tr -s ' ' '.'); \
        mv $bjs $sha_bjs && \
        mv ${bjs}.map ${sha_bjs}.map && \
        sed -ri "s|$bjs|$sha_bjs|" $sha_bjs && \
        sed -ri "s|$bjs|$sha_bjs|" ${sha_bjs}.map && \
        sed -ri "s|/$bjs|/$sha_bjs|" index.html; \
    done

# --- Deploy ---
FROM nginx:stable-alpine as deploy
RUN apk update && apk upgrade
# Fix nginx perms for web user
# Set the privileges for nginx executable to run on privileged ports (<1024)
RUN adduser -u 1001 -G nginx -H -D web && \
    chown -R :nginx /etc/nginx/nginx.conf /etc/nginx/conf.d /usr/share/nginx/html /var/cache/nginx /var/log/nginx && \
    chmod -R g+w /etc/nginx/nginx.conf /etc/nginx/conf.d /usr/share/nginx/html /var/cache/nginx /var/log/nginx && \
    apk add libcap && \
    setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx && \
    sed -ri '/^user /d' /etc/nginx/nginx.conf && \
    sed -ri 's|^ *index .*$|        try_files $uri $uri/ /index.html =404;\n|' /etc/nginx/conf.d/default.conf && \
    sed -ri '/^\}/s|.*|location = /version {\nroot /usr/share/nginx/html;\nadd_header Content-Type "text/plain; charset=utf-8";\n}\n\0|' /etc/nginx/conf.d/default.conf && \
    chown web: /run
COPY ./docker/99-config.sh /docker-entrypoint.d/
COPY --from=build /app/dist /usr/share/nginx/html
ARG VER
LABEL version=$VER
LABEL maintainer="Cyrille Pontvieux <cpontvieux@systra.com>"
# switch to web user
USER web
