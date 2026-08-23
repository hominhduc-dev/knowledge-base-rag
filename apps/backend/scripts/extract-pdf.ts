import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

const file = process.argv[2];
const buf = await readFile(file);
const pdf = await getDocumentProxy(new Uint8Array(buf));
const { totalPages, text } = await extractText(pdf, { mergePages: true });
console.log("SO TRANG:", totalPages);
console.log("-----");
console.log(text);
