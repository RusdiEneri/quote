FROM oven/bun:canary

WORKDIR /app

RUN apk add --no-cache font-noto font-noto-cjk font-noto-extra gcompat libstdc++ libuuid vips-dev build-base jpeg-dev pango-dev cairo-dev imagemagick libssl1.1
RUN ln -s /lib/libresolv.so.2 /usr/lib/libresolv.so.2 || true

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY . .

ENV PORT=7860
EXPOSE 7860

CMD ["bun", "start"]