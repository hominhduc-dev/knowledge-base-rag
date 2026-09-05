from pathlib import Path
from html import escape as esc
import json

OUT = Path(__file__).resolve().parent
common = [
 ('UC01','Đăng nhập','Mã số hoặc email và mật khẩu','POST /api/auth/login','server/src/modules/auth/auth.route.ts'),
 ('UC02','Đăng xuất','Xóa phiên trên trình duyệt','Thao tác frontend; không có API logout','web/src/features/auth/useAuth.ts'),
 ('UC03','Xem thông tin cá nhân','Thông tin, vai và phạm vi của tôi','GET /api/auth/me; GET /api/departments','server/src/modules/auth/auth.route.ts'),
 ('UC04','Đổi mật khẩu','Mật khẩu của chính mình','PUT /api/auth/password; có API, không khẳng định đã có màn hình','server/src/modules/auth/auth.route.ts'),
 ('UC05','Hỏi đáp học vụ','Câu trả lời theo tài liệu được phép đọc','POST /api/chat; trả lời SSE, từ chối khi thiếu nguồn','server/src/modules/chat/chat.service.ts'),
 ('UC06','Xem lại hội thoại','Danh sách và nội dung của chính mình','GET /api/conversations; GET /api/conversations/:id','server/src/modules/chat/chat.route.ts'),
 ('UC07','Tra cứu kho tài liệu','Tìm, lọc và xem chi tiết','GET /api/documents; GET /api/documents/:id','server/src/modules/documents/documents.route.ts'),
 ('UC08','Xem nguồn trích dẫn','Đoạn văn và tài liệu gốc','GET /api/documents/:id/chunks; GET /api/documents/:id/file','server/src/modules/documents/documents.route.ts'),
 ('UC09','Theo dõi xử lý tài liệu','Trạng thái nạp của tài liệu được phép đọc','GET /api/documents/:id/status','server/src/modules/documents/documents.route.ts'),
]
admin = [
 ('UC10','Tải lên tài liệu','Tài liệu CNTT hoặc quy định chung','POST /api/documents; tạo job xử lý nền','server/src/modules/documents/documents.route.ts'),
 ('UC11','Sửa thông tin tài liệu','Tiêu đề và nhóm tài liệu','PATCH /api/documents/:id','server/src/modules/documents/documents.schema.ts'),
 ('UC12','Gỡ tài liệu','Loại tài liệu khỏi kho tri thức','DELETE /api/documents/:id','server/src/modules/documents/documents.route.ts'),
 ('UC13','Chạy lại xử lý lỗi','Yêu cầu xử lý lại tài liệu thất bại','POST /api/documents/:id/retry','server/src/modules/documents/documents.route.ts'),
 ('UC14','Tra cứu người dùng','Sinh viên, giáo vụ và quản trị viên','GET /api/users','server/src/modules/admin/admin.route.ts'),
 ('UC15','Khóa / mở tài khoản','Bật hoặc tắt trạng thái hoạt động','PATCH /api/users/:id; chỉ isActive, không xóa tài khoản','server/src/modules/admin/admin.schema.ts'),
 ('UC16','Phân quyền tài khoản','Gán một trong ba vai trò','POST /api/departments/:id/members; DELETE /api/departments/:id/members/:userId','server/src/modules/admin/admin.route.ts'),
]
ops = [
 ('UC18','Tra cứu lai qua API','Công cụ gỡ lỗi; mọi vai đã đăng nhập','POST /api/search; vẫn áp dụng phạm vi người gọi','server/src/modules/retrieval/retrieval.route.ts'),
 ('UC19','Đánh giá truy hồi','Chạy CLI, lưu recall@k và MRR','pnpm --filter @tang-thu/server eval; chưa có API /eval/runs','server/src/eval/run-eval.ts'),
 ('UC20','Kiểm tra sức khỏe','Uptime và số job đang chờ','GET /api/health; không yêu cầu đăng nhập','server/src/routes.ts'),
]

def txt(x,y,s,size=20,color='#183247',anchor='middle',weight=400):
 return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{color}">{esc(s)}</text>'
def actor(x,y,name,sub,color='#224b62'):
 return f'<g stroke="{color}" stroke-width="3" fill="none"><circle cx="{x}" cy="{y}" r="17"/><path d="M{x},{y+17}v53 M{x-33},{y+40}h66 M{x},{y+70}l-28,40 M{x},{y+70}l28,40"/></g>'+txt(x,y+141,name,23,color,weight=650)+txt(x,y+166,sub,16,color)
def oval(x,y,item,color='#21647a',fill='#f1f8fb',rx=232):
 id,title,sub,*_=item
 return f'<g class="uc" data-id="{id}" tabindex="0"><title>{esc(id+": "+title+" — "+sub)}</title><ellipse cx="{x}" cy="{y}" rx="{rx}" ry="43" stroke="{color}" stroke-width="1.8" fill="{fill}"/>'+txt(x,y-13,id,13,color,weight=650)+txt(x,y+9,title,21,weight=600)+txt(x,y+29,sub,14,'#486171')+'</g>'
def svg_start(w,h,title):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{esc(title)}"><style>text{{font-family:Segoe UI,Arial,sans-serif}} .uc:focus ellipse,.uc:hover ellipse{{stroke-width:3;stroke:#bd6b23}}</style><defs><marker id="inherit" markerWidth="15" markerHeight="15" refX="13" refY="7" orient="auto"><path d="M1,1L13,7L1,13Z" fill="white" stroke="#536778" stroke-width="1.3"/></marker></defs><rect width="100%" height="100%" fill="white"/>'

s=svg_start(1880,1410,'Sổ Tay Sinh Viên CNTT — ba vai trò')
s+=txt(940,45,'SỔ TAY SINH VIÊN CNTT · USE CASE TOÀN HỆ THỐNG',30,weight=700)
s+=txt(940,78,'Đại học Kiến trúc Đà Nẵng · Học phần Lập trình mạng · 05/09/2026',18,'#607381')
s+='<rect x="40" y="398" width="1800" height="960" rx="8" fill="#fcfdfe" stroke="#9bafbc" stroke-width="2"/>'
s+=txt(940,431,'HỆ THỐNG HỎI ĐÁP HỌC VỤ CHO SINH VIÊN CNTT',20,weight=650)
# Actor generalization: system -> content -> reader. No flow-order arrows.
s+='<path d="M940,203 V142 H350 V203" stroke="#536778" fill="none" marker-end="url(#inherit)"/>'
s+='<path d="M1530,203 V110 H970 V220 H957" stroke="#536778" fill="none" marker-end="url(#inherit)"/>'
s+=txt(635,132,'Kế thừa quyền tra cứu',16,'#607381')+txt(1240,100,'Kế thừa quyền nội dung',16,'#607381')
for x,items,label,code,color,fill in [
 (350,common,'Sinh Viên CNTT','USER','#21647a','#f1f8fb'),
 (940,admin[:4],'Giáo vụ khoa CNTT','CONTENT_ADMIN','#9b6738','#fdf7ef'),
 (1530,admin[4:],'Quản Trị Viên','SYSTEM_ADMIN','#69528d','#f7f4fc')]:
 s+=actor(x,220,label,code,color)
 for i,u in enumerate(items):
  y=498+i*99
  s+=f'<path d="M{x-33},260 H{x-250} V460 L{x-215},{y}" fill="none" stroke="{color}" stroke-width="1.2"/>'
  s+=oval(x,y,u,color,fill,rx=215)
s+=txt(940,991,'GIÁO VỤ KHOA CNTT',17,'#9b6738',weight=650)
s+=txt(940,1026,'Quản lý kho tài liệu của đồ án.',18)
s+=txt(940,1055,'Không quản lý tài khoản hoặc cấp vai.',17)
s+=txt(1530,905,'QUẢN TRỊ VIÊN',17,'#69528d',weight=650)
s+=txt(1530,940,'Quản lý tài khoản và phân quyền.',18)
s+=txt(1530,969,'Không mở rộng sang dữ liệu khoa khác.',17)
s+=txt(1235,1165,'Cả ba vai: tài liệu CNTT + quy định chung',19,weight=600)
s+=txt(1235,1197,'áp dụng cho sinh viên CNTT.',19)
s+=txt(940,1390,'Đường liền: tham gia use case · Tam giác rỗng: kế thừa chức năng · Không biểu diễn thứ tự xử lý',16,'#607381')+'</svg>'
(OUT/'tang-thu-use-case.svg').write_text(s,encoding='utf-8')

t=svg_start(1500,840,'Sổ Tay Sinh Viên CNTT — Use case kỹ thuật và dịch vụ ngoài')
t+=txt(750,43,'SỔ TAY SINH VIÊN CNTT · VẬN HÀNH VÀ DỊCH VỤ NGOÀI',28,weight=700)
t+='<rect x="290" y="85" width="920" height="710" rx="8" fill="#fcfdfe" stroke="#9bafbc" stroke-width="2"/>'
t+=txt(750,122,'RANH GIỚI HỆ THỐNG',17,weight=650)
for y in [210,410]: t+=f'<path d="M179,330L340,{y}" stroke="#87a7b6" fill="none" stroke-width="1.5"/>'
t+=actor(145,290,'Người vận hành','Quyền chạy CLI / giám sát')
t+=oval(560,210,ops[1],rx=220)+oval(560,410,ops[2],rx=220)
t+=txt(560,282,'UC19 dùng quyền môi trường chạy,',16,'#607381')+txt(560,306,'không có bước đăng nhập SYSTEM_ADMIN qua web.',16,'#607381')
t+='<path d="M179,643L340,650" stroke="#87a7b6" fill="none" stroke-width="1.5"/>'
t+=actor(145,603,'API client','Người dùng đã đăng nhập')+oval(560,650,ops[0],rx=220)
t+='<path d="M1321,330L1170,230 M1321,330L1170,465" stroke="#87a7b6" fill="none" stroke-width="1.5"/>'
t+=actor(1355,290,'Gemini API','Dịch vụ ngoài hệ thống')
t+=oval(990,230,('UC05','Hỗ trợ hỏi đáp','Nhúng câu hỏi; sinh khi có nguồn'),rx=180)
t+=oval(990,465,('UC10/13','Hỗ trợ nạp tài liệu','Nhúng các đoạn văn bản'),rx=180)
t+=txt(990,559,'Worker, CSDL và bộ truy hồi là',16,'#607381')+txt(990,583,'thành phần nội bộ, không phải actor.',16,'#607381')
t+='</svg>'
(OUT/'tang-thu-use-case-operations.svg').write_text(t,encoding='utf-8')

all_uc=common+admin+ops
rows=''.join(f'<tr id="{u[0]}"><td><b>{u[0]}</b></td><td>{esc(u[1])}<small>{esc(u[2])}</small></td><td>{esc(u[3])}</td><td><code>{esc(u[4])}</code></td></tr>' for u in all_uc)
html='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sổ Tay Sinh Viên CNTT — Sơ đồ use case</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf2f5;color:#183247;font:16px/1.6 'Segoe UI',Arial,sans-serif}header,main{max-width:1500px;margin:auto;padding:24px 32px}header{display:flex;justify-content:space-between;gap:20px;align-items:center}h1{font-size:28px;margin:0}p{margin:8px 0;color:#526776}nav{display:flex;gap:8px;flex-wrap:wrap}button,a.btn{font:inherit;border:1px solid #b7c8d3;border-radius:7px;background:white;color:#183247;padding:8px 14px;text-decoration:none;cursor:pointer}button.active{background:#183247;color:white}.canvas{background:white;border:1px solid #cfdae1;border-radius:12px;padding:10px}.canvas svg{display:block;width:100%;height:auto}.panel[hidden]{display:none}.notes{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:22px 0}.card{background:white;border:1px solid #cfdae1;border-radius:10px;padding:20px}h2{font-size:20px;margin:0 0 8px}ul{padding-left:22px;margin:8px 0}.tablewrap{overflow:auto;background:white;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:13px;border-bottom:1px solid #dce5eb;vertical-align:top}th{background:#dfe9ef}small{display:block;color:#607381}code{overflow-wrap:anywhere}footer{padding:18px 0;color:#607381;font-size:14px}@media(max-width:700px){header{display:block}header,main{padding:16px}.notes{grid-template-columns:1fr}nav{margin-top:12px}h1{font-size:24px}}@media print{header nav,.toolbar{display:none}body{background:white}header,main{max-width:none;padding:0}.panel[hidden]{display:block}.panel{break-after:page}.notes{display:block}.card{margin:10px 0}.canvas{border:0;padding:0}}
</style><header><div><h1>Sổ Tay Sinh Viên CNTT · Use case toàn hệ thống</h1><p>Sinh Viên CNTT · Giáo vụ khoa CNTT · Quản Trị Viên</p></div><nav><button class="active" data-view="business">Nghiệp vụ</button><button data-view="operations">Vận hành &amp; AI</button><button onclick="window.print()">In / lưu PDF</button></nav></header><main>'''
html+='<section class="panel" id="business"><div class="canvas">'+s+'</div><p><a class="btn" href="tang-thu-use-case.svg" download>Tải SVG nghiệp vụ</a></p></section>'
html+='<section class="panel" id="operations" hidden><div class="canvas">'+t+'</div><p><a class="btn" href="tang-thu-use-case-operations.svg" download>Tải SVG vận hành</a></p></section>'
html+='''<div class="notes"><section class="card"><h2>Cách đọc và phạm vi</h2><ul><li>Ba actor nghiệp vụ chính; Người vận hành, API client và Gemini API là tác nhân kỹ thuật phụ trợ, không phải vai trò tài khoản mới. Có 16 use case nghiệp vụ và 3 use case kỹ thuật; mã UC05, UC10/13 trong sơ đồ AI tham chiếu lại nghiệp vụ.</li><li>Quản Trị Viên có các chức năng của Giáo vụ khoa CNTT; Giáo vụ khoa CNTT có các chức năng tra cứu của Sinh Viên CNTT. Cả ba chỉ dùng kho CNTT và quy định chung.</li><li>Đăng nhập là điều kiện trước của nghiệp vụ được bảo vệ. Các đường nối không biểu diễn thứ tự xử lý.</li><li>Hỏi đáp không có nguồn sẽ từ chối; không phải mọi lượt hỏi đều gọi mô hình sinh.</li><li>Đây là đối chiếu mã nguồn, chưa phải xác nhận kiểm thử end-to-end hoặc trạng thái triển khai.</li></ul></section><section class="card"><h2>Giới hạn phạm vi và chức năng</h2><ul><li>Tạo tài khoản người dùng: hiện cấp qua seed; chưa có POST /users.</li><li>Quản trị nhiều khoa, tạo/sửa đơn vị: đã loại khỏi phạm vi học phần.</li><li>Chạy / xem lịch sử đánh giá qua web: CLI đã tồn tại, router /eval/runs chưa được gắn.</li></ul><p>Không có đăng ký tự do, quên mật khẩu qua email hoặc SSO trong phạm vi đã chốt.</p></section></div><section><h2>Danh mục use case và bằng chứng</h2><div class="tablewrap"><table><thead><tr><th>Mã</th><th>Use case</th><th>Hiện thực / giới hạn</th><th>Nguồn trong repo</th></tr></thead><tbody>'''+rows+'''</tbody></table></div></section><footer>Đối chiếu ngày 05/09/2026 · UML use case, vẽ bằng SVG · Nguồn chỉnh sửa: tang-thu-use-case.puml và build_diagrams.py.</footer></main><script>document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b))});document.querySelectorAll('.uc').forEach(n=>{const go=()=>document.getElementById(n.dataset.id)?.scrollIntoView({behavior:'smooth',block:'center'});n.addEventListener('click',go);n.addEventListener('keydown',e=>{if(e.key==='Enter')go()})});</script></html>'''
(OUT/'tang-thu-use-case.html').write_text(html,encoding='utf-8')

puml=['@startuml','left to right direction','skinparam packageStyle rectangle','actor "Sinh Viên CNTT\\n(USER)" as Reader','actor "Giáo vụ khoa CNTT\\n(CONTENT_ADMIN)" as Content','actor "Quản Trị Viên\\n(SYSTEM_ADMIN)" as System','Content --|> Reader','System --|> Content','rectangle "Sổ Tay Sinh Viên CNTT — Đại học Kiến trúc Đà Nẵng" {']
for u in common+admin: puml.append(f' usecase "{u[0]}\\n{u[1]}" as {u[0]}')
puml.append('}')
for u in common: puml.append(f'Reader -- {u[0]}')
for u in admin[:4]: puml.append(f'Content -- {u[0]}')
for u in admin[4:]: puml.append(f'System -- {u[0]}')
puml+=['note bottom of UC07','Cả ba vai: tài liệu CNTT và quy định chung.','Không có quyền truy cập tài liệu khoa khác.','end note','@enduml','','@startuml','left to right direction','actor "Người vận hành" as Operator','actor "API client đã đăng nhập" as Client','actor "Gemini API" as Gemini','rectangle "Sổ Tay Sinh Viên CNTT — kỹ thuật" {']
for u in ops: puml.append(f' usecase "{u[0]}\\n{u[1]}" as {u[0]}')
puml+=[' usecase "UC05 — Hỗ trợ hỏi đáp" as QA',' usecase "UC10/13 — Hỗ trợ nạp tài liệu" as Ingest','}','Operator -- UC19','Operator -- UC20','Client -- UC18','Gemini -- QA','Gemini -- Ingest','@enduml']
(OUT/'tang-thu-use-case.puml').write_text('\n'.join(puml)+'\n',encoding='utf-8')
md=['# Use case Sổ Tay Sinh Viên CNTT','','Phạm vi hiện hành: sinh viên ngành CNTT, Đại học Kiến trúc Đà Nẵng; xem [đặc tả](../PHAM-VI-CNTT.md).','','- Sinh Viên CNTT (USER): hỏi đáp, xem tài liệu, nguồn trích dẫn và hội thoại cá nhân.','- Giáo vụ khoa CNTT (CONTENT_ADMIN): có chức năng tra cứu và quản lý tài liệu.','- Quản Trị Viên (SYSTEM_ADMIN): có chức năng của giáo vụ và quản lý tài khoản, phân quyền.','- Cả ba chỉ đọc tài liệu CNTT và quy định chung áp dụng cho CNTT.','- Người vận hành CLI và Gemini API là tác nhân kỹ thuật.','','[Mở sơ đồ HTML](tang-thu-use-case.html) · [SVG nghiệp vụ](tang-thu-use-case.svg) · [SVG kỹ thuật](tang-thu-use-case-operations.svg) · [PlantUML](tang-thu-use-case.puml)','','| Mã | Chức năng | API / giới hạn | Nguồn |','|---|---|---|---|']
for u in all_uc: md.append(f'| {u[0]} | {u[1]} | {u[3]} | [{Path(u[4]).name}](../../{u[4]}) |')
md+=['','Tạo tài khoản qua seed; chưa có POST /users. CLI đánh giá đã có, chưa có API /eval/runs. Quản trị nhiều khoa nằm ngoài phạm vi.','','Tái tạo: `python docs/use-cases/build_diagrams.py`.']
(OUT/'README.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(json.dumps({'output':str(OUT),'business_use_cases':len(common+admin),'technical_use_cases':len(ops)},ensure_ascii=False))

