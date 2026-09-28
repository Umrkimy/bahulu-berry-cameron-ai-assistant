FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.31-alpine
ARG VITE_API_BASE_URL=http://localhost:8000/api
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Allow the dashboard's CSP to reach an API served from another origin.
RUN origin="$(printf '%s' "$VITE_API_BASE_URL" | sed -nE 's#^(https?://[A-Za-z0-9.:-]+).*#\1#p')" \
    && sed -i "s#__API_ORIGIN__#${origin}#g" /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
