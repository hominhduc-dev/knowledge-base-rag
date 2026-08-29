# ---------------------------------------------------------------------------
# Giao diện Next.js. Cũng build từ GỐC workspace:
#   docker build -f web/Dockerfile .
# ---------------------------------------------------------------------------
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# --- Phụ thuộc ------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    corepack pnpm install --frozen-lockfile --filter @tang-thu/web...

# --- Biên dịch ------------------------------------------------------------
FROM deps AS build
# Next nhúng mọi biến NEXT_PUBLIC_* vào gói tải về trình duyệt NGAY LÚC BUILD,
# không phải lúc chạy. Đặt nó ở `environment:` của compose là vô tác dụng — phải
# truyền vào đây. Giá trị mặc định "/api" là đường dẫn tương đối, nên trình duyệt
# tự dùng đúng máy nó vừa tải trang: chạy đúng cho localhost, cho IP LAN và cho
# cả đường hầm tạm, không phải build lại lần nào.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY web ./web
RUN corepack pnpm --filter @tang-thu/web run build

# --- Ảnh chạy -------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Bản standalone đã gói sẵn phần node_modules cần dùng, nên ảnh này không cài gì.
# Vì `outputFileTracingRoot` trỏ về gốc workspace, cây standalone giữ nguyên hình
# dạng của workspace: server.js nằm trong web/, node_modules nằm ở gốc.
COPY --from=build --chown=node:node /app/web/.next/standalone ./

# standalone CỐ Ý không copy hai thư mục dưới đây (tài liệu Next khuyến nghị đẩy
# chúng lên CDN). Ở đây không có CDN nên phải copy tay, thiếu là mất sạch CSS,
# JavaScript phía client và ảnh nền màn đăng nhập.
COPY --from=build --chown=node:node /app/web/.next/static ./web/.next/static
COPY --from=build --chown=node:node /app/web/public       ./web/public

USER node
WORKDIR /app/web
EXPOSE 3000
CMD ["node", "server.js"]
