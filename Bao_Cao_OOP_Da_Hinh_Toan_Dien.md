# 🔮 Báo Cáo Chi Tiết: Các Điểm Áp Dụng Tính Đa Hình (Polymorphism) Trong Mã Nguồn Dự Án

Báo cáo này chỉ ra **chính xác vị trí file, dòng code và cách thức hoạt động** của tính đa hình trong dự án của bạn để giúp bạn dễ hiểu và trình bày trực quan trước hội đồng chấm điểm.

---

## 📍 1. Đa Hình Lúc Chạy (Runtime Polymorphism - Ghi Đè Phương Thức)

Đây là dạng đa hình mà lớp con viết đè (`@Override`) lên lớp cha/giao diện chung. Khi chạy ứng dụng, bộ máy Java Virtual Machine (JVM) sẽ tự động tìm và gọi đúng phương thức của lớp con thực tế.

### 👉 Vị trí 1: Hiện thực hóa giao diện người dùng bảo mật
*   **Tên File:** [`CustomUserDetails.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomUserDetails.java) (Dòng 15)
*   **Mã nguồn:**
    ```java
    public class CustomUserDetails implements UserDetails {
        private final User user; // Đối tượng User gốc từ database
        
        @Override
        public Collection<? extends GrantedAuthority> getAuthorities() {
            return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        }

        @Override
        public boolean isAccountNonLocked() { 
            return user.getStatus() != com.pbl5.enums.UserStatus.BANNED; 
        }
    }
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    1.  **Lớp cha (Interface chuẩn):** `UserDetails` là giao diện được Spring Security định nghĩa sẵn để kiểm tra phân quyền.
    2.  **Cách gọi đa hình:** Khi một người dùng cố gắng truy cập vào một Endpoint yêu cầu quyền hạn (ví dụ: `@PreAuthorize("hasRole('ADMIN')")`), Spring Security sẽ gọi phương thức:
        ```java
        UserDetails userDetails = ... // Nhận đối tượng đang đăng nhập
        userDetails.getAuthorities();
        ```
    3.  **Hành vi thực thi:** Mặc dù biến `userDetails` có kiểu dữ liệu là Interface `UserDetails`, nhưng lúc chạy, Java nhận diện đối tượng thực tế được truyền vào là `CustomUserDetails`. Java sẽ gọi đa hình đến hàm `getAuthorities()` mà bạn đã ghi đè để lấy vai trò (`ROLE_USER` hoặc `ROLE_ADMIN`) từ thực thể `User` trong Database của bạn.

---

### 👉 Vị trí 2: Bộ lọc mạng xác thực JWT
*   **Tên File:** [`JwtAuthenticationFilter.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/JwtAuthenticationFilter.java) (Dòng 23)
*   **Mã nguồn:**
    ```java
    @Component
    public class JwtAuthenticationFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) {
            // Logic đọc mã token JWT từ header Authorization và xác thực
        }
    }
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    1.  **Lớp cha:** `OncePerRequestFilter` là một bộ lọc Servlet của Spring Web.
    2.  **Cách gọi đa hình:** Khi máy chủ Tomcat nhận được một request HTTP từ trình duyệt của người dùng gửi lên, nó sẽ chạy qua một chuỗi các Filter. Tomcat chỉ quản lý chúng dưới dạng tham chiếu lớp cha `Filter` và gọi hàm xử lý chung.
    3.  **Hành vi thực thi:** Nhờ tính đa hình, khi đến lượt bộ lọc JWT này, hệ thống sẽ thực thi chính xác phương thức `doFilterInternal` mà bạn đã tùy biến ở lớp con để giải mã token JWT, thay vì chạy logic mặc định của lớp cha.

---

### 👉 Vị trí 3: Xử lý thông tin người dùng Google OAuth2
*   **Tên File:** [`CustomOAuth2UserService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomOAuth2UserService.java) (Dòng 26)
*   **Mã nguồn:**
    ```java
    @Service
    public class CustomOAuth2UserService extends DefaultOAuth2UserService {
        @Override
        public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
            OAuth2User oAuth2User = super.loadUser(userRequest); // Gọi hàm cha để lấy thông tin Google
            
            // Logic lưu/cập nhật thông tin người dùng vào database của riêng bạn...
            return oAuth2User;
        }
    }
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    1.  **Lớp cha:** `DefaultOAuth2UserService` chịu trách nhiệm giao tiếp mạng để lấy thông tin từ Google.
    2.  **Cách gọi đa hình:** Sau khi Google xác thực thành công và trả về mã token, bộ máy Spring Security sẽ gọi phương thức `loadUser` trên đối tượng Service đang cấu hình.
    3.  **Hành vi thực thi:** Do bạn đã ghi đè (`@Override`) hàm này ở lớp con `CustomOAuth2UserService`, Java sẽ chuyển hướng cuộc gọi đến hàm của bạn. Nhờ vậy, bạn có thể chèn thêm logic lưu thông tin người dùng vào Database PostgreSQL của riêng mình một cách tự động trước khi trả về đối tượng xác thực thành công.

---

## 📍 2. Đa Hình Lúc Biên Dịch (Compile-Time Polymorphism - Nạp Chồng Phương Thức)

Đây là dạng đa hình mà bạn viết các hàm có **cùng tên** nhưng **khác nhau về tham số đầu vào** ngay trong một Class/Interface. Trình biên dịch Java sẽ tự nhận diện bạn muốn chạy hàm nào khi bạn truyền đối số vào.

### 👉 Vị trí 4: Nạp chồng phương thức truy xuất Database
*   **Tên File:** [`PostRepository.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/repository/PostRepository.java) (Dòng 25 và 27)
*   **Mã nguồn:**
    ```java
    // Phiên bản 1: Không có tham số phân trang (chỉ nhận vào userId)
    List<Post> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Phiên bản 2: Có tham số phân trang (nhận vào userId và Pageable)
    List<Post> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    *   **Trường hợp A (Lấy toàn bộ bài viết):** Trong code của bạn, nếu bạn gọi:
        ```java
        List<Post> allPosts = postRepository.findByUserIdOrderByCreatedAtDesc(12L);
        ```
        -> Trình biên dịch Java thấy bạn truyền **1 đối số** (`Long`), nó sẽ tự động liên kết và chạy **Phiên bản 1** để truy vấn hết sạch các bài viết của user số 12.
    *   **Trường hợp B (Lấy bài viết phân trang):** Nếu bạn gọi:
        ```java
        Pageable pageable = PageRequest.of(0, 10); // Trang đầu tiên, lấy 10 bài
        List<Post> pagedPosts = postRepository.findByUserIdOrderByCreatedAtDesc(12L, pageable);
        ```
        -> Trình biên dịch thấy bạn truyền **2 đối số** (`Long` và `Pageable`), nó sẽ tự động chạy **Phiên bản 2** để thực hiện phân trang, giúp giảm tải băng thông mạng và tăng tốc hệ thống.

---

## 📍 3. Đa Hình Trong Python AI Server (PyTorch Framework)

### 👉 Vị trí 5: Gọi hàm forward mạng nơ-ron nhận diện nội dung vi phạm
*   **Tên File:** [`moderate.py`](file:///d:/University/PBL5/PBL5/src/main/model/moderate.py) (Dòng 65, 91, 136)
*   **Mã nguồn:**
    ```python
    class NSFWModel(nn.Module):
        def forward(self, x):
            # Thuật toán xử lý ma trận ảnh CNN để phát hiện ảnh nhạy cảm
            return x

    class MfccHatespeechModel(nn.Module):
        def forward(self, x):
            # Thuật toán LSTM phân tích tần số âm thanh giọng nói để phát hiện từ ngữ kích động
            return x
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    1.  **Lớp cha:** Lớp `nn.Module` (của thư viện PyTorch) quy định tất cả các mô hình học sâu đều phải có hàm `forward` để nhận diện dữ liệu đầu vào.
    2.  **Cách gọi đa hình:** Trong hàm `moderate_request` ở dòng 509 và 660, bạn thực hiện gọi mô hình như sau:
        ```python
        # Gọi mô hình nhận diện ảnh nhạy cảm
        logits_nsfw = self.nsfw_model(tensor_nsfw)
        
        # Gọi mô hình nhận diện âm thanh
        logits_speech = self.audio_model(tensor_speech)
        ```
    3.  **Hành vi thực thi:** Mặc dù cú pháp gọi là hoàn toàn giống nhau (đều truyền một tensor vào đối tượng mô hình), nhờ tính đa hình của Python và PyTorch, khi chạy hệ thống sẽ gọi đúng hàm `forward` xử lý ảnh của `NSFWModel` hoặc hàm `forward` xử lý âm thanh của `MfccHatespeechModel`.

---

### 👉 Vị trí 6: Dịch vụ tải thông tin người dùng hệ thống (Spring Security User Details Service)
*   **Tên File:** [`CustomUserDetailsService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/CustomUserDetailsService.java) (Dòng 18)
*   **Mã nguồn:**
    ```java
    @Service
    public class CustomUserDetailsService implements UserDetailsService {
        @Autowired
        private UserRepository userRepository;

        @Override
        public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng: " + email));
            return new CustomUserDetails(user);
        }
    }
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    1.  **Lớp cha (Interface):** Spring Security cung cấp interface `UserDetailsService` để tải thông tin người dùng từ bất kỳ nguồn lưu trữ nào (In-memory, LDAP, Database...).
    2.  **Cách gọi đa hình:** Trong quá trình xác thực JWT (ở lớp [`JwtAuthenticationFilter`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/security/JwtAuthenticationFilter.java)), Spring Security gọi phương thức:
        ```java
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        ```
    3.  **Hành vi thực thi:** Biến `userDetailsService` đang giữ tham chiếu kiểu Interface `UserDetailsService`, nhưng tại thời điểm chạy (Runtime), Spring Boot tìm thấy bean cụ thể là `CustomUserDetailsService` và gọi hàm `loadUserByUsername` ở đây để đọc dữ liệu từ Database PostgreSQL thực tế của bạn.

---

### 👉 Vị trí 7: Đa hình cấu trúc dữ liệu trả về mạng (Parametric Polymorphism / Generics với ResponseEntity)
*   **Tên File:** Hầu như tất cả các Controller như [`PostController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/PostController.java) hoặc [`CommunityController.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/controller/CommunityController.java).
*   **Mã nguồn:**
    ```java
    @PostMapping
    public ResponseEntity<?> createPost(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody CreatePostRequest request) {
        // ...
        PostResponse response = postService.createPost(user, request);
        if (response == null) {
            return ResponseEntity.badRequest().body("Bài viết bị từ chối tự động do vi phạm tiêu chuẩn.");
        }
        return ResponseEntity.ok(response);
    }
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    1.  **Kiểu đa hình:** Đây là kiểu đa hình tham số (Parametric Polymorphism) sử dụng ký tự đại diện Generics `<?>` của Java.
    2.  **Hành vi thực thi:** Lớp `ResponseEntity` có thể bao bọc bất kỳ đối tượng trả về nào.
        *   Nếu đăng bài vi phạm -> Trả về `ResponseEntity<String>` chứa chuỗi thông báo lỗi.
        *   Nếu đăng bài thành công -> Trả về `ResponseEntity<PostResponse>` chứa thông tin bài viết.
        Nhờ đa hình tham số, cùng một phương thức `createPost` có thể phản hồi nhiều cấu trúc dữ liệu khác nhau cho Frontend tùy thuộc vào kết quả kiểm duyệt AI.

---

### 👉 Vị trí 8: Đa hình thông qua Dynamic Proxy của Spring Data JPA
*   **Tên File:** Nằm tại tất cả các tệp Service như [`PostService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/PostService.java) khi gọi các Repository.
*   **Mã nguồn:**
    ```java
    @Autowired
    private PostRepository postRepository; // Đây là Interface
    ```
*   **Đa hình hoạt động như thế nào ở đây?**
    1.  **Cơ chế Proxy:** `PostRepository` là một Interface và không có bất kỳ dòng code thực thi cụ thể nào. Lập trình viên không thể khởi tạo `new PostRepository()`.
    2.  **Cách gọi đa hình:** Khi bạn gọi `postRepository.save(post)` trong `PostService`, làm thế nào Java chạy được?
    3.  **Hành vi thực thi:** Khi Spring Boot khởi động, nó tự động tạo ra một lớp Proxy (sử dụng thư viện JDK Dynamic Proxy hoặc CGLIB) kế thừa/hiện thực hóa `PostRepository` ở Runtime. Khi bạn gọi hàm trên Interface, Java dùng tính đa hình để gọi trực tiếp các phương thức xử lý trên đối tượng Proxy động này để dịch thành các câu lệnh SQL INSERT/UPDATE tương tác với PostgreSQL.

---
