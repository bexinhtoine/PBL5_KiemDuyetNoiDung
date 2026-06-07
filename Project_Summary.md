# 📋 Project Summary — PBL5: Hệ Thống Kiểm Duyệt Nội Dung

> **Tạo bởi:** Antigravity AI Coding Assistant  
> **Phiên làm việc:** 07/06/2026  
> **Phạm vi:** Phân hệ Cộng đồng (Community Module)  
> **Stack:** Java Spring Boot (Backend) + Vanilla HTML/CSS/JS (Frontend) + Python Flask (AI Server)

---

## 📁 Cấu Trúc Dự Án

```
PBL5_KiemDuyetNoiDung/
├── src/main/java/com/pbl5/
│   ├── controller/          # REST API Controllers
│   ├── service/             # Business Logic Services
│   ├── model/               # JPA Entities
│   ├── dto/                 # Data Transfer Objects
│   └── repository/          # Spring Data JPA Repositories
├── src/main/resources/
│   └── static/
│       ├── html/            # Frontend HTML Pages
│       ├── js/              # Frontend JavaScript
│       └── css/             # Stylesheets
└── python_ai_server/        # Python Flask AI Moderation Server
```

---

## ✅ Chức Năng Đã Hoàn Thiện

### 🔒 Sửa Lỗi Bảo Mật & Tối Ưu Hiệu Năng

| Risk | Mô tả | Mức độ | Trạng thái |
|------|-------|--------|-----------|
| Risk 1 | **Rò rỉ thông tin thành viên nhóm Private** — `GET /api/communities/{id}/members` không chặn người ngoài nhóm xem danh sách thành viên của nhóm riêng tư | 🔴 Cao | ✅ Đã sửa |
| Risk 2 | **N+1 Query** — Mỗi nhóm trong danh sách `/api/communities/my` và `/api/communities/search` gọi 1 query riêng lẻ để lấy trạng thái membership | 🟡 Trung bình | ✅ Đã sửa |
| Risk 3 | **Orphaned Posts** — Khi giải tán nhóm, bài viết Private có thể rò rỉ ra ngoài hoặc chiếm DB vô ích | 🟡 Trung bình | ✅ Đã sửa |
| Risk 4 | **XSS Prevention** — `innerHTML` trong `community.js` không escape tên người sáng lập | 🟢 Thấp | ✅ Đã sửa |

**Chi tiết sửa:**
- **Risk 1:** Bổ sung kiểm tra `isMember || isSysAdminOrMod` trước khi trả về danh sách thành viên. Trả về `403 Forbidden` nếu vi phạm.
- **Risk 2:** Tải trước toàn bộ membership bằng 1 query `findByUserIdAndStatusIn(...)`, map nhanh bằng `HashMap` ở Java Memory — giảm từ N+1 xuống còn 2 query cố định.
- **Risk 3:** Thêm tùy chọn `keepPosts` trong `DELETE /api/communities/{id}`. Nếu `false` → đặt `status = DELETED` toàn bộ bài viết trong nhóm. Nếu `true` → gỡ liên kết nhóm, bài viết trở thành bài cá nhân công khai.
- **Risk 4:** Thêm hàm `escapeHtml(str)` trong `community.js`, áp dụng trước khi đưa bất kỳ chuỗi dữ liệu người dùng vào `innerHTML`.

---

### 💡 Chức Năng Mới Đã Triển Khai

#### 1. 📜 Quy Tắc Cộng Đồng (Community Rules)

**Backend:**
- **[NEW]** `CommunityRule.java` — Entity lưu trữ quy tắc nhóm (`id`, `communityId`, `orderIndex`, `title`, `description`)
- **[NEW]** `CommunityRuleRepository.java` — JPA Repository cho quy tắc nhóm
- **[MODIFY]** `CommunityController.java` — Thêm 2 endpoint:
  - `GET /api/communities/{id}/rules` — Lấy danh sách quy tắc (public, không cần auth)
  - `POST /api/communities/{id}/rules` — Lưu danh sách quy tắc (tối đa 10, chỉ OWNER/ADMIN)

**Frontend:**
- Tab "Quy tắc nhóm" trong bảng quản lý cộng đồng
- Modal thêm/sửa quy tắc (`#rule-modal`) với giới hạn 10 quy tắc
- **Modal đồng ý quy tắc** (`#join-rules-modal`) — Bắt buộc hiển thị khi thành viên mới xin tham gia nhóm Private có quy tắc. Chỉ sau khi bấm "Đồng ý & Gửi yêu cầu" mới gọi API tham gia.

---

#### 2. 📌 Ghim Bài Viết (Pinned Posts)

**Backend:**
- **[MODIFY]** `Post.java` — Thêm trường `pinned` (boolean, default false)
- **[MODIFY]** `PostResponse.java` — Thêm trường `pinned` vào DTO
- **[MODIFY]** `CommunityController.java` — Thêm 3 endpoint:
  - `PUT /api/communities/{id}/posts/{postId}/pin` — Ghim bài (giới hạn 3 bài, chỉ OWNER/ADMIN)
  - `PUT /api/communities/{id}/posts/{postId}/unpin` — Bỏ ghim bài
  - `GET /api/communities/{id}/pinned-posts` — Lấy danh sách bài ghim

**Frontend:**
- Container `#pinned-posts-container` hiển thị ở đầu feed nhóm
- Thẻ bài viết ghim có nhãn "📌 Đã ghim" nổi bật
- Menu ngữ cảnh (3 chấm) trên mỗi bài có tùy chọn "Ghim/Bỏ ghim" (chỉ OWNER/ADMIN thấy)

---

#### 3. 📋 Nhật Ký Hoạt Động Quản Trị (Admin Activity Logs)

**Backend:**
- **[NEW]** `CommunityActivityLog.java` — Entity log hành động quản trị (`actionType`, `actorId`, `targetId`, `details`, `timestamp`)
- **[NEW]** `CommunityActivityLogRepository.java` — JPA Repository
- **[MODIFY]** `CommunityController.java` — Ghi nhật ký tự động khi:
  - Duyệt thành viên tham gia nhóm
  - Chặn / trục xuất thành viên
  - Xóa bài viết vi phạm
  - Cập nhật quy tắc nhóm
- **[MODIFY]** `PostController.java` — Group Admin/Owner có quyền xóa bài viết bất kỳ trong nhóm của họ (kèm ghi log)
- Endpoint: `GET /api/communities/{id}/logs` — Lấy nhật ký (chỉ OWNER/ADMIN)

**Frontend:**
- Tab "Nhật ký hoạt động" trong bảng điều khiển quản lý nhóm
- Hiển thị danh sách log dạng timeline, bao gồm: actor, hành động, đối tượng, thời gian

---

#### 4. ⏱️ Chặn Thành Viên Có Thời Hạn (Temporary Ban)

**Backend:**
- **[MODIFY]** `CommunityMember.java` — Thêm cột `banUntil` (LocalDateTime, nullable)
- **[MODIFY]** `CommunityController.java` — Cập nhật API ban:
  - Nhận tham số `duration` (1, 3, 7, 30 ngày hoặc vĩnh viễn)
  - Tính và lưu `banUntil = now + duration`
  - Khi người dùng truy cập nhóm hoặc gửi yêu cầu tham gia: kiểm tra `banUntil`, nếu đã qua → tự động chuyển trạng thái về `NONE` (cho phép tham gia lại)

**Frontend:**
- Modal chặn thành viên (`#ban-member-modal`) với dropdown chọn thời hạn chặn
- Hiển thị ngày hết hạn chặn trong tab Thành viên (Quản lý)

---

#### 5. 🛡️ Hệ Thống Kiểm Duyệt Bài Viết Nâng Cấp

**Kịch bản 1 — Tự Động Duyệt (`autoApprove = true`):**
```
Người dùng đăng bài
   → Bài được khởi tạo với status = PENDING_REVIEW (ẩn với mọi người)
   → AI Server quét nội dung (ảnh + văn bản)
   → Nếu safe: status = ACTIVE (hiển thị trên feed)
   → Nếu unsafe: status = REJECTED (ẩn + thông báo tác giả)
```

**Kịch bản 2 — Duyệt Thủ Công (`autoApprove = false`):**
```
Người dùng đăng bài
   → Bài được khởi tạo với status = PENDING_REVIEW
   → AI Server quét nội dung
   → Nếu nguy hiểm cao (score > threshold): Auto-ban → status = REJECTED
   → Nếu đủ an toàn: Chuyển sang hàng chờ PENDING
      → Admin/Owner nhóm duyệt thủ công → ACTIVE hoặc REJECTED
```

**Xử lý khi giải tán nhóm:**
- Toàn bộ bài viết trong nhóm bị đặt `status = DELETED`
- Mọi thành viên mất quyền truy cập ngay lập tức
- Dữ liệu được giữ lại trong DB nhưng ẩn hoàn toàn khỏi giao diện

---

#### 6. 🗺️ Cập Nhật Điều Hướng (Navigation)

- **[MODIFY]** `home.html`, `friends.html`, `communities.html`, `bookmarks.html` — Đồng bộ thanh điều hướng trên tất cả các trang, thêm nút **"Cộng đồng"** và **"Group"** nhất quán.

---

## 🔄 Chức Năng Đang Thực Hiện / Cần Kiểm Tra Lại

| # | Chức năng | Ghi chú |
|---|-----------|---------|
| 1 | **Hiệu ứng thả tim (Like animation)** | Đã tích hợp GSAP cho hiệu ứng tim. Cần kiểm tra lại trên giao diện thực tế xem animation có mượt không và GSAP có load đúng CDN không. |
| 2 | **Tìm kiếm & Lọc bài viết nội bộ nhóm** | Chưa triển khai. Chỉ mới đề xuất trong assessment. |
| 3 | **Thông báo real-time khi có bài ghim mới** | Backend chưa tích hợp WebSocket/SSE để push thông báo. Frontend phải polling thủ công. |
| 4 | **Phân trang (Pagination) cho Nhật ký hoạt động** | Hiện tại lấy toàn bộ log không phân trang, có thể gây chậm khi nhóm hoạt động lâu dài. |

---

## ❌ Chức Năng Chưa Hoàn Thiện / Hướng Mở Rộng

### Ưu tiên cao (Nên làm trong session tiếp theo)

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 1 | **Tìm kiếm & Lọc bài viết nội bộ nhóm (Chức năng 3)** | Thanh tìm kiếm bài trong nhóm, lọc theo hashtag do Admin cấu hình (`#ThảoLuận`, `#ThôngBáo`, `#TàiLiệu`). Cần thêm index trên cột `content` và `community_id` trong bảng `posts`. |
| 2 | **Thống kê hoạt động nhóm (Community Analytics)** | Dashboard OWNER/ADMIN: số thành viên mới/tuần, bài viết/ngày, tỷ lệ bị báo cáo. Cần thêm các aggregate query và biểu đồ Chart.js. |
| 3 | **Chủ đề / Danh mục bài viết (Post Categories/Tags)** | Phân loại bài viết bằng hashtag hoặc category do Admin định nghĩa. Cần thêm bảng `community_tags` và quan hệ M-N với `posts`. |

### Ưu tiên trung bình

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 4 | **Thông báo real-time (WebSocket / SSE)** | Push thông báo khi có bài viết được ghim, khi yêu cầu tham gia được duyệt, khi bị chặn. Cần tích hợp Spring WebSocket hoặc Server-Sent Events. |
| 5 | **Phân trang Nhật ký hoạt động** | Thêm `?page=&size=` vào `GET /api/communities/{id}/logs`. Dùng Spring `Pageable`. |
| 6 | **Mời thành viên qua link (Invite Link)** | Generate link mời dùng một lần hoặc có thời hạn. Cần bảng `community_invite_links` với `token`, `expiresAt`, `maxUses`. |
| 7 | **Export nhật ký (CSV/JSON)** | Cho phép OWNER xuất toàn bộ nhật ký quản trị ra file để lưu trữ. |

### Ưu tiên thấp / Mở rộng dài hạn

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 8 | **Sự kiện cộng đồng (Community Events)** | Tạo sự kiện, RSVP, nhắc nhở thành viên. Cần bảng `community_events` và tích hợp Calendar UI. |
| 9 | **Poll / Bình chọn trong nhóm** | Tạo câu hỏi bình chọn, xem kết quả real-time. Cần bảng `community_polls` và `poll_votes`. |
| 10 | **Kho tài liệu nhóm (File Storage)** | Cho phép upload và chia sẻ file PDF/doc trong nhóm. Cần tích hợp cloud storage (S3/GCS). |
| 11 | **Phân cấp vai trò tùy chỉnh (Custom Roles)** | Cho phép OWNER tạo các vai trò tùy chỉnh với quyền hạn riêng, thay vì chỉ có OWNER/ADMIN/MEMBER. |

---

## 🗂️ File Chính Đã Chỉnh Sửa

### Backend (Java)

| File | Loại | Thay đổi |
|------|------|---------|
| [`CommunityController.java`](src/main/java/com/pbl5/controller/CommunityController.java) | MODIFY | Thêm toàn bộ endpoint Quy tắc, Logs, Pinned Posts, Temporary Ban. Sửa Risk 1 & 2. Cập nhật `convertToResponse`. |
| [`PostController.java`](src/main/java/com/pbl5/controller/PostController.java) | MODIFY | Group Admin/Owner có quyền xóa bài viết + ghi log hành động. |
| [`CommunityService.java`](src/main/java/com/pbl5/service/CommunityService.java) | MODIFY | Sửa `deleteCommunityAndNotifyMembers` hỗ trợ tham số `keepPosts` (Risk 3). |
| [`CommunityRule.java`](src/main/java/com/pbl5/model/CommunityRule.java) | **NEW** | Entity Quy tắc cộng đồng. |
| [`CommunityActivityLog.java`](src/main/java/com/pbl5/model/CommunityActivityLog.java) | **NEW** | Entity Nhật ký hoạt động quản trị. |
| [`CommunityRuleRepository.java`](src/main/java/com/pbl5/repository/CommunityRuleRepository.java) | **NEW** | Repository cho Quy tắc. |
| [`CommunityActivityLogRepository.java`](src/main/java/com/pbl5/repository/CommunityActivityLogRepository.java) | **NEW** | Repository cho Nhật ký. |
| [`Post.java`](src/main/java/com/pbl5/model/Post.java) | MODIFY | Thêm trường `pinned` (boolean). |
| [`PostResponse.java`](src/main/java/com/pbl5/dto/PostResponse.java) | MODIFY | Thêm trường `pinned` vào DTO. |
| [`CommunityMember.java`](src/main/java/com/pbl5/model/CommunityMember.java) | MODIFY | Thêm cột `banUntil` (LocalDateTime). |
| [`CommunityResponse.java`](src/main/java/com/pbl5/dto/CommunityResponse.java) | MODIFY | Thêm `membershipRole` để frontend phân quyền OWNER/ADMIN/MEMBER. |

### Frontend (HTML/JS)

| File | Loại | Thay đổi |
|------|------|---------|
| [`community.html`](src/main/resources/static/html/community.html) | MODIFY | Thêm container ghim bài, tab Quy tắc và Nhật ký, 4 modal mới. |
| [`community.js`](src/main/resources/static/js/community.js) | MODIFY | Thêm toàn bộ logic ghim/bỏ ghim, quy tắc CRUD, nhật ký, temporary ban, logic `joinCommunity` với modal đồng ý. |
| [`home.html`](src/main/resources/static/html/home.html) | MODIFY | Cập nhật thanh nav thêm nút "Cộng đồng". |
| [`friends.html`](src/main/resources/static/html/friends.html) | MODIFY | Cập nhật thanh nav thêm nút "Cộng đồng". |
| [`communities.html`](src/main/resources/static/html/communities.html) | MODIFY | Cập nhật thanh nav đồng bộ. |
| [`bookmarks.html`](src/main/resources/static/html/bookmarks.html) | MODIFY | Cập nhật thanh nav thêm nút "Cộng đồng". |

---

## 🧪 Kết Quả Kiểm Thử

| Kiểm thử | Kết quả |
|---------|---------|
| Hibernate auto-migrate (tạo bảng mới, thêm cột) | ✅ Thành công, không có lỗi khởi tạo |
| Risk 1: Thành viên ngoài nhóm Private gọi `GET .../members` | ✅ Trả về `403 Forbidden` đúng |
| Risk 2: Số SQL query khi load danh sách nhóm | ✅ Giảm từ N+1 xuống còn 2 query |
| Risk 3: Giải tán nhóm với `keepPosts=true` | ✅ Bài viết gỡ liên kết nhóm thành công |
| Quy tắc: Lưu tối đa 10 quy tắc | ✅ Lưu thành công, từ chối khi > 10 |
| Quy tắc: Modal đồng ý hiển thị khi join nhóm Private | ✅ Hiển thị và block API call đúng |
| Ghim: Ghim tối đa 3 bài viết | ✅ Hệ thống từ chối bài thứ 4 |
| Ghim: Bài ghim hiển thị đầu feed | ✅ Hiển thị đúng vị trí |
| Temporary Ban: Chặn 1 ngày, tài khoản mất quyền tương tác | ✅ Chặn thành công |
| Temporary Ban: Sửa `ban_until` về quá khứ → tự gỡ chặn | ✅ Tự động gỡ chặn khi reload |
| Java Spring Boot Server khởi động | ✅ PID: 2800 — http://localhost:8080 |
| Python AI Server khởi động | ✅ PID: 14032 — http://localhost:5000 |

---

## 🔧 Cách Khởi Động Hệ Thống

```powershell
# Khởi động cả 2 server cùng lúc
powershell -ExecutionPolicy Bypass -File ./restart_servers.ps1

# Hoặc khởi động riêng lẻ:
# Java Spring Boot
./mvnw spring-boot:run

# Python AI Server
cd python_ai_server
python app.py
```

**Endpoints chính:**
- **Java Backend:** http://localhost:8080
- **Python AI Server:** http://localhost:5000
- **Swagger UI (nếu có):** http://localhost:8080/swagger-ui.html

---

*Tài liệu được tạo tự động bởi Antigravity AI Coding Assistant — Phiên làm việc 07/06/2026*
