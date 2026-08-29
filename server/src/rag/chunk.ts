// ---------------------------------------------------------------------------
// Cắt đoạn theo CẤU TRÚC — mục 4.4 của docs/THIET-KE-HE-THONG.md.
//
// Văn bản quy chế có cấu trúc phân cấp rõ: Chương → Điều → Khoản. Cắt cứng theo
// số ký tự làm đứt giữa một khoản, khiến đoạn mất ngữ cảnh và trích dẫn chỉ sai
// vị trí — người dùng bấm vào nguồn rồi không thấy câu mà hệ thống vừa trích.
//
// Thuật toán:
//   1. Nhận diện ranh giới bằng biểu thức chính quy
//   2. Mỗi Điều là một đơn vị cơ sở
//   3. Điều dài quá `maxTokens` → cắt tiếp theo Khoản
//   4. Khoản vẫn quá dài → cắt theo câu, chồng lấn `overlapTokens`
//   5. Ghi `headingPath` đầy đủ cho mọi đoạn, phục vụ trích dẫn
//
// Tài liệu không có cấu trúc (sổ tay, hướng dẫn) rơi về cắt theo đoạn văn — xem
// `cắtTheoĐoạnVăn` ở cuối file.
//
// Thuần hàm, không chạm cơ sở dữ liệu và không gọi mạng, nên test được trực tiếp.
// ---------------------------------------------------------------------------

export type ChunkOptions = {
  /** Trần kích thước một đoạn. Vượt là cắt nhỏ tiếp. */
  maxTokens: number;
  /** Số token chồng lấn khi buộc phải cắt theo câu. */
  overlapTokens: number;
};

export const MAC_DINH: ChunkOptions = { maxTokens: 800, overlapTokens: 100 };

export type ParsedPage = { page: number; text: string };

export type Chunk = {
  content: string;
  /** "Chương II > Điều 12 > Khoản 3", hoặc null nếu tài liệu không có cấu trúc. */
  headingPath: string | null;
  pageFrom: number | null;
  pageTo: number | null;
  tokenCount: number;
};

/**
 * Ước lượng số token.
 *
 * Không gọi bộ tách token thật: mỗi nhà cung cấp mô hình tách khác nhau, và thêm
 * một thư viện chỉ để đếm là không đáng. Với tiếng Việt, tỉ lệ ~3,5 ký tự mỗi
 * token là xấp xỉ đủ tốt — con số này chỉ dùng để quyết định CÓ CẮT NHỎ HAY
 * KHÔNG, sai lệch vài phần trăm không đổi kết quả.
 */
export function uocLuongToken(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// ===========================================================================
// NHẬN DIỆN RANH GIỚI
// ===========================================================================

/**
 * Một dòng mở đầu Chương, Điều hoặc Khoản.
 *
 * `Điều 12.` · `Điều 12:` · `ĐIỀU 12` · `Chương II` · `Khoản 3`
 *
 * Chỉ khớp khi ở ĐẦU DÒNG. Nếu bỏ neo `^`, cụm "theo Điều 12" nằm giữa câu cũng
 * bị coi là tiêu đề và cắt tài liệu ra thành vụn.
 *
 * CHẤP NHẬN CẢ DẠNG KHÔNG DẤU (`Dieu`, `Chuong`, `Khoan`). Không phải để chiều
 * người gõ thiếu dấu, mà vì một số PDF mất hết dấu khi trích văn bản — tùy cách
 * tệp nhúng font. Không có nhánh này thì những tệp đó lặng lẽ rơi về cắt theo
 * đoạn văn: vẫn "chạy", nhưng trích dẫn mất `headingPath` và chỉ còn số trang.
 * Đã gặp thật khi kiểm thử.
 */
const RANH_GIOI =
  /^\s*(Chương|CHƯƠNG|Chuong|CHUONG|Điều|ĐIỀU|Dieu|DIEU|Khoản|KHOẢN|Khoan|KHOAN)\s+([IVXLCDM]+|\d+)\s*[.:）)]?\s*(.*)$/;

type Muc = "Chương" | "Điều" | "Khoản";

type Doan = {
  muc: Muc | null;
  tieuDe: string | null;
  dongVanBan: string[];
  page: number;
};

function chuanHoaMuc(raw: string): Muc {
  const s = raw.toLowerCase();
  if (s.startsWith("chương") || s.startsWith("chuong")) return "Chương";
  if (s.startsWith("điều") || s.startsWith("dieu")) return "Điều";
  return "Khoản";
}

/** Tách văn bản thành các khối theo ranh giới cấu trúc, giữ số trang. */
function tachTheoRanhGioi(pages: ParsedPage[]): Doan[] {
  const ra: Doan[] = [];
  let hienTai: Doan | null = null;

  for (const { page, text } of pages) {
    for (const dong of text.split(/\r?\n/)) {
      const khop = RANH_GIOI.exec(dong);
      if (khop) {
        const muc = chuanHoaMuc(khop[1]!);
        const so = khop[2]!;
        const duoi = (khop[3] ?? "").trim();
        hienTai = {
          muc,
          // Giữ NGUYÊN VĂN cách tài liệu viết (`khop[1]`), không ép về dạng có
          // dấu: trích dẫn phải khớp với cái người đọc nhìn thấy trong tệp gốc.
          tieuDe: `${khop[1]} ${so}`,
          dongVanBan: duoi ? [duoi] : [],
          page,
        };
        ra.push(hienTai);
        continue;
      }
      if (!dong.trim()) continue;
      if (!hienTai) {
        // Phần văn bản đứng trước tiêu đề đầu tiên — thường là bìa hoặc lời nói
        // đầu. Giữ lại chứ không vứt: có tài liệu để nội dung quan trọng ở đây.
        hienTai = { muc: null, tieuDe: null, dongVanBan: [], page };
        ra.push(hienTai);
      }
      hienTai.dongVanBan.push(dong.trim());
    }
  }

  return ra.filter((d) => d.dongVanBan.length > 0 || d.tieuDe);
}

// ===========================================================================
// CẮT NHỎ KHI QUÁ DÀI
// ===========================================================================

/**
 * Cắt theo CÂU với phần chồng lấn — bước cuối cùng, chỉ dùng khi một Khoản đơn
 * lẻ vẫn vượt trần.
 *
 * Chồng lấn tồn tại để câu bị cắt ngang không mất ngữ cảnh: đoạn sau mang theo
 * vài câu cuối của đoạn trước, nên dù truy hồi trúng đoạn nào thì phần nối vẫn
 * đọc được.
 */
function catTheoCau(text: string, options: ChunkOptions): string[] {
  // Tách sau dấu kết câu theo sau bởi khoảng trắng. Không xử lý các viết tắt như
  // "TS." hay "v.v." — chấp nhận cắt hơi sớm ở vài chỗ, đổi lấy sự đơn giản.
  const cau = text.split(/(?<=[.!?;])\s+/).filter((c) => c.trim());
  if (cau.length <= 1) return [text];

  const ra: string[] = [];
  let dem: string[] = [];
  let soToken = 0;

  for (const c of cau) {
    const t = uocLuongToken(c);

    if (soToken + t > options.maxTokens && dem.length > 0) {
      ra.push(dem.join(" "));

      // Giữ lại phần đuôi làm chồng lấn cho đoạn kế.
      const giu: string[] = [];
      let tokenGiu = 0;
      for (let i = dem.length - 1; i >= 0; i -= 1) {
        const tt = uocLuongToken(dem[i]!);
        if (tokenGiu + tt > options.overlapTokens) break;
        giu.unshift(dem[i]!);
        tokenGiu += tt;
      }
      dem = giu;
      soToken = tokenGiu;
    }

    dem.push(c);
    soToken += t;
  }

  if (dem.length > 0) ra.push(dem.join(" "));
  return ra;
}

// ===========================================================================
// ĐIỂM VÀO
// ===========================================================================

/**
 * Cắt tài liệu thành các đoạn.
 *
 * Tự chọn chiến lược: có ranh giới Điều/Chương thì cắt theo cấu trúc, không thì
 * rơi về cắt theo đoạn văn. Tự chọn chứ không bắt người gọi khai báo, vì người
 * upload không biết tài liệu của mình có cấu trúc hay không.
 */
export function catDoan(pages: ParsedPage[], options: ChunkOptions = MAC_DINH): Chunk[] {
  const khoi = tachTheoRanhGioi(pages);
  const coCauTruc = khoi.some((d) => d.muc === "Điều" || d.muc === "Chương");

  if (!coCauTruc) return catTheoDoanVan(pages, options);

  const ra: Chunk[] = [];
  let chuong: string | null = null;

  /** Điều đang gom, cùng các Khoản thuộc về nó. */
  let dieu: { tieuDe: string; chuong: string | null; page: number; loi: string[]; khoan: { tieuDe: string; text: string; page: number }[] } | null = null;

  const xaDieu = () => {
    if (!dieu) return;

    const loi = dieu.loi.join(" ").trim();
    const phanKhoan = dieu.khoan.map((k) => k.text).join(" ").trim();
    const toanBo = [loi, phanKhoan].filter(Boolean).join(" ").trim();

    // Dòng tiêu đề đứng một mình, không có nội dung nào — không tạo đoạn.
    // Chunk chỉ chứa tiêu đề là rác với truy hồi: nó khớp câu hỏi nhưng không
    // mang câu trả lời nào.
    if (!toanBo) {
      dieu = null;
      return;
    }

    const duong = (them?: string) =>
      [dieu!.chuong, dieu!.tieuDe, them].filter((x): x is string => Boolean(x)).join(" > ");

    // ĐIỀU LÀ ĐƠN VỊ CƠ SỞ. Vừa trần thì giữ NGUYÊN CẢ ĐIỀU trong một đoạn, kể
    // cả các Khoản — các khoản của cùng một điều thường bổ nghĩa cho nhau, tách
    // ra là mất ngữ cảnh và trích dẫn trả về nửa quy định.
    if (uocLuongToken(toanBo) <= options.maxTokens) {
      ra.push({
        content: toanBo,
        headingPath: duong(),
        pageFrom: dieu.page,
        pageTo: dieu.khoan.at(-1)?.page ?? dieu.page,
        tokenCount: uocLuongToken(toanBo),
      });
      dieu = null;
      return;
    }

    // Quá trần: mới cắt theo Khoản. Phần lời dẫn của Điều đi kèm Khoản ĐẦU TIÊN
    // chứ không đứng riêng — một mình nó thường chỉ là tiêu đề.
    if (dieu.khoan.length === 0) {
      for (const manh of catTheoCau(toanBo, options)) {
        ra.push({
          content: manh,
          headingPath: duong(),
          pageFrom: dieu.page,
          pageTo: dieu.page,
          tokenCount: uocLuongToken(manh),
        });
      }
      dieu = null;
      return;
    }

    dieu.khoan.forEach((k, i) => {
      const text = i === 0 && loi ? `${loi} ${k.text}`.trim() : k.text;
      const day = duong(k.tieuDe);

      if (uocLuongToken(text) <= options.maxTokens) {
        ra.push({
          content: text,
          headingPath: day,
          pageFrom: k.page,
          pageTo: k.page,
          tokenCount: uocLuongToken(text),
        });
        return;
      }
      // Khoản vẫn quá dài: bước cuối, cắt theo câu có chồng lấn.
      for (const manh of catTheoCau(text, options)) {
        ra.push({
          content: manh,
          headingPath: day,
          pageFrom: k.page,
          pageTo: k.page,
          tokenCount: uocLuongToken(manh),
        });
      }
    });

    dieu = null;
  };

  for (const d of khoi) {
    if (d.muc === "Chương") {
      xaDieu();
      chuong = d.tieuDe;
      // Văn bản đi kèm dòng "Chương" là TIÊU ĐỀ chương ("QUY ĐỊNH CHUNG"), không
      // phải nội dung. Dùng làm ngữ cảnh đường dẫn, không tạo đoạn riêng.
      continue;
    }

    if (d.muc === "Điều") {
      xaDieu();
      dieu = { tieuDe: d.tieuDe!, chuong, page: d.page, loi: [...d.dongVanBan], khoan: [] };
      continue;
    }

    if (d.muc === "Khoản" && dieu) {
      dieu.khoan.push({ tieuDe: d.tieuDe!, text: d.dongVanBan.join(" ").trim(), page: d.page });
      continue;
    }

    // Khoản mồ côi (không có Điều cha), hoặc phần mở đầu đứng trước tiêu đề đầu
    // tiên — thường là bìa và lời nói đầu. Giữ lại chứ không vứt.
    const noiDung = d.dongVanBan.join(" ").trim();
    if (!noiDung) continue;
    const day = [chuong, d.tieuDe].filter((x): x is string => Boolean(x)).join(" > ") || null;
    for (const manh of uocLuongToken(noiDung) <= options.maxTokens ? [noiDung] : catTheoCau(noiDung, options)) {
      ra.push({
        content: manh,
        headingPath: day,
        pageFrom: d.page,
        pageTo: d.page,
        tokenCount: uocLuongToken(manh),
      });
    }
  }

  xaDieu();
  return ra;
}

/**
 * Đường lùi cho tài liệu không có cấu trúc Điều/Khoản.
 *
 * Gom theo đoạn văn cho tới khi chạm trần, rồi mới cắt. Không có `headingPath`
 * vì không có gì để ghi — trích dẫn chỉ còn số trang.
 */
export function catTheoDoanVan(pages: ParsedPage[], options: ChunkOptions = MAC_DINH): Chunk[] {
  const ra: Chunk[] = [];
  let dem: string[] = [];
  let soToken = 0;
  let trangDau: number | null = null;
  let trangCuoi: number | null = null;

  const xa = () => {
    if (dem.length === 0) return;
    const noiDung = dem.join("\n\n").trim();
    if (noiDung) {
      ra.push({
        content: noiDung,
        headingPath: null,
        pageFrom: trangDau,
        pageTo: trangCuoi,
        tokenCount: uocLuongToken(noiDung),
      });
    }
    dem = [];
    soToken = 0;
    trangDau = null;
  };

  for (const { page, text } of pages) {
    for (const dv of text.split(/\r?\n\s*\r?\n/)) {
      const sach = dv.trim();
      if (!sach) continue;

      const t = uocLuongToken(sach);

      // Một đoạn văn đơn lẻ đã vượt trần: cắt riêng nó theo câu.
      if (t > options.maxTokens) {
        xa();
        for (const manh of catTheoCau(sach, options)) {
          ra.push({
            content: manh,
            headingPath: null,
            pageFrom: page,
            pageTo: page,
            tokenCount: uocLuongToken(manh),
          });
        }
        continue;
      }

      if (soToken + t > options.maxTokens) xa();

      if (trangDau === null) trangDau = page;
      trangCuoi = page;
      dem.push(sach);
      soToken += t;
    }
  }

  xa();
  return ra;
}
