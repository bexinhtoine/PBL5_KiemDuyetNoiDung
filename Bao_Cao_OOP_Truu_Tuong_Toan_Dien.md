# 🗺️ Báo Cáo Phân Tích Toàn Diện: Tính Trừu Tượng (Abstraction) Trong OOP Của Dự Án

Tính trừu tượng (**Abstraction**) là quá trình tập trung vào các đặc điểm cốt lõi và hành vi quan trọng của một đối tượng, đồng thời bỏ qua các chi tiết triển khai phức tạp bên trong. Trong lập trình hướng đối tượng (OOP), tính trừu tượng được thể hiện chủ yếu qua:
1.  **Lớp trừu tượng (Abstract Class):** Định nghĩa một khung sườn chung, không cho phép tạo đối tượng trực tiếp.
2.  **Giao diện (Interface):** Định nghĩa một hợp đồng (contract) về các hành vi mà các lớp hiện thực bắt buộc phải tuân theo.

Dưới đây là phân tích chi tiết cách tính trừu tượng được áp dụng một cách rõ ràng trong dự án **PBL5: Hệ Thống Kiểm Duyệt Nội Dung**.

---

## 📊 1. Sơ Đồ Thiết Kế Tính Trừu Tượng (Abstraction Architecture Diagram)

Sơ đồ dưới đây mô tả cách hệ thống sử dụng các lớp trừu tượng (`Abstract Class`) và giao diện (`Interface`) để tạo ra một cấu trúc thiết kế lỏng lẻo, linh hoạt (Loosely Coupled):

```mermaid
graph TD
    subgraph Lớp Trừu Tượng (Abstract Class)
        BaseContent[BaseContent <br/> - Long id <br/> - LocalDateTime createdAt <br/> # onCreate()]
    end

    subgraph Hiện Thực Thực Tế (Concrete Classes)
        Post[Post <br/> - String content <br/> + getContent()]
        Comment[Comment <br/> - String content <br/> + getPost()]
    end
    BaseContent -.->|Kế thừa & Hiện thực| Post
    BaseContent -.->|Kế thừa & Hiện thực| Comment

    subgraph Giao Diện Trừu Tượng (Interfaces)
        PostRepository[Interface: PostRepository]
        UserDetailsService[Interface: UserDetailsService]
    end

    subgraph Bộ Máy Framework (Spring Engine)
        PostRepository -.->|Tự động sinh SQL| DB[PostgreSQL DB]
        UserDetailsService -.->|Gọi xác thực| Auth[Spring Security Auth]
    end

    style BaseContent fill:#f9f,stroke:#333,stroke-width:2px
    style PostRepository fill:#bbf,stroke:#333,stroke-width:2px
    style UserDetailsService fill:#bbf,stroke:#333,stroke-width:2px
```

---

## 🔍 2. Phân Tích Chi Tiết Tính Trừu Tượng Trong Codebase

### 🔹 A. Lớp Trừu Tượng Tự Viết (Custom Abstract Class)
Tính trừu tượng do bạn tự thiết kế được thể hiện rõ ràng nhất tại tệp [`BaseContent.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/BaseContent.java):

```java
public abstract class BaseContent {
    @Id
    private Long id;
    private LocalDateTime createdAt;
    
    // Các phương thức Getter/Setter...
}
```

*   **Tại sao là trừu tượng?** 
    *   Hệ thống khai báo lớp này là `abstract`. Điều này có nghĩa bạn không thể khởi tạo trực tiếp đối tượng này bằng lệnh `new BaseContent()`.
    *   **Ý nghĩa nghiệp vụ:** Trong thế giới thực tế của mạng xã hội, không có cái gì gọi là một "nội dung chung chung". Một nội dung phải là một **Bài viết (Post)** cụ thể hoặc một **Bình luận (Comment)** cụ thể. Lớp `BaseContent` ra đời chỉ để trừu tượng hóa các đặc điểm chung (có ID và ngày tạo) của Post và Comment.

---

### 🔹 B. Tính Trừu Tượng Từ Giao Diện Cơ Sở Dữ Liệu (Interface Abstraction)
Được áp dụng tại các Repository của dự án, ví dụ [`PostRepository.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/repository/PostRepository.java):

```java
public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByCommunityIdAndStatusOrderByCreatedAtDesc(Long communityId, com.pbl5.enums.PostStatus status);
}
```

*   **Trừu tượng hóa cách truy vấn:**
    *   Interface `PostRepository` chỉ khai báo tên hàm và các tham số truyền vào mà không hề viết bất kỳ mã nguồn triển khai SQL nào.
    *   **Ý nghĩa nghiệp vụ:** Tầng dịch vụ nghiệp vụ [`PostService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/PostService.java) chỉ cần gọi hàm `postRepository.findByCommunityIdAndStatusOrderByCreatedAtDesc(id, status)`. Service hoàn toàn không cần quan tâm cơ sở dữ liệu bên dưới là PostgreSQL, MySQL hay Oracle, và cũng không cần biết câu lệnh SQL cụ thể chạy ra sao. Chi tiết kết nối mạng socket đến Database đã được che giấu hoàn toàn nhờ tầng trừu tượng này.

---

### 🔹 C. Tính Trừu Tượng Trong Phân Hệ Bảo Mật (Framework Interface Abstraction)
Spring Security tương tác với các thực thể trong dự án của bạn hoàn toàn dựa trên tính trừu tượng:

1.  **Interface `UserDetailsService`:**
    *   Spring Security cung cấp interface này để định nghĩa hành vi: *"Tôi cần một cơ chế để tìm kiếm người dùng theo tên đăng nhập/email"*. Nó không quan tâm bạn lấy thông tin từ RAM, từ tệp tin txt, hay từ Database.
    *   Bạn hiện thực hóa nó tại [`CustomUserDetailsService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomUserDetailsService.java).
2.  **Interface `UserDetails`:**
    *   Định nghĩa khung sườn về một tài khoản hợp lệ (có mật khẩu, có quyền hạn, có trạng thái hoạt động).
    *   Bạn hiện thực hóa tại [`CustomUserDetails.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomUserDetails.java).
    *   **Ý nghĩa nghiệp vụ:** Nhờ sự trừu tượng hóa này, bộ máy bảo mật của Spring hoạt động cực kỳ độc lập. Nó chỉ giao tiếp qua các hợp đồng trừu tượng (`UserDetails`, `UserDetailsService`) giúp code của bạn không bị phụ thuộc chặt chẽ (decoupled) vào mã nguồn hệ thống Spring Security.

---

### 🔹 D. Tính Trừu Tượng Trong Phân Hệ Cấu Hình (Configuration Abstraction)
Tại các tệp cấu hình như [`WebSocketConfig.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/config/WebSocketConfig.java) hoặc [`WebConfig.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/config/WebConfig.java):

```java
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Cấu hình CORS...
    }
}
```

*   **Ý nghĩa nghiệp vụ:** `WebMvcConfigurer` là một giao diện chứa các phương thức trống. Spring MVC trừu tượng hóa toàn bộ vòng đời xử lý Web và cho phép bạn "móc" (hook) các cài đặt tùy chỉnh của mình (như CORS, Interceptors) vào hệ thống bằng cách triển khai interface này.
*   Cài đặt CORS, Interceptors, và xử lý tài nguyên tĩnh được Spring Web trừu tượng hóa thành các phương thức có thể override trực tiếp.

---

### 🔹 E. Trừu Tượng Hóa Dịch Vụ Tải Lên Đám Mây (Cloud Storage Abstraction)
*   **Tên File:** [`FileUploadService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/FileUploadService.java) (Dòng 18-26)
*   **Mã nguồn:**
    ```java
    public String uploadImage(MultipartFile file) throws IOException {
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
        return uploadResult.get("secure_url").toString();
    }
    ```
*   **Trừu tượng hóa hoạt động mạng phức tạp:**
    *   Hành động tải ảnh/video lên Cloudinary liên quan đến rất nhiều kỹ thuật phức tạp: Thiết lập HTTP connection, chia nhỏ file thành các luồng byte (stream), tạo ranh giới multipart form-data, mã hóa dữ liệu truyền tải và xử lý giao thức SSL/TLS.
    *   Nhờ có thư viện Cloudinary SDK trừu tượng hóa, bạn chỉ cần gọi duy nhất một dòng lệnh: `cloudinary.uploader().upload(...)`. Toàn bộ chi tiết kỹ thuật hạ tầng mạng của Cloudinary được ẩn giấu hoàn toàn sau phương thức đơn giản này.

---

### 🔹 F. Trừu Tượng Hóa Xử Lý Bất Đồng Bộ (Async Task Abstraction)
*   **Tên File:** [`ContentModerationService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/ContentModerationService.java) (Dòng 206-207)
*   **Mã nguồn:**
    ```java
    @Async("moderationExecutor")
    public void moderatePostAsync(long postId, String content, String imageUrl, String videoUrl) {
        // Xử lý kiểm duyệt AI ngầm dưới background...
    }
    ```
*   **Trừu tượng hóa xử lý đa luồng (Multi-threading):**
    *   Thông thường trong lập trình hệ thống Java, để chạy một tác vụ ngầm bất đồng bộ, lập trình viên phải tự viết mã quản lý luồng như khởi tạo Thread, quản lý `ExecutorService`, tạo ThreadPool và giải phóng Thread để tránh rò rỉ bộ nhớ.
    *   Spring Framework đã trừu tượng hóa hoàn toàn cơ chế đa luồng này bằng Annotation `@Async`. Bạn chỉ cần khai báo phương thức, Spring sẽ tự động tạo luồng ngầm thực thi mà bạn không cần bận tâm đến mã quản lý đa luồng ở mức hệ điều hành.

---

### 🔹 G. Trừu Tượng Hóa Chu Kỳ Yêu Cầu Web (HTTP Web Request Abstraction)
*   **Tên File:** [`PostController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/PostController.java)
*   **Mã nguồn:**
    ```java
    @PostMapping
    public ResponseEntity<?> createPost(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody CreatePostRequest request) { ... }
    ```
*   **Trừu tượng hóa giao thức HTTP:**
    *   Nếu lập trình mạng Socket truyền thống, bạn sẽ phải đọc luồng byte thô từ TCP Connection, phân tích tiêu đề HTTP (HTTP Headers), phân tích chuỗi JSON thô từ Body và ép kiểu thủ công sang Java Object.
    *   Spring Boot RestController trừu tượng hóa toàn bộ giao thức HTTP bằng các chú thích `@PostMapping`, `@RequestBody`. Bộ máy Spring sẽ tự động lắng nghe cổng socket, đọc luồng byte, phân tích dữ liệu, ép kiểu sang `CreatePostRequest` và tiêm thông tin phiên đăng nhập thông qua `@AuthenticationPrincipal`. Bạn chỉ việc viết logic nhận dữ liệu sạch và xử lý.

---

## 🏆 3. Sự Khác Biệt Giữa Đóng Gói, Kế Thừa, Đa Hình Và Trừu Tượng Trong Dự Án Của Bạn

Để giúp bạn dễ phân biệt khi trả lời vấn đáp:

| Trụ cột OOP | Vai trò trong dự án của bạn | Ví dụ điển hình |
| :--- | :--- | :--- |
| **Đóng gói (Encapsulation)** | Che giấu dữ liệu nội bộ, bảo vệ an toàn thông tin. | Khai báo biến `private String password` trong lớp `User` và chỉ cho phép giao tiếp qua Getter/Setter. |
| **Kế thừa (Inheritance)** | Tái sử dụng mã nguồn, thiết lập mối quan hệ cha-con. | `Post` và `Comment` kế thừa toàn bộ thuộc tính `id`, `createdAt` từ lớp cha `BaseContent`. |
| **Đa hình (Polymorphism)** | Một tên gọi phương thức nhưng thực thi hành vi khác nhau tùy đối tượng thực tế. | Gọi hàm `loadUser()` trên `UserDetailsService` nhưng Java tự chạy logic của `CustomOAuth2UserService` khi đăng nhập Google. |
| **Trừu tượng (Abstraction)** | Thiết lập bộ khung (khai báo các hàm cần thiết) và giấu đi chi tiết kỹ thuật phức tạp bên dưới. | Interface `PostRepository` chỉ định nghĩa tên hàm truy vấn mà không cần viết lệnh SQL hay cách thức kết nối database. |
