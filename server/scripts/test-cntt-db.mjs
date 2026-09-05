// Chạy migration/seed/test trên DB local riêng, không in hoặc thay đổi secret.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const configured = dotenv.parse(readFileSync(path.join(cwd, '.env')));
const infrastructure = dotenv.parse(readFileSync(path.join(cwd, '..', '.env')));
const url = new URL('postgresql://127.0.0.1:5432/tangthu_cntt_test_20260905');
url.username = infrastructure.POSTGRES_USER || 'tangthu';
url.password = infrastructure.POSTGRES_PASSWORD;
if (!url.password) throw new Error('Local Docker database credentials are required.');
const env = { ...process.env, ...configured, DATABASE_URL: url.toString(), NODE_ENV: 'test', GEMINI_API_KEY: '' };
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
run(['--import', 'tsx', 'prisma/seed.ts']);
run(['--import', 'tsx', '--test', 'src/**/*.test.ts']);
