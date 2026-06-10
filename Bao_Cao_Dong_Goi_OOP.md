# 🛡️ Báo Cáo Chi Tiết: Tính Đóng Gói (Encapsulation) Trong OOP Được Áp Dụng Như Thế Nào?

Tính đóng gói (**Encapsulation**) là một trong 4 trụ cột cơ bản của Lập trình hướng đối tượng (OOP). Nó giúp che giấu thông tin chi tiết về mặt triển khai bên trong một đối tượng và chỉ cung cấp các phương thức công khai để tương tác với đối tượng đó. Điều này đảm bảo tính toàn vẹn dữ liệu, giảm thiểu sự phụ thuộc (coupling) và nâng cao khả năng bảo trì code.

Dưới đây là phân tích chi tiết cách tính đóng gói được áp dụng trong cả phần **Java Backend** và **Python AI Server** của dự án.

---

## 📊 1. Sơ Đồ Trực Quan Về Tính Đóng Gói (Encapsulation Diagram)

Sơ đồ dưới đây minh họa cách các biến và logic nội bộ được bao bọc (che giấu) trong lớp và chỉ cho phép truy cập có kiểm soát thông qua các "cổng giao tiếp" công khai (Public Methods / Getters & Setters).

```mermaid
classDiagram
    class BaseContent {
        <<Abstract>>
        - Long id
        - LocalDateTime createdAt
        # onCreate() @PrePersist
        + getId() Long
        + getCreatedAt() LocalDateTime
    }

    class Post {
        - String content
        - PostStatus status
        - Double bestScore
        - User user
        + getContent() String
        + setContent(String)
        + getStatus() PostStatus
        + setStatus(PostStatus)
    }

    class ContentModerationSystem {
        - NSFWModel nsfw_model
        - ViolenceModel violence_model
        - TokenClassificationModel hatespeech_model
        - Predictor vietocr_predictor
        - clean_vietnamese_ocr_text(text)
        - evaluate_text(text)
        - evaluate_image(image)
        + moderate_request(content, img, vid) Dict
    }

    BaseContent <|-- Post : Kế thừa (Inheritance)
    Note for BaseContent "Dữ liệu được bảo vệ bằng phạm vi private.\nChỉ thay đổi qua các cổng Getter/Setter."
    Note for ContentModerationSystem "Các mô hình AI phức tạp nằm ẩn bên trong.\nNgoài ra Flask chỉ thấy phương thức công khai\nmoderate_request()"
```

---

## 🔍 2. Chi Tiết Thực Tế Trong Mã Nguồn

### 🔹 A. Đóng Gói Dữ Liệu Ở Mức Lớp Thực Thể (Entity Data Encapsulation)
Tại tệp [`Post.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/Post.java) và [`BaseContent.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/BaseContent.java):

1.  **Che giấu trạng thái (Data Hiding):** Tất cả các thuộc tính của bài đăng như `content`, `status`, `bestScore`, `nsfwScore` đều được khai báo là `private`. Không có bất kỳ lớp bên ngoài nào có thể can thiệp hoặc sửa đổi trực tiếp các giá trị này.
2.  **Cổng giao tiếp có kiểm soát (Accessors & Mutators):** Cung cấp các phương thức `public Getter` và `public Setter` để truy xuất và cập nhật dữ liệu.
3.  **Tự động hóa hành vi nội bộ:**
    *   Trong lớp cha trừu tượng [`BaseContent.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/model/BaseContent.java), thuộc tính `createdAt` được tự động khởi tạo giá trị thời gian hiện tại thông qua phương thức `protected void onCreate()` đánh dấu bằng annotation `@PrePersist`.
    *   Bên ngoài không cần gán ngày tạo thủ công, đối tượng tự chịu trách nhiệm quản lý thời gian sinh ra của chính nó.

---

### 🔹 B. Đóng Gói Logic Nghiệp Vụ (Service / Business Logic Encapsulation)
Tại tệp [`ContentModerationService.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/service/ContentModerationService.java):

1.  **Ẩn đi cấu trúc liên lạc mạng:**
    *   Lớp `ContentModerationService` che giấu hoàn toàn các cấu trúc kỹ thuật như URL API (`MODERATION_API_URL = "http://127.0.0.1:5000/api/moderate"`), cấu hình timeout, các header HTTP và thư viện mạng `HttpClient`.
    *   Bộ điều khiển Controller bên ngoài chỉ cần gọi một hàm duy nhất:
        ```java
        public ModerationResult moderateContent(String content, String imageUrl, String videoUrl)
        ```
    *   Controller không hề hay biết đằng sau đó Java phải gửi gói tin JSON, nhận HTTP Response, phân tách đối tượng và áp dụng các ngưỡng phạt điểm vi phạm.
2.  **Đóng gói các Hằng số cấu hình ẩn (Implementation Hiding):**
    *   Các ngưỡng kiểm duyệt như `REJECT_THRESHOLD = 0.80` và `REVIEW_THRESHOLD = 0.40` là `private static final`. Nó được giữ kín bên trong lớp Service này và không bị phơi bày ra ngoài.

---

### 🔹 C. Đóng Gói Các Mô Hình Học Máy (Machine Learning Architecture Encapsulation)
Tại tệp [`moderate.py`](file:///d:/University/PBL5/PBL5/src/main/model/moderate.py) (Python):

Mặc dù Python không có các từ khóa giới hạn truy cập nghiêm ngặt như `private` trong Java, tính đóng gói vẫn được thể hiện một cách khoa học thông qua cấu trúc thiết kế hướng đối tượng:

1.  **Lớp Bao Bọc (Wrapper Class):** Lớp `ContentModerationSystem` gom toàn bộ các mô hình con phức tạp (`NSFWModel`, `ViolenceModel`, `TokenClassificationModel`, `MfccHatespeechModel`), các trình đọc OCR (`EasyOCR`, `VietOCR`) và các Tokenizer vào chung một thực thể duy nhất.
2.  **Khởi tạo đóng gói (`__init__`):** Khi khởi tạo đối tượng hệ thống:
    ```python
    self.nsfw_model = NSFWModel().to(device)
    self.violence_model = ViolenceModel().to(device)
    # Tự động load weights ẩn từ ổ đĩa
    ```
    *   API Endpoint của Flask (`/api/moderate`) chỉ đơn giản là gọi `sys_mod.moderate_request(content, img, vid)`.

---

### 🔹 D. Đóng Gói Trạng Thái Bằng Enum (Enum State Encapsulation)
Tại các Enum như [`PostStatus.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/enums/PostStatus.java), [`UserStatus.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/enums/UserStatus.java), [`Role.java`](file:///d:/University/PBL5/PBL5/src/main/java/com/pbl5/enums/Role.java)...:

1.  **Đóng Gói Miền Giá Trị Hợp Lệ:** Giới hạn cứng nhắc các giá trị an toàn mà hệ thống chấp nhận, ngăn ngừa tuyệt đối dữ liệu rác.
2.  **Đóng Gói Thuộc Tính Và Hành Vi:** Enum trong Java có thể chứa các biến `private` và phương thức `public` để xử lý logic nội bộ.
3.  **Hạn Chế Khởi Tạo Đối Tượng:** Constructor bắt buộc phải là `private`, đảm bảo tính bất biến và duy nhất của các thực thể Enum.

---

## 🏆 3. Những Lợi Ích OOP Đã Mang Lại Cho Dự Án

*   **Tính an toàn dữ liệu cao:** Không thể gán nhầm điểm kiểm duyệt (`bestScore`) thành một con số bất kỳ từ bên ngoài, do mọi sửa đổi đều phải qua `setBestScore()` và có sự tính toán logic ở tầng Service.
*   **Dễ thay đổi thư viện gốc (Decoupling):** Nếu trong tương lai bạn muốn thay thế Python AI Server bằng một thư viện AI chạy trực tiếp trong Java (như ONNX Runtime), bạn chỉ cần viết lại logic bên trong hàm `moderateContent` của `ContentModerationService`. Tất cả các Controller khác gọi đến dịch vụ này sẽ hoàn toàn không bị ảnh hưởng.
*   **Hạn chế lỗi logic:** Việc chia nhỏ các tác vụ nội bộ ra các hàm hỗ trợ giúp hạn chế trùng lặp code và cô lập lỗi hiệu quả.
