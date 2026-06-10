# 📁 Báo Cáo Phân Tích Cấu Trúc Thư Mục & Vai Trò Các File Trong `src/main`

Tài liệu này tổng hợp toàn bộ các thư mục và chức năng của từng file mã nguồn trong thư mục `src/main` thuộc dự án **PBL5: Hệ Thống Kiểm Duyệt Nội Dung**.

---

## 🗺️ 1. Tổng Quan Cấu Trúc Thư Mục Con Trong `src/main`

```
src/main/
├── java/com/pbl5/           # Mã nguồn Java (Backend Spring Boot)
│   ├── config/              # Cấu hình hệ thống (CORS, WebSocket, Startup)
│   ├── controller/          # Tầng tiếp nhận & điều phối HTTP API (REST Controllers)
│   ├── dto/                 # Các đối tượng truyền tải dữ liệu (Data Transfer Objects)
│   ├── enums/               # Các định nghĩa kiểu liệt kê (Hằng số trạng thái)
│   ├── model/               # Các thực thể dữ liệu ánh xạ database (JPA Entities)
│   ├── repository/          # Tầng giao tiếp & truy vấn Database (Spring Data JPA)
│   ├── security/            # Cấu hình bảo mật hệ thống (JWT, Google OAuth2)
│   └── service/             # Tầng xử lý logic nghiệp vụ cốt lõi (Business Logic)
├── resources/               # Các tài nguyên cấu hình & Frontend tĩnh
│   ├── static/              # Mã nguồn giao diện (HTML, CSS, JS, Images)
│   └── application.properties # Cấu hình môi trường (DB, Mail, Cloudinary, Websocket)
└── model/                   # Mã nguồn Python AI Server (Flask + Deep Learning)
```

---

## 🔍 2. Vai Trò Chi Tiết Của Từng Thư Mục & File

### 🔹 A. Thư mục `src/main/java/com/pbl5/` (Mã Nguồn Java Backend)

#### 1. Lớp khởi chạy hệ thống (Application Root)
*   **[`Application.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/Application.java):** Tệp khởi chạy chính của ứng dụng Spring Boot. Chứa phương thức `main` và thực hiện kiểm tra kết nối cơ sở dữ liệu PostgreSQL ngay khi khởi động.

---

#### 2. Thư mục `config/` (Cấu Hình Hệ Thống)
*   **[`DatabaseMigrationRunner.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/config/DatabaseMigrationRunner.java):** Chạy kiểm tra hoặc di cư cơ sở dữ liệu khi bắt đầu ứng dụng.
*   **[`ModerationApiLauncher.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/config/ModerationApiLauncher.java):** Tự động phát tín hiệu HTTP GET kiểm tra Python Server AI khi Java start. Nếu chưa chạy, nó sẽ tự động dùng lệnh OS kích hoạt chạy server Python.
*   **[`WebConfig.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/config/WebConfig.java):** Cấu hình CORS (Cho phép Frontend gọi API Backend từ các nguồn khác nhau) và các đường dẫn tài nguyên tĩnh.
*   **[`WebSocketConfig.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/config/WebSocketConfig.java):** Cấu hình Broker cho kênh truyền thông WebSocket STOMP nhằm đẩy thông báo thời gian thực (real-time notifications) xuống trình duyệt.

---

#### 3. Thư mục `controller/` (Tầng Tiếp Nhận API REST)
*   **[`AdminController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/AdminController.java):** Cung cấp các API thống kê, quản lý người dùng, xử lý báo cáo vi phạm dành cho Admin hệ thống.
*   **[`AuthController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/AuthController.java):** Quản lý đăng ký tài khoản, đăng nhập, xác minh mã PIN qua Email, quên mật khẩu và bổ sung thông tin ban đầu.
*   **[`ChatController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/ChatController.java):** Quản lý hộp thoại, phòng chat và lịch sử tin nhắn trực tiếp giữa các người dùng.
*   **[`CommunityController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/CommunityController.java):** Điều phối các Endpoint quản lý nhóm (Tạo nhóm, duyệt thành viên, thiết lập quy tắc, xuất nhật ký CSV, cấm thành viên có thời hạn).
*   **[`CreatePostController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/CreatePostController.java):** Endpoint đặc thù tiếp nhận yêu cầu đăng tải bài viết mới.
*   **[`FileUploadController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/FileUploadController.java):** Endpoint nhận tệp tin đa phương tiện (ảnh, video) từ client gửi lên để chuẩn bị upload lên đám mây.
*   **[`FriendshipController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/FriendshipController.java):** Điều phối API kết bạn: gửi lời mời, đồng ý, hủy kết bạn, lấy danh sách bạn chung.
*   **[`ModeratorController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/ModeratorController.java):** Cung cấp API dành riêng cho các kiểm duyệt viên hệ thống quản lý danh sách bài viết bị AI nghi ngờ.
*   **[`NotificationController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/NotificationController.java):** Endpoint đọc, đánh dấu đã xem thông báo của người dùng.
*   **[`PostController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/PostController.java):** Quản lý các hành động trên bài viết cá nhân và bảng tin: Lấy feed, Like bài viết, Comment bài viết.
*   **[`UserController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/UserController.java):** Tiếp nhận thông tin lấy thông tin hồ sơ (profile), cập nhật ảnh đại diện, ảnh bìa, mật khẩu.

---

#### 4. Thư mục `service/` (Tầng Xử Lý Logic Nghiệp Vụ Cốt Lõi)
*   **[`AuthService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/AuthService.java):** Logic đăng ký, băm mật khẩu BCrypt, tạo mã PIN xác thực gửi mail, cấp mã token đăng nhập.
*   **[`ChatService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/ChatService.java):** Lưu trữ tin nhắn, lấy lịch sử chat giữa 2 người dùng.
*   **[`CommentService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/CommentService.java):** Xử lý nghiệp vụ đăng bình luận, trả lời bình luận (Reply comment), thích bình luận và xóa bình luận.
*   **[`CommunityService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/CommunityService.java):** Xử lý nghiệp vụ gia nhập nhóm, phê duyệt thành viên, thiết lập quy tắc, ban/unban và giải tán nhóm (chọn giữ bài hoặc xóa bài).
*   **[`ContentModerationService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/ContentModerationService.java):** Trung tâm kết nối AI: gửi HTTP request tới Python server, so sánh các điểm số với ngưỡng (`THRESHOLD`), tự động gỡ bài nếu vi phạm và gửi thông báo WebSocket.
*   **[`EmailService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/EmailService.java):** Tạo email định dạng HTML để gửi mã OTP, mã xác minh đăng ký hoặc link quên mật khẩu.
*   **[`FileUploadService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/FileUploadService.java):** Kết nối với Cloudinary API để truyền dữ liệu ảnh/video lên dịch vụ lưu trữ đám mây.
*   **[`FriendshipService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/FriendshipService.java):** Logic kiểm tra trạng thái quan hệ bạn bè, gợi ý kết bạn dựa trên bạn chung.
*   **[`LikeService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/LikeService.java):** Xử lý nghiệp vụ Thích và Bỏ thích bài viết.
*   **[`NotificationService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/NotificationService.java):** Quản lý lưu trữ trạng thái của các thông báo trong hệ thống.
*   **[`PostCleanupScheduler.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/PostCleanupScheduler.java):** Lên lịch quét tự động (Cron Job): định kỳ quét dọn các bài viết bị AI gỡ bỏ vĩnh viễn sau 3 ngày không kháng nghị thành công.
*   **[`PostService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/PostService.java):** Logic lọc bài đăng hiển thị trên bảng tin (deduplicate, sắp xếp), ghim bài viết lên đầu nhóm và kiểm soát thẻ tag.
*   **[`UserService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/UserService.java):** Cập nhật hồ sơ cá nhân, tính toán điểm vi phạm của người dùng, thực hiện phạt khóa chức năng đăng bài.

---

#### 5. Thư mục `model/` (Tầng Các Lớp Thực Thể - JPA Entities)
*   **[`BaseContent.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/BaseContent.java):** Lớp cha trừu tượng lưu trữ ID và ngày tạo chung cho Bài viết & Bình luận.
*   **[`Bookmark.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Bookmark.java):** Lưu trữ thông tin bài viết đã lưu (Bookmarked) của từng user.
*   **[`Comment.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Comment.java):** Ánh xạ bảng `comments`, lưu trữ văn bản bình luận, liên kết đa cấp (cha-con cho reply).
*   **[`CommentLike.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/CommentLike.java):** Lưu vết lượt thích bình luận.
*   **[`Community.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Community.java):** Ánh xạ bảng `communities` chứa thông tin cộng đồng (avatar, ảnh bìa, chế độ riêng tư).
*   **[`CommunityActivityLog.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/CommunityActivityLog.java):** Lưu vết lịch sử hành động quản trị (duyệt bài, xóa bài, ban thành viên) của Admin nhóm.
*   **[`CommunityInvitation.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/CommunityInvitation.java):** Quản lý lời mời bạn bè tham gia cộng đồng.
*   **[`CommunityMember.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/CommunityMember.java):** Ánh xạ vai trò (`OWNER`, `ADMIN`, `MEMBER`), trạng thái tham gia nhóm và thời hạn bị chặn (`banUntil`).
*   **[`CommunityRule.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/CommunityRule.java):** Lưu quy tắc hoạt động của các nhóm.
*   **[`CommunityTag.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/CommunityTag.java):** Quản lý các nhãn chủ đề để phân loại bài viết trong nhóm.
*   **[`Friendship.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Friendship.java):** Ánh xạ bảng `friendships` ghi nhận trạng thái quan hệ kết bạn (`PENDING`, `ACCEPTED`, `DECLINED`).
*   **[`HiddenPost.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/HiddenPost.java):** Lưu vết các bài viết mà người dùng chọn ẩn khỏi bảng tin của họ.
*   **[`Like.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Like.java):** Lưu vết lượt thích bài viết.
*   **[`LoginHistory.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/LoginHistory.java):** Ghi nhật ký đăng nhập (Địa chỉ IP, trình duyệt, phương thức Local/Google).
*   **[`Message.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Message.java):** Lưu trữ nội dung tin nhắn chat.
*   **[`Notification.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Notification.java):** Thực thể lưu thông báo hệ thống (bài bị gỡ, lời mời kết bạn, ghim bài...).
*   **[`Post.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Post.java):** Thực thể chính lưu trữ bài viết, đi kèm tọa độ vi phạm ảnh/video (`nsfwBox`, `violenBox`), điểm vi phạm AI (`bestScore`), và nội dung chữ OCR.
*   **[`Report.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Report.java):** Ghi nhận báo cáo vi phạm nội dung từ người dùng gửi tới Admin hệ thống hoặc Admin nhóm.
*   **[`User.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/User.java):** Lưu thông tin tài khoản, mật khẩu đã hash, ảnh đại diện, ảnh bìa, vai trò hệ thống (`USER`, `MODERATOR`, `ADMIN`), và thời gian bị phạt khóa chức năng.

---

#### 6. Thư mục `repository/` (Tầng Giao Tiếp SQL Database)
Chứa các Interface kế thừa `JpaRepository` để Spring tự động sinh câu truy vấn SQL:
*   `BookmarkRepository.java`, `CommentLikeRepository.java`, `CommentRepository.java`, `CommunityActivityLogRepository.java`, `CommunityInvitationRepository.java`, `CommunityMemberRepository.java`, `CommunityRepository.java`, `CommunityRuleRepository.java`, `CommunityTagRepository.java`, `FriendshipRepository.java`, `HiddenPostRepository.java`, `LikeRepository.java`, `LoginHistoryRepository.java`, `MessageRepository.java`, `NotificationRepository.java`, `PostRepository.java`, `ReportRepository.java`, `UserRepository.java`.

---

#### 7. Thư mục `dto/` (Đối Tượng Truyền Tải Dữ Liệu)
Chứa các lớp Java dùng để bao gói dữ liệu gửi và nhận qua mạng HTTP REST API, tránh lộ thực thể Database:
*   `CreatePostRequest.java`, `FriendResponse.java`, `LoginRequest.java`, `ModerationResult.java`, `OnboardingRequest.java`, `PostRequest.java`, `PostResponse.java`, `ProfileUpdateRequest.java`, `RegisterRequest.java`, `ResetPasswordRequest.java`, `VisibilityRequest.java`.

---

#### 8. Thư mục `enums/` (Các Kiểu Liệt Kê Hằng Số)
*   `CommunityMemberStatus.java`, `CommunityRole.java`, `FriendshipStatus.java`, `PostStatus.java`, `PostVisibility.java`, `Provider.java`, `Role.java`, `UserStatus.java`.

---

#### 9. Thư mục `security/` (Tầng Bảo Mật & Xác Thực)
*   **[`CustomOAuth2UserService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomOAuth2UserService.java):** Xử lý đăng nhập Google, đồng bộ tài khoản Google vào DB của hệ thống.
*   **[`CustomUserDetails.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomUserDetails.java):** Bao bọc đối tượng `User` của dự án thành kiểu `UserDetails` của Spring Security để phân quyền.
*   **[`CustomUserDetailsService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomUserDetailsService.java):** Cung cấp hàm nạp thông tin người dùng từ cơ sở dữ liệu qua Email.
*   **[`JwtAuthenticationFilter.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/JwtAuthenticationFilter.java):** Bộ lọc (Filter) đọc Header `Authorization`, giải mã JWT token để xác nhận danh tính người dùng trên mỗi Request.
*   **[`JwtTokenProvider.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/JwtTokenProvider.java):** Tạo mã JWT và giải mã/xác minh tính hợp lệ của mã JWT.
*   **[`OAuth2AuthenticationSuccessHandler.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/OAuth2AuthenticationSuccessHandler.java):** Xử lý chuyển hướng người dùng trở lại Frontend kèm token JWT sau khi đăng nhập bằng Google thành công.

---

### 🔹 B. Thư mục `src/main/resources/` (Tài Nguyên Tĩnh & Cấu Hình)

*   **[`application.properties`](file:///d:/University/PBL5/PBL5/src/main/resources/application.properties):** File chứa toàn bộ mật khẩu, thông tin kết nối Database PostgreSQL, cấu hình gửi Mail SMTP (Gmail), cấu hình tài khoản đám mây Cloudinary và WebSocket.
*   **Thư mục `static/`:** Chứa toàn bộ giao diện Web của hệ thống bao gồm:
    *   Các trang giao diện: `index.html` (Đăng nhập/Đăng ký), `home.html` (Bảng tin), `profile.html` (Trang cá nhân), `community.html` (Trang chi tiết nhóm), `communities.html` (Danh sách nhóm), `admin.html` (Bảng quản trị hệ thống), `chat.html` (Trang nhắn tin), `bookmarks.html` (Bài viết đã lưu).
    *   Các tệp CSS style trong thư mục `css/` và logic hoạt động JavaScript tương ứng trong thư mục `js/`.

---

### 🔹 C. Thư mục `src/main/model/` (Mã Nguồn Python AI Server)

Mặc dù đặt trong thư mục `src/main/model`, đây là một project **Python Flask độc lập** chạy trên cổng `5000` chịu trách nhiệm xử lý các tác vụ Trí tuệ nhân tạo nặng:

*   **[`moderate.py`](file:///d:/University/PBL5/PBL5/src/main/model/moderate.py):** File chạy chính của AI Server. Khởi chạy Flask app, chứa logic tải tệp qua mạng, chạy OCR (phát hiện chữ bằng EasyOCR CRAFT, dịch chữ bằng VietOCR), tiền xử lý và nạp dữ liệu vào các mô hình Deep Learning để trả về kết quả JSON.
*   **[`requirements.txt`](file:///d:/University/PBL5/PBL5/src/main/model/requirements.txt):** Liệt kê các thư viện Python cần cài đặt (PyTorch, OpenCV, Flask, EasyOCR, VietOCR, librosa...).
*   **Các file mô hình weights mạng nơ-ron (.pt / .pth):**
    *   `best_NSFW.pt`: Trọng số của mô hình phát hiện hình ảnh nhạy cảm/khỏa thân.
    *   `best_violence.pth`: Trọng số mô hình phát hiện cảnh bạo lực trong ảnh/video.
    *   `phobert_hatespeech_best.pt`: Trọng số mô hình PhoBERT xử lý ngôn ngữ tự nhiên để phát hiện từ ngữ thù ghét trong văn bản và chữ trên ảnh (OCR).
    *   `mfcc_hatespeech_model.pt`: Trọng số mô hình phát hiện thù ghét từ giọng nói/âm thanh trong video (trích xuất đặc trưng âm thanh MFCC kết hợp mạng LSTM).
