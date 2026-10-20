# Molly web: the static Expo export behind nginx. Build `pnpm --filter @molly/app export:web` first.
# Configuration is runtime only: BABY_BUDDY_ORIGIN is templated into the CSP at container start.
FROM nginx:1.29-alpine

COPY --chmod=755 docker/05-require-baby-buddy-origin.sh /docker-entrypoint.d/
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY apps/molly/dist /usr/share/nginx/html

EXPOSE 80
