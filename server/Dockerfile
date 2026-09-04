# ---------------------------------------------------------------------------
# API + worker. Build từ GỐC workspace, không phải từ server/:
#   docker build -f server/Dockerfile .
# Lý do: pnpm cần lockfile và pnpm-workspace.yaml ở gốc mới dựng đúng cây phụ thuộc.
# ---------------------------------------------------------------------------
FROM node:22-slim AS base
# Prisma cần OpenSSL để nạp query engine; node:22-slim không có sẵn. Thiếu nó thì
# lỗi chỉ lộ ra lúc chạy, dưới dạng "Unable to require libquery_engine".
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# CI=true: không có TTY trong lúc build, mà pnpm mặc định HỎI trước khi dọn
# node_modules — bước `install --prod` vì thế dừng với
# ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY. Đây là biến chính thông báo lỗi
# của pnpm chỉ ra.
ENV CI=true
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# --- Phụ thuộc ------------------------------------------------------------
# Chỉ copy manifest trước. Sửa mã nguồn không làm mất cache tầng cài đặt.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    corepack pnpm install --frozen-lockfile --filter @tang-thu/server...

# --- Biên dịch ------------------------------------------------------------
FROM deps AS build
COPY server ./server
# Sinh Prisma Client TRƯỚC khi biên dịch: mã TypeScript import kiểu từ đó.
RUN corepack pnpm --filter @tang-thu/server exec prisma generate \
 && corepack pnpm --filter @tang-thu/server run build

# --- Chỉ giữ phụ thuộc chạy thật ------------------------------------------
FROM deps AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    corepack pnpm install --frozen-lockfile --prod --filter @tang-thu/server...
# `--prod` gỡ mất @prisma/client đã sinh, phải sinh lại trên cây phụ thuộc rút gọn.
COPY server/prisma ./server/prisma
RUN corepack pnpm --filter @tang-thu/server exec prisma generate

# --- Ảnh chạy -------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# Không chạy bằng root. Ảnh node dựng sẵn người dùng `node` uid 1000.
RUN mkdir -p /app/uploads && chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules        ./node_modules
COPY --from=prod-deps --chown=node:node /app/server/node_modules ./server/node_modules
COPY --from=build     --chown=node:node /app/server/dist         ./server/dist
COPY --from=build     --chown=node:node /app/server/prisma       ./server/prisma
COPY --chown=node:node server/package.json ./server/

USER node
WORKDIR /app/server
EXPOSE 4000
# Bind 0.0.0.0 nằm trong src/server.ts. Bind 127.0.0.1 là container tự cô lập:
# Caddy ở container khác sẽ không gọi vào được.
CMD ["node", "dist/server.js"]
