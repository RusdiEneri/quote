FROM oven/bun:1

WORKDIR /app

# Install system dependencies for canvas, fonts, and graphics
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock* ./
RUN bun install --production

COPY . .

# Set permissions for user 1000 (standard in Hugging Face Spaces)
RUN chown -R 1000:1000 /app

USER 1000

ENV PORT=7860
EXPOSE 7860

CMD ["bun", "start"]