import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

const file = process.argv[2];
if (!file) {
  console.error("Cách dùng: tsx scripts/extract-pdf.ts <đường-dẫn.pdf>");
  process.exit(1);
}

const buf = await readFile(file);
const pdf = await getDocumentProxy(new Uint8Array(buf));
const { totalPages, text } = await extractText(pdf, { mergePages: true });
console.log("SO TRANG:", totalPages);
console.log("-----");
console.log(text);
