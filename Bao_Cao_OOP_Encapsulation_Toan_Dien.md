# 🛡️ Báo Cáo Phân Tích Toàn Diện: Tính Đóng Gói (Encapsulation) Trong OOP Qua Toàn Bộ Codebase

Tính đóng gói (**Encapsulation**) trong dự án **PBL5: Hệ Thống Kiểm Duyệt Nội Dung** không chỉ đơn thuần là việc sử dụng `private` cho thuộc tính và `public` cho các phương thức Getter/Setter, mà nó được áp dụng một cách nhất quán từ **Tầng Cấu trúc Dữ liệu (Models/DTOs)**, **Tầng Logic Nghiệp Vụ (Services)**, **Tầng Điều khiển Giao tiếp (Controllers)** cho đến **Tầng Xử lý Thuật toán (Python AI Server)**.

Dưới đây là phân tích chi tiết toàn bộ mã nguồn của hệ thống để làm nổi bật tính đóng gói của OOP.

---

## 📊 1. Sơ Đồ Thiết Kế Tính Đóng Gói Theo Kiến Trúc Phân Tầng

Sơ đồ kiến trúc dưới đây minh họa cách hệ thống cô lập và bảo vệ dữ liệu ở từng tầng (Layered Encapsulation). Mỗi tầng chỉ giao tiếp với tầng bên dưới thông qua các Interface hoặc API được xác định rõ ràng, hoàn toàn ẩn đi cơ chế lưu trữ hoặc tính toán nội bộ.

```mermaid
graph TD
    subgraph Tầng Giao Tiếp (Client/Controller)
        Client[Trình duyệt/Client JS] -- Gửi Request DTO / Nhận Response DTO --> Controller[Controllers: PostController, UserController]
    end

    subgraph Tầng Nghiệp Vụ (Services)
        Controller -- Gọi Hàm Nghiệp Vụ Công Khai --> Service[Services: PostService, ContentModerationService]
        Service -- Ẩn các tham số, logic phạt điểm, gọi REST API AI Server --> AIProcess[moderate.py: ContentModerationSystem]
    end

    subgraph Tầng Dữ Liệu (Models & DB)
        Service -- Tương Tác Qua Repository --> Repository[Spring Data JPA Repositories]
        Repository -- Ánh xạ trực tiếp & bảo vệ thuộc tính Private --> Database[(PostgreSQL Database)]
    end

    style Client fill:#f9f,stroke:#333,stroke-width:2px
    style Controller fill:#bbf,stroke:#333,stroke-width:2px
    style Service fill:#bfb,stroke:#333,stroke-width:2px
    style AIProcess fill:#fbb,stroke:#333,stroke-width:2px
    style Database fill:#ddd,stroke:#333,stroke-width:2px
```

---

## 🔍 2. Phân Tích Chi Tiết Các Tầng Mã Nguồn (Codebase Analysis)

### 🔹 Tầng 1: Đóng Gói Dữ Liệu Thực Thể (Entity Data Encapsulation)
Các thực thể trong thư mục [`src/main/java/com/pbl5/model/`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model) là ví dụ kinh điển nhất về sự bao bọc dữ liệu:

1.  **Che Giấu Thuộc Tính Tuyệt Đối:**
    *   Trong tệp [`User.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/User.java), các thuộc tính cực kỳ nhạy cảm như `password` (mật khẩu đã băm), `verificationCode` (mã xác nhận email), `resetPasswordToken`, và `score` (điểm vi phạm) đều được đặt là `private`.
    *   Các lớp khác không thể trực tiếp thay đổi `user.score = 10` để chỉnh điểm tùy tiện, mà buộc phải thông qua `setScore(Integer)` của đối tượng `User`.
2.  **Đóng Gói Trạng Thái Vòng Đời (Lifecycle Encapsulation):**
    *   Trong tệp [`BaseContent.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/BaseContent.java), việc khởi tạo ngày giờ tạo (`createdAt`) được tự quản lý thông qua:
        ```java
        @PrePersist
        protected void onCreate() {
            this.createdAt = LocalDateTime.now();
        }
        ```
        Bộ mã nguồn bên ngoài (như Controller hay Service) hoàn toàn không cần gọi `post.setCreatedAt(now)`. Đối tượng `Post` (kế thừa `BaseContent`) tự động bao gói hành vi này trước khi được ghi vào cơ sở dữ liệu.
3.  **Đóng Gói Mối Quan Hệ Phức Tạp (Cascading & Orphan Removal):**
    *   Trong tệp [`Post.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Post.java), danh sách `likes` và `comments` được định nghĩa là:
        ```java
        @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
        private List<Like> likes = new ArrayList<>();
        ```
        Việc đồng bộ hóa, xóa các Like/Comment "mồ côi" khi bài đăng bị xóa được đóng gói hoàn toàn trong hành vi của thực thể `Post` thông qua cơ chế JPA Cascade. Mã nguồn bên ngoài chỉ cần xóa `Post`, toàn bộ dữ liệu phụ thuộc sẽ tự động được dọn dẹp an toàn.

---

### 🔹 Tầng 2: Đóng Gói Đối Tượng Truyền Tải Dữ Liệu (DTO Encapsulation)
Hệ thống sử dụng các DTO (Data Transfer Objects) trong [`src/main/java/com/pbl5/dto/`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/dto) để ngăn chặn việc lộ cấu trúc cơ sở dữ liệu (Database Schema Leak) ra ngoài API:

1.  **Che Giấu Dữ Liệu Nhạy Cảm Trên Mạng:**
    *   Tệp [`PostResponse.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/dto/PostResponse.java) đóng gói dữ liệu của một bài đăng gửi về cho Frontend. Nó **không** chứa thông tin nhạy cảm của bảng `users` như email, mật khẩu hay vai trò hệ thống, mà chỉ bao bọc các thông tin cần thiết hiển thị như `authorName`, `authorAvatar`, và `isMine`.
2.  **Chuẩn Hóa Payload Yêu Cầu:**
    *   Tệp [`CreatePostRequest.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/dto/CreatePostRequest.java) đóng gói thông tin người dùng gửi lên khi đăng bài (`content`, `imageUrl`, `videoUrl`, `communityId`). Việc này bảo vệ Backend khỏi các lỗ hổng chèn ép thuộc tính lạ không mong muốn vào Database.

---

### 🔹 Tầng 3: Đóng Gói Logic Nghiệp Vụ (Service Business Encapsulation)
Tầng Service cô lập hoàn toàn logic xử lý nghiệp vụ khỏi luồng định tuyến (Routing) của Controller:

1.  **Độc Lập Nghiệp Vụ Đăng Bài:**
    *   Trong [`PostService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/PostService.java#L55-L158), phương thức `createPost` bao bọc tất cả các quy tắc nghiệp vụ phức tạp:
        *   Kiểm tra tài khoản có bị chặn đăng bài hay không (`postWarningExpiresAt`).
        *   Kiểm tra tính hợp lệ của bài viết (phải có chữ hoặc ảnh/video).
        *   Kiểm tra quyền thành viên trong cộng đồng Private (`communityMemberRepository`).
        *   Xác định trạng thái bài viết (`ACTIVE`, `PENDING_REVIEW`, `PENDING_COMM_ADMIN`).
        *   Kích hoạt cơ chế AI kiểm duyệt bất đồng bộ thông qua `moderationService.moderatePostAsync(...)`.
    *   Nhờ sự đóng gói này, [`PostController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/PostController.java) chỉ đóng vai trò nhận Request, lấy người dùng hiện tại và gọi `postService.createPost(...)`. Controller hoàn toàn "mù tịt" về các quy trình kiểm tra quyền lợi hay cách AI hoạt động.

2.  **Đóng Gói Kết Nối Ngoại Vi (API Client Hiding):**
    *   Trong [`ContentModerationService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/ContentModerationService.java):
        *   Phương thức `callModerationAPI` bao bọc hoàn toàn thư viện `HttpClient` để thực hiện yêu cầu HTTP POST đến Server Python.
        *   Các cấu hình như URL kiểm duyệt (`MODERATION_API_URL`), thời gian ngắt kết nối (`Duration.ofSeconds(10)`), cơ chế giải mã JSON sang Map được giữ kín.
        *   Nếu sau này chuyển sang sử dụng API của Google Perspective hay OpenAI Moderation, lập trình viên chỉ cần thay đổi mã nguồn bên trong Service này, không cần chỉnh sửa bất kỳ Controller nào.

---

### 🔹 Tầng 4: Đóng Gói Thuật Toán Học Máy (AI Model Pipeline Encapsulation)
Tại Python Server [`moderate.py`](file:///d:/University/PBL5/PBL5/src/main/model/moderate.py):

1.  **Bao Bọc Kiến Trúc Model Con:**
    *   Các mạng nơ-ron phức tạp như `NSFWModel`, `ViolenceModel`, `TokenClassificationModel` (PhoBERT), và `MfccHatespeechModel` (LSTM) được định nghĩa là các lớp kế thừa `torch.nn.Module`. Chúng tự quản lý cấu trúc các tầng Convolution (`Conv2d`), Batch Normalization (`BatchNorm2d`), Linear, và LSTM.
2.  **Thiết Kế Facade Pattern:**
    *   Lớp `ContentModerationSystem` gom tất cả các mô hình con này lại và chỉ cung cấp hàm đầu mối `moderate_request(content, image_url, video_url)`.
    *   Các bước tiền xử lý ảnh (chuyển màu RGB, resize 224x224, chuẩn hóa `/ 255.0`), tiền xử lý văn bản tiếng Việt (`clean_vietnamese_ocr_text`), và xử lý trích xuất vùng chữ CRAFT (OCR) đều được ẩn giấu bên trong lớp hệ thống này.
    *   API Endpoint của Flask (`/api/moderate`) chỉ đơn giản là:
        ```python
        res = sys_mod.moderate_request(content, img, vid)
        return jsonify(res)
        ```
        Flask không cần biết ảnh được cắt như thế nào hay thiết bị GPU/CPU đang được phân bổ ra sao.

---

### 🔹 Tầng 5: Đóng Gói Trạng Thái Bằng Enum (Enum State Encapsulation)
Tại các tệp Enum của dự án như [`PostStatus.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/enums/PostStatus.java), [`UserStatus.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/enums/UserStatus.java), [`Role.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/enums/Role.java)...:

1.  **Đóng Gói Miền Giá Trị Hợp Lệ:**
    *   Enum giới hạn cứng nhắc tập hợp các giá trị hợp lệ mà một thuộc tính có thể nhận. Trình biên dịch Java sẽ chặn đứng bất kỳ hành vi gán sai lệch hay rò rỉ dữ liệu không hợp lệ ngay từ lúc viết code (ví dụ: gán trạng thái nằm ngoài 8 trạng thái định nghĩa sẵn của bài viết).
2.  **Đóng Gói Thuộc Tính Và Hành Vi Phụ Trợ:**
    *   Các Enum trong Java hoạt động như các class đặc biệt. Chúng cho phép định nghĩa các thuộc tính `private` (như mô tả tiếng Việt, mã ký hiệu) và các hàm `public get...()` để lấy thông tin mô tả chi tiết, che giấu logic chuyển đổi chuỗi thô.
3.  **Che Giấu Hàm Khởi Tạo (Constructor Hiding):**
    *   Constructor của Enum được bảo vệ tuyệt đối với phạm vi `private`. Người dùng bên ngoài không thể tạo mới thực thể (không dùng được từ khóa `new`), bảo vệ sự bất biến và duy nhất của các trạng thái hệ thống.

---

## 🏆 3. Đánh Giá Trạng Thái Kết Quả Vận Hành OOP

Nhờ áp dụng triệt để tính đóng gói trên toàn bộ dự án, mã nguồn của bạn đã đạt được các tiêu chuẩn thiết kế chất lượng cao:

*   **Tính Mô-đun Hóa Cực Cao (High Cohesion, Low Coupling):** Các lớp thực hiện nhiệm vụ rất chuyên biệt. Việc sửa đổi logic OCR hay mô hình phát hiện bạo lực ở Python Server hoàn toàn không làm gián đoạn mã nguồn Java Backend hay giao diện Frontend.
*   **Bảo Mật Dữ Liệu An Toàn:** Các trạng thái nhạy cảm như thông tin người dùng được cô lập bên dưới Database Entities và bảo vệ bởi các DTO, tránh rò rỉ qua các cổng API HTTP REST công khai.
*   **Dễ Kiểm Thử (Testability):** Bạn có thể viết Unit Test cho riêng lẻ từng Service (như `PostService`) bằng cách giả lập (mock) dữ liệu đầu ra của DTOs và Repositories, vì các đối tượng này đã đóng gói sẵn các hành vi độc lập của chúng.
