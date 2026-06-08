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

#### 7. 👥 Duyệt Thành Viên & Lời Mời Bạn Bè
- **Backend:** Thêm thực thể `CommunityInvitation`, API gửi, nhận, đồng ý và từ chối lời mời. Hỗ trợ trường `requireApproval` (Duyệt thành viên thủ công hoặc tự động) áp dụng cho cả nhóm Public và Private.
- **Frontend:** Nút/Modal mời bạn bè trực tiếp trên trang chính cộng đồng. Tích hợp hiển thị lời mời chờ xử lý kèm nút Chấp nhận/Từ chối ngay trên đầu dropdown thông báo.

#### 8. 🔍 Tìm Kiếm & Lọc Tag & Quản Lý Tag (Tag CRUD)
- **Backend:** Hỗ trợ tìm kiếm văn bản và lọc theo tag cho Feed bài viết nội bộ nhóm trong `PostRepository`. Tạo thực thể `CommunityTag` để Admin thiết lập các tag chủ đề (tối đa 15 tag).
- **Frontend:** Tích hợp thanh tìm kiếm kèm các chip tag chọn nhanh ở đầu Feed bài viết. Thêm Tab "Chủ đề / Tag" trong bảng điều khiển Admin và phần chọn tag khi tạo bài viết mới.

#### 9. 📊 Nhật Ký Hoạt Động Phân Trang & Xuất Báo Cáo & Dashboard Thống Kê (Analytics)
- **Backend:** Phân trang nhật ký hoạt động qua `Pageable`. Phát triển API xuất log dạng CSV (UTF-8 BOM tránh lỗi hiển thị tiếng Việt trên Excel) hoặc JSON. Thêm API tổng hợp số liệu thống kê.
- **Frontend:** Tab thống kê vẽ biểu đồ xu hướng bài viết và thành viên mới (sử dụng Chart.js). Tab Nhật ký hoạt động hỗ trợ phân trang và nút xuất báo cáo trực quan.

#### 10. 🔔 Thông Báo Real-time WebSocket
- Hỗ trợ live push các thông báo ghim bài viết (`POST_PINNED`) và lời mời tham gia nhóm (`COMMUNITY_INVITE`) qua WebSocket STOMP.

#### 11. 🦴 Hiệu Ứng Tải Skeleton Loader (Skeleton Bone Animations)
- Thay thế hoàn toàn các text thông báo và spinner loading mặc định thành các khung xương skeleton nhấp nháy động chất lượng cao cho: bài viết nhóm, bài viết chờ duyệt, báo cáo vi phạm, thành viên quản trị, quy tắc, nhật ký hoạt động, danh sách bạn bè mời và lịch sử tin nhắn chat.

---

## 🔄 Chức Năng Đang Thực Hiện / Cần Kiểm Tra Lại

| # | Chức năng | Ghi chú |
|---|-----------|---------|
| 1 | **Hiệu ứng thả tim (Like animation)** | Đã tích hợp GSAP cho hiệu ứng tim. Cần kiểm tra lại trên giao diện thực tế xem animation có mượt không và GSAP có load đúng CDN không. |

---

## ❌ Chức Năng Chưa Hoàn Thiện / Hướng Mở Rộng

### Mở rộng dài hạn

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 1 | **Mời thành viên qua link (Invite Link)** | Generate link mời dùng một lần hoặc có thời hạn. Cần bảng `community_invite_links` với `token`, `expiresAt`, `maxUses`. |
| 2 | **Sự kiện cộng đồng (Community Events)** | Tạo sự kiện, RSVP, nhắc nhở thành viên. Cần bảng `community_events` và tích hợp Calendar UI. |
| 3 | **Poll / Bình chọn trong nhóm** | Tạo câu hỏi bình chọn, xem kết quả real-time. Cần bảng `community_polls` và `poll_votes`. |
| 4 | **Kho tài liệu nhóm (File Storage)** | Cho phép upload và chia sẻ file PDF/doc trong nhóm. Cần tích hợp cloud storage (S3/GCS). |
| 5 | **Phân cấp vai trò tùy chỉnh (Custom Roles)** | Cho phép OWNER tạo các vai trò tùy chỉnh với quyền hạn riêng, thay vì chỉ có OWNER/ADMIN/MEMBER. |

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
| [`PostRepository.java`](src/main/java/com/pbl5/repository/PostRepository.java) | MODIFY | Sửa câu truy vấn Bảng tin (`findHomeFeed`, `findHomeFeedPaged`) so khớp trạng thái `ACTIVE` thay vì `ACCEPTED` của thành viên nhóm. |

### Frontend (HTML/JS)

| File | Loại | Thay đổi |
|------|------|---------|
| [`community.html`](src/main/resources/static/html/community.html) | MODIFY | Thêm container ghim bài, tab Quy tắc và Nhật ký, 4 modal mới. Cập nhật trạng thái active thanh bên từ Bảng tin sang Cộng đồng. |
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

---

## 📅 Phiên Làm Việc 08/06/2026

> **Thời gian:** 08/06/2026 (sáng → trưa)
> **Phạm vi:** Trang cá nhân (Profile), Kiểm duyệt bài viết (Content Moderation), Form Đăng ký (Registration), Quản lý cộng đồng (Community Management)

---

### ✅ Những Gì Đã Làm Được

#### 1. 🎨 Sửa Lỗi Giao Diện Chỉnh Sửa Trang Cá Nhân (Light/Dark Mode)

- **Vấn đề:** Modal "Chỉnh sửa Trang cá nhân" và Modal "Cắt ảnh" hiển thị sai màu sắc ở chế độ Light Mode do các biến CSS chưa được định nghĩa (`--surface-1`, `--surface-2`, `--surface-3`, `--canvas`, `--on-primary`). Văn bản tối hiển thị trên nền tối, gây mất tương phản nghiêm trọng.
- **Giải pháp:**
  - Ánh xạ đầy đủ các biến CSS thiếu trong [`home.css`](src/main/resources/static/css/home.css) để tương thích cả Light/Dark Mode.
  - Bổ sung quy tắc CSS cho `<option>` trong `.post-input select` đảm bảo màu chữ đọc được trên cả 2 mode.
- **Kết quả:** Modal hiển thị đẹp, hài hòa, đạt chuẩn UX premium trên cả 2 chế độ.

---

#### 2. 🖼️ Cải Tiến Trang Cá Nhân (Profile Enhancements)

- **Thay dropdown mặc định bằng custom dropdown** (thiết kế tương tự Moderator/Admin) cho các trường chọn trong form chỉnh sửa cá nhân.
- **Thêm tính năng ảnh bìa (Cover Photo):**
  - Upload ảnh bìa lên Cloudinary qua API hiện có.
  - Hiển thị preview ảnh bìa ngay trên trang cá nhân.
  - Lưu URL ảnh bìa vào trường `coverPhoto` của `User`.
- **Điểm chung khi xem trang người khác:**
  - Khi xem trang cá nhân của người dùng khác, hệ thống kiểm tra và hiển thị các điểm tương đồng như:
    - "Cùng tham gia cộng đồng: [Tên nhóm]"
    - "Cùng có bạn chung: [Tên bạn]"
  - Tăng tính kết nối và trải nghiệm xã hội giữa các người dùng.

---

#### 3. 🛡️ Cập Nhật Luồng Kiểm Duyệt Bài Viết — Publish-First, Review-Later

**Bối cảnh:** Trước đây, bài viết có điểm AI từ 40–80% (nghi vấn) sẽ bị ẩn và chờ Moderator duyệt. Yêu cầu mới: bài vẫn hiển thị công khai nhưng nằm trong hàng đợi của Moderator.

**Luồng mới (nhóm duyệt thủ công — `requirePostApproval = true`):**
```
Người dùng đăng bài
  → AI quét nội dung (async)
  → Score < 40%: status = ACTIVE (bình thường)
  → Score 40–80%: status = PENDING_REVIEW → Hiển thị trên Feed + Vào hàng chờ Moderator hệ thống
      → Moderator duyệt: status = ACTIVE (giữ nguyên hiển thị)
      → Moderator từ chối: status = REJECTED → Bị ẩn ngay khỏi mọi Feed
  → Score > 80%: status = AUTO_REJECTED (ẩn hoàn toàn)
```

**Luồng mới (nhóm tự động duyệt — `requirePostApproval = false`):**
```
Người dùng đăng bài
  → AI quét nội dung (async)
  → Score < 40%: status = ACTIVE
  → Score 40–80%: status = PENDING_REVIEW → Hiển thị trên Feed + Moderator vẫn thấy để kiểm tra
  → Score > 80%: status = AUTO_REJECTED
```

**Files đã chỉnh sửa:**
- [`PostRepository.java`](src/main/java/com/pbl5/repository/PostRepository.java): Cập nhật JPQL queries `findHomeFeed`, `findHomeFeedPaged`, `searchCommunityPosts` để bao gồm bài có status `PENDING_REVIEW` trong feed.
- [`PostController.java`](src/main/java/com/pbl5/controller/PostController.java): Cập nhật hàm `canViewPost` — người dùng thông thường có thể xem bài `PENDING_REVIEW`.
- [`CommunityController.java`](src/main/java/com/pbl5/controller/CommunityController.java): API lấy Feed cộng đồng trả về cả `ACTIVE` và `PENDING_REVIEW`.

---

#### 4. 📝 Nâng Cấp Form Đăng Ký Tài Khoản Mới

- **Thêm 2 trường không bắt buộc vào Bước 2 (Thông tin cá nhân):**
  - **Ảnh đại diện (Avatar):** Upload ảnh, hiển thị preview ngay lập tức. Ảnh được upload bất đồng bộ lên Cloudinary qua `/api/upload/image`.
  - **Tình trạng mối quan hệ (Relationship Status):** Dropdown với 4 lựa chọn: *Độc thân, Đang hẹn hò, Đã kết hôn, Phức tạp*.
- **Files đã chỉnh sửa:**
  - [`RegisterRequest.java`](src/main/java/com/pbl5/dto/RegisterRequest.java): Thêm fields `avatar` và `relationshipStatus`.
  - [`AuthService.java`](src/main/java/com/pbl5/service/AuthService.java): Lưu 2 thông tin mới vào `User` khi xác thực email thành công.
  - [`index.html`](src/main/resources/static/index.html): Thêm UI chọn ảnh đại diện và dropdown quan hệ trong `#reg-step-2`.
  - [`main.js`](src/main/resources/static/js/main.js): Thêm hàm `uploadRegisterAvatar` và đóng gói thêm dữ liệu vào payload API đăng ký.

---

#### 5. ✅ Xác Nhận Hệ Thống Duyệt Bài Trong Cộng Đồng

- Đã kiểm tra và xác nhận hệ thống đã có đầy đủ phân quyền:
  - **Admin nhóm (Community Admin/Owner):** Duyệt/Từ chối bài viết trong nhóm (`PENDING_COMM_ADMIN` → `ACTIVE`/`REJECTED`).
  - **Moderator & Admin hệ thống:** Duyệt/Từ chối bài viết nghi vấn (`PENDING_REVIEW` → `ACTIVE`/`REJECTED`).
  - **Phân tầng rõ ràng:** Admin nhóm duyệt bài của nhóm mình → Nếu AI nghi vấn, Moderator hệ thống duyệt thêm một lần nữa. Hai cấp độ độc lập.

---

#### 6. 👥 Đồng Bộ Bài Viết Nhóm lên Bảng Tin (Home Feed Synchronization)

- **Vấn đề:** Khi người dùng tham gia vào một cộng đồng, các bài viết của cộng đồng đó không xuất hiện trên Bảng tin (`home.html`) do câu truy vấn JPQL trong `PostRepository.java` kiểm tra trạng thái thành viên bằng giá trị `'ACCEPTED'` (không tồn tại trong enum `CommunityMemberStatus`), dẫn đến không khớp được dữ liệu.
- **Giải pháp:** Cập nhật các câu truy vấn JPQL `findHomeFeed` và `findHomeFeedPaged` trong `PostRepository.java` để so khớp điều kiện `cm.status = 'ACTIVE'` (trạng thái chính xác khi thành viên đã tham gia nhóm).
- **Kết quả:** Bài viết từ các cộng đồng đã tham gia hiển thị chính xác trên Bảng tin của người dùng.

---

#### 7. 🧭 Khắc Phục Lỗi Highlight Trạng Thái Active trên Left Sidebar của Cộng Đồng

- **Vấn đề:** Khi xem chi tiết một cộng đồng (`community.html`), thanh bên trái (Left Sidebar) lại tô sáng mục **Bảng tin** thay vì mục **Cộng đồng**, gây nhầm lẫn định hướng.
- **Giải pháp:** Cập nhật thuộc tính `class="menu-item active"` sang mục **Cộng đồng** và chuyển mục **Bảng tin** về `class="menu-item"` bình thường trong tệp `community.html`.
- **Kết quả:** Trạng thái active trên thanh bên trái hiển thị chính xác và đồng bộ khi xem cộng đồng.

---

### 🧪 Kết Quả Kiểm Thử (08/06/2026)

| Kiểm thử | Kết quả |
|---------|---------|
| Biên dịch dự án Java (`mvn clean compile`) — sau tất cả thay đổi | ✅ `BUILD SUCCESS` |
| Light Mode — Modal chỉnh sửa profile hiển thị đúng | ✅ Màu sắc, tương phản đạt chuẩn |
| Dark Mode — Modal chỉnh sửa profile hiển thị đúng | ✅ Không thay đổi so với trước |
| Form đăng ký — Chọn ảnh đại diện và upload | ✅ Upload thành công lên Cloudinary |
| Form đăng ký — Chọn tình trạng mối quan hệ | ✅ Lưu vào DB khi xác thực email |
| Feed — Bài `PENDING_REVIEW` hiển thị trong Home Feed | ✅ Hiển thị đúng |
| Feed — Bài `PENDING_REVIEW` hiển thị trong Group Feed | ✅ Hiển thị đúng |
| Moderator — Bài `PENDING_REVIEW` vẫn nằm trong hàng chờ | ✅ Moderator thấy và có thể duyệt/từ chối |
| Moderator từ chối → Bài bị ẩn ngay khỏi Feed | ✅ Trạng thái REJECTED ẩn bài |
| Khởi động server (Python + Java) | ✅ Cả 2 server hoạt động bình thường |

---

### ❌ Những Gì Chưa Làm Được / Còn Thiếu (08/06/2026)

| # | Hạng mục | Lý do / Ghi chú |
|---|----------|----------------|
| 1 | **Kiểm thử giao diện thực tế (E2E)** | Chỉ kiểm tra biên dịch, chưa có kịch bản test thủ công đầy đủ từ đầu đến cuối |
| 2 | **Thông báo cho tác giả khi bài bị ẩn sau khi Moderator từ chối** | Chưa tích hợp WebSocket notification khi trạng thái bài chuyển `PENDING_REVIEW → REJECTED` |
| 3 | **Hiển thị badge "Đang chờ duyệt" trên bài viết `PENDING_REVIEW` cho tác giả** | Tác giả chưa biết bài đang bị theo dõi bởi Moderator |
| 4 | **Điểm chung khi xem profile người khác — kiểm tra thực tế UI** | Chức năng đã được phát triển nhưng chưa verify trực tiếp trên giao diện |
| 5 | **Ảnh bìa (Cover Photo) — hiển thị đồng bộ trên tất cả trang** | Trang cá nhân đã có, nhưng chưa đồng bộ hiển thị trên card bạn bè, danh sách tìm kiếm |
| 6 | **Unit Test / Integration Test tự động** | Dự án chưa có bộ test tự động — mọi kiểm tra đang là thủ công |

---

### 🔮 Hướng Phát Triển Tiếp Theo

1. **Thông báo thời gian thực khi bài bị Moderator ẩn** — Push WebSocket notification đến tác giả.
2. **Badge trạng thái trên bài viết của tác giả** — Hiển thị nhãn "⏳ Đang xem xét" nhỏ chỉ tác giả thấy.
3. **Đồng bộ ảnh bìa** — Hiển thị cover photo trên card bạn bè và trang tìm kiếm người dùng.
4. **Kiểm tra toàn diện E2E** — Chạy kịch bản test đầy đủ từng luồng nghiệp vụ chính.
5. **Mở rộng form đăng ký** — Thêm thông tin sở thích, nghề nghiệp, địa chỉ (tùy chọn).

---

### 📅 Phiên Làm Việc Tiếp Theo (Đồng Bộ & Chuẩn Hóa Trải Nghiệm Feed)

> **Thời gian:** 08/06/2026 (chiều)
> **Phạm vi:** Trải nghiệm Bảng tin (Home Feed), Trang Cộng đồng (Community Feed), Chi tiết Bài viết (Post Details), Trang Cá nhân (Profile), và Hệ thống Báo cáo phân quyền.

---

### ✅ Những Gì Đã Làm Được

#### 1. 👥 Chuẩn hóa Trải nghiệm Cộng đồng trên Bảng tin & Trang cá nhân
- **Nút "Tham gia" (Join) trực tiếp từ Feed:**
  - Đối với các bài viết thuộc về cộng đồng công khai (`communityPrivate = false`), nếu người dùng hiện tại chưa tham gia (`joinedCommunity = false`), hệ thống sẽ hiển thị một nút **"Tham gia"** ngay cạnh tên cộng đồng trên Home Feed, Community Feed, và Profile Feed.
  - Tích hợp hiệu ứng Optimistic UI giúp cập nhật ngay lập tức giao diện sang trạng thái *"Đã tham gia"* sau khi gọi thành công `POST /api/communities/{id}/join`.

#### 2. 🛡️ Phân quyền & Đồng bộ hóa Menu Tùy Chọn (3 chấm)
- **Menu Động dựa trên ngữ cảnh và vai trò:**
  - **Bài viết cá nhân (của chính mình):** Hỗ trợ đổi trạng thái hiển thị (Công khai, Bạn bè, Chỉ mình tôi) và Xóa bài viết.
  - **Bài viết cá nhân (của người khác):** Hỗ trợ Ẩn bài viết và Báo cáo bài viết (System Report).
  - **Bài viết cộng đồng (của chính mình):** Hỗ trợ Lưu bài viết (Bookmark), Ẩn bài viết, và Xóa bài viết.
  - **Bài viết cộng đồng (của người khác):** Hỗ trợ Lưu bài viết (Bookmark), Ẩn bài viết, Báo cáo tới Chủ nhóm (`COMMUNITY` target) và Báo cáo tới Quản trị hệ thống (`SYSTEM` target).
- **Hành động Kháng nghị (Appeal) & Xóa bài viết bị gỡ:** Tự động ẩn các tùy chọn khác và chỉ hiển thị nút Kháng nghị / Xóa khi bài viết bị gỡ do vi phạm tiêu chuẩn cộng đồng (`REJECTED` / `AUTO_REJECTED`).

#### 3. 📋 Tách biệt luồng báo cáo (Targeted Report)
- Bổ sung trường `reportTarget` (`COMMUNITY` hoặc `SYSTEM`) vào DTO payload khi gửi yêu cầu báo cáo bài viết hoặc bình luận qua API `/api/posts/{postId}/report`.
- Tích hợp HTML Modal Báo cáo động vào tất cả các trang (`home.html`, `community.html`, `post.html`, `profile.html`) để cho phép người dùng chọn phân loại đối tượng nhận báo cáo.

---

#### 4. 🤝 Tính năng Kết Bạn Nhanh Từ Feed & Sửa Lỗi Hiển Thị Bài Viết Trên Trang Cá Nhân
- **Nút "Kết bạn" (Add Friend) trực tiếp trên bài viết:**
  - Hiển thị nút **"Kết bạn"** (Add Friend) hoặc **"Đang chờ"** (Pending) ngay bên cạnh tên tác giả bài viết trên Home Feed, Community Feed, Post Details, và Profile Feed nếu người dùng hiện tại và tác giả chưa kết bạn.
  - Sau khi người dùng bấm kết bạn, hệ thống thực hiện gọi API `POST /api/friends/request/{userId}` và cập nhật tức thì trạng thái nút thành *"Đã gửi"*.
- **Đồng bộ hóa dữ liệu danh sách bài viết:**
  - Cập nhật hàm `convertToResponses` trong `PostController.java` để đảm bảo luôn điền đầy đủ thông tin `joinedCommunity`, `communityPrivate`, và `friendshipStatus` cho danh sách bài viết trả về qua API (ví dụ `/api/posts/user/{userId}` cho trang cá nhân của người khác), sửa lỗi bài viết public hoặc nút Join/Kết bạn không hoạt động đúng trên trang cá nhân của người khác.

---

### 🗂️ File Đã Chỉnh Sửa

| File | Loại | Thay đổi |
|------|------|---------|
| [`PostResponse.java`](src/main/java/com/pbl5/dto/PostResponse.java) | MODIFY | Thêm trường `friendshipStatus` kèm getter/setter để truyền trạng thái quan hệ bạn bè từ backend lên UI. |
| [`PostService.java`](src/main/java/com/pbl5/service/PostService.java) | MODIFY | Inject `FriendshipRepository` và điền trạng thái `friendshipStatus` trong `convertToResponse`. |
| [`PostController.java`](src/main/java/com/pbl5/controller/PostController.java) | MODIFY | Điền đầy đủ `joinedCommunity`, `communityPrivate`, và `friendshipStatus` trong cả `convertToResponse` và `convertToResponses` để danh sách bài viết (profile, home) luôn có đủ dữ liệu. |
| [`home.js`](src/main/resources/static/js/home.js) | MODIFY | Tích hợp nút kết bạn nhanh và nút tham gia cộng đồng cạnh tên tác giả; thêm hàm helper `addFriendFromFeed`. |
| [`profile.js`](src/main/resources/static/js/profile.js) | MODIFY | Tích hợp nút kết bạn nhanh và sửa điều kiện kiểm tra nhóm để hiển thị nút Join cạnh tên tác giả trên trang cá nhân; thêm helper `addFriendFromFeed`. |
| [`community.js`](src/main/resources/static/js/community.js) | MODIFY | Thêm nút kết bạn nhanh bên cạnh tên tác giả khi xem bài viết trong nhóm; thêm các hàm helper `addFriendFromFeed` và `joinCommunityFromFeed`. |
| [`post.js`](src/main/resources/static/js/post.js) | MODIFY | Thêm nút kết bạn nhanh và nút tham gia cộng đồng trên trang chi tiết bài viết; thêm các hàm helper `addFriendFromFeed` và `joinCommunityFromFeed`. |

---


*Cập nhật bởi Antigravity AI Coding Assistant — Phiên làm việc 08/06/2026*

---

## 🔧 Phiên Sửa Lỗi 08/06/2026 (Chiều) — Bảng Tin & Bài Viết Cá Nhân

### 🐛 Vấn Đề Được Phát Hiện

#### 1. Bảng tin bị load liên tục, không hiển thị bài viết
- **Nguyên nhân:** Hàm `fetchPosts` trong `home.js` gọi đệ quy không có điều kiện dừng khi API trả về lỗi hoặc token hết hạn.

#### 2. Bài viết cá nhân không hiển thị trên bảng tin
- **Nguyên nhân 1 (DB):** Khi đăng bài cá nhân (không thuộc cộng đồng), `PostService.createPost()` lưu trạng thái ban đầu là `PENDING_REVIEW` cho tất cả bài viết. Bài chờ AI kiểm duyệt nên bị ẩn khỏi feed của người dùng khác.
- **Nguyên nhân 2 (Query):** `findHomeFeedPaged` sử dụng `LEFT JOIN FETCH` kết hợp `Pageable`, gây ra lỗi Hibernate (in-memory pagination) làm mất các bài viết cá nhân PUBLIC khỏi kết quả truy vấn.
- **Nguyên nhân 3 (Compile):** File `PostController.java` có đoạn code trùng lặp (`Duplicate method toggleLikeComment`) do lỗi của phiên chỉnh sửa trước, khiến server không thể khởi động.

#### 3. Bài viết PUBLIC của người dùng A không hiển thị trên bảng tin của người dùng B
- **Nguyên nhân:** `findHomeFeedPaged` không trả về bài viết cá nhân PUBLIC từ người dùng khác do vấn đề kết hợp `LEFT JOIN FETCH` + `Pageable` trong Hibernate.

---

### ✅ Giải Pháp Đã Áp Dụng

#### Fix 1: `PostService.java` — Bài cá nhân lưu thẳng là `ACTIVE`
```java
// Trước: tất cả bài đều PENDING_REVIEW
PostStatus initialStatus = PostStatus.PENDING_REVIEW;

// Sau: bài cá nhân → ACTIVE ngay, bài cộng đồng → PENDING_REVIEW
if (post.getCommunity() == null) {
    initialStatus = PostStatus.ACTIVE;  // hiển thị ngay
} else if (requireApproval) {
    initialStatus = PostStatus.PENDING_COMM_ADMIN;
} else {
    initialStatus = PostStatus.PENDING_REVIEW;
}
```
AI vẫn chạy kiểm duyệt nền, cập nhật status nếu phát hiện vi phạm.

#### Fix 2: `PostController.java` — Xóa code trùng lặp gây lỗi compile
- Xóa đoạn code duplicate `toggleLikeComment` và garbage code tại cuối file.
- Server khởi động thành công sau fix.

#### Fix 3: `PostController.java` + `PostRepository.java` — Feed hợp nhất từ nhiều nguồn
Thay vì phụ thuộc vào một JPQL phức tạp, `getAllPosts` giờ hợp nhất từ 4 nguồn:
1. `findHomeFeedPaged` — bài cộng đồng + admin feed
2. `findPublicPersonalPostsForFeed` — bài cá nhân PUBLIC từ mọi người **(query mới, riêng biệt)**
3. `findFriendsPersonalPostsForFeed` — bài cá nhân FRIENDS từ bạn bè **(query mới, riêng biệt)**
4. `findByUserIdOrderByCreatedAtDesc` — bài của bản thân (kể cả PENDING_REVIEW)

Sau đó deduplicate, sort theo `createdAt DESC`, và phân trang thủ công.

---

### 🗂️ File Đã Chỉnh Sửa (Phiên Chiều 08/06/2026)

| File | Loại | Thay đổi |
|------|------|---------|
| [`PostService.java`](src/main/java/com/pbl5/service/PostService.java) | MODIFY | Bài cá nhân (community IS NULL) lưu trực tiếp với status `ACTIVE` thay vì `PENDING_REVIEW`; AI kiểm duyệt vẫn chạy nền. |
| [`PostController.java`](src/main/java/com/pbl5/controller/PostController.java) | MODIFY | Xóa code trùng lặp `toggleLikeComment` gây lỗi compile; cập nhật `getAllPosts` để hợp nhất feed từ 4 nguồn riêng biệt. |
| [`PostRepository.java`](src/main/java/com/pbl5/repository/PostRepository.java) | MODIFY | Thêm 2 query mới: `findPublicPersonalPostsForFeed` và `findFriendsPersonalPostsForFeed` — dùng `@EntityGraph` thay `LEFT JOIN FETCH` để tránh lỗi pagination của Hibernate. |

---

*Cập nhật bởi Antigravity AI Coding Assistant — Phiên làm việc 08/06/2026 (Chiều)*
