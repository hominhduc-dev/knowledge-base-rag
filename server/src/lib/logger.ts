// ---------------------------------------------------------------------------
// Logger tối giản. Đủ cho giai đoạn này; đổi sang pino khi cần log có cấu trúc
// để đẩy lên dịch vụ giám sát.
//
// KHÔNG log mật khẩu, token JWT, hay khóa API của dịch vụ bên ngoài.
// ---------------------------------------------------------------------------
import { isProduction } from "../config/env.js";

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, meta?: unknown): void {
  const dong = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (meta === undefined) sink(dong);
  else sink(dong, meta);
}

export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (!isProduction) emit("debug", message, meta);
  },
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
