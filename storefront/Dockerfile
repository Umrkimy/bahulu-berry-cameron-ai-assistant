FROM node:26-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ARG STOREFRONT_SERVER_API_BASE_URL=http://api:8000/api
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    STOREFRONT_SERVER_API_BASE_URL=$STOREFRONT_SERVER_API_BASE_URL
RUN npm run build

FROM node:26-alpine AS runtime
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ARG STOREFRONT_SERVER_API_BASE_URL=http://api:8000/api
ENV NODE_ENV=production \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    STOREFRONT_SERVER_API_BASE_URL=$STOREFRONT_SERVER_API_BASE_URL
RUN addgroup --system --gid 10001 storefront && adduser --system --uid 10001 storefront
COPY --from=build --chown=storefront:storefront /app/public ./public
COPY --from=build --chown=storefront:storefront /app/.next/standalone ./
COPY --from=build --chown=storefront:storefront /app/.next/static ./.next/static
USER storefront
EXPOSE 3000
CMD ["node", "server.js"]
