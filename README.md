## LC Network - Nền Tảng Mạng Xã Hội Tích Hợp AI Kiểm Duyệt Nội Dung Số

## 1. Giới thiệu dự án
**LC Network** là một nền tảng mạng xã hội khép kín, hiện đại, tích hợp hệ thống Trí tuệ nhân tạo (AI Engine) đa tầng, đa phương thức để tự động kiểm duyệt và phân phối nội dung số. Hệ thống giúp tự động nhận diện và xử lý các vi phạm về văn bản, hình ảnh, video và chữ viết trên ảnh (OCR) theo thời gian thực.

## 2. Các công nghệ cốt lõi
- **Backend (Core API):** Java 17, Spring Boot 3.2.5 (Web, Security, Data JPA, WebSocket), PostgreSQL 17.6, JWT.
- **AI Moderation Service:** Python 3.12, Flask, PyTorch, Hugging Face Transformers (PhoBERT), OpenCV, Librosa, EasyOCR, VietOCR.
- **Lưu trữ & Đóng gói:** Cloudinary (Media), Docker, Maven.

## 3. Cấu trúc mô hình AI (Model Setup)
Hệ thống AI xử lý đa phương thức với các mô hình chuyên biệt. Vui lòng tải các file trọng số (weights) (link: https://1drv.ms/f/c/6a001bedd4b62cf3/IgCDJhpgobY9R7YMu1h2ku52AcgbMqFGEQdS2bA1YHbMiDo?e=4khzuK) và đặt vào thư mục `src/main/model/` (hoặc thư mục tương ứng cấu hình trong AI Service):

- `phobert_hatespeech_best.pt` (~515MB): Mô hình PhoBERT phân loại ngôn từ thù ghét và OCR tiếng Việt.
- `best_NSFW.pt` (~99.5MB): Mô hình DeepCNN nhận diện hình ảnh nhạy cảm / khiêu dâm.
- `best_violence.pth` (~16.5MB): Mô hình CNN-GRU nhận diện bạo lực trong chuỗi khung hình video.
- `mfcc_hatespeech_model.pt` (~26.8MB): Mô hình BiLSTM nhận diện ngôn từ độc hại qua ngữ cảnh.
- `vietocr_vgg_transformer.pth` (~144MB): Mô hình OCR nhận diện tiễng Việt trong ảnh.

## 4. Yêu cầu hệ thống
- JDK 17
- Python 3.12 (khuyến nghị môi trường hỗ trợ CUDA)
- PostgreSQL 17.6
- Maven 3.x

## 5. Hướng dẫn cài đặt và khởi chạy

### Bước 1: Khởi chạy AI Moderation Service (Python)
Đi tới thư mục chứa mã nguồn AI, cài đặt thư viện và khởi chạy Flask API:
```bash
pip install -r requirements.txt
python moderate.py
```

### Bước 2: Cấu hình Cơ sở dữ liệu
Tạo database trên PostgreSQL và cập nhật thông tin cấu hình (URL, username, password) tại tệp `application.properties` hoặc `application.yml` của project.

### Bước 3: Khởi chạy Backend (Spring Boot)
Mở terminal tại thư mục gốc của project Java và sử dụng Maven để khởi chạy ứng dụng:
```bash
mvn spring-boot:run
```

## 6. Tính năng hệ thống nổi bật
- **Mạng xã hội:** Đăng bài (text, ảnh, video), bình luận đa cấp, kết bạn, nhắn tin và nhận thông báo realtime (WebSocket STOMP Broker), quản lý cộng đồng.
- **AI Kiểm duyệt tự động (Real-time):**
  - Quét văn bản chống lách luật (Aho-Corasick, Levenshtein, PhoBERT / Deep BiLSTM).
  - Nhận diện ảnh/video NSFW, Bạo lực (DeepCNN, CNN-GRU).
  - Trích xuất và kiểm duyệt chữ trên ảnh/video (EasyOCR + VietOCR).
- **Moderator Dashboard:** Quản lý hàng đợi kiểm duyệt (Ticket Queue), giao diện duyệt bài xử lý điểm nghi ngờ của AI, khoanh vùng vi phạm (Bounding Box).
- **Hệ thống xử lý kháng nghị:** Cơ chế "hai chiều" cho phép người dùng gửi khiếu nại (Appeal) quyết định của AI, kèm giao diện Split View đối chiếu cho kiểm duyệt viên.
