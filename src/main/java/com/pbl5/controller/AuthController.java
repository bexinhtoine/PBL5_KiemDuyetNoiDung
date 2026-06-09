package com.pbl5.controller;

import com.pbl5.dto.AuthResponse;
import com.pbl5.dto.LoginRequest;
import com.pbl5.dto.RegisterRequest;
import com.pbl5.dto.ResetPasswordRequest;
import com.pbl5.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;

/**
 * Controller xử lý các API liên quan đến xác thực người dùng.
 * Base URL: /api/auth
 * Bao gồm: đăng ký, đăng nhập, xác thực email, quên mật khẩu, đặt lại mật khẩu.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /** Service chứa toàn bộ logic xác thực, được Spring inject tự động */
    @Autowired
    private AuthService authService;

    /**
     * API đăng ký tài khoản mới.
     * POST /api/auth/register
     *
     * @param request Body JSON gồm: email, fullName, password
     * @return 200 OK với thông báo thành công, hoặc 400 Bad Request nếu có lỗi (email trùng, ...)
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            authService.register(request);
            return ResponseEntity.ok(new AuthResponse(null, "Đăng ký thành công, vui lòng kiểm tra email để xác thực."));
        } catch (Exception e) {
            // Trả về lỗi cụ thể (ví dụ: "Email đã được sử dụng")
            return ResponseEntity.badRequest().body(new AuthResponse(null, e.getMessage()));
        }
    }

    /**
     * API đăng nhập bằng email và mật khẩu.
     * POST /api/auth/login
     *
     * @param request Body JSON gồm: email, password
     * @return 200 OK với JWT token nếu thành công, hoặc 400 Bad Request nếu sai thông tin/tài khoản bị khóa
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            String ip = httpRequest.getHeader("X-Forwarded-For");
            if (ip == null || ip.isBlank()) ip = httpRequest.getRemoteAddr();
            java.util.Map<String, String> result = authService.login(request, ip);
            return ResponseEntity.ok(new AuthResponse(result.get("token"), "Đăng nhập thành công.", result.get("role")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(null, e.getMessage()));
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String email, @RequestParam String code) {
        try {
            authService.verifyEmail(email, code);
            return ResponseEntity.ok("Tài khoản đã được đăng ký và kích hoạt thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API gửi lại mã OTP.
     * POST /api/auth/resend-pin?email={email}
     */
    @PostMapping("/resend-pin")
    public ResponseEntity<?> resendPin(@RequestParam String email) {
        try {
            authService.resendPin(email);
            return ResponseEntity.ok("Mã PIN mới đã được gửi!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API yêu cầu gửi email đặt lại mật khẩu (quên mật khẩu).
     * POST /api/auth/forgot-password?email={email}
     *
     * @param email Địa chỉ email của tài khoản cần đặt lại mật khẩu (query param)
     * @return 200 OK với thông báo đã gửi email, 400 nếu email không tồn tại
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        try {
            authService.forgotPassword(email);
            return ResponseEntity.ok("Đường dẫn đặt lại mật khẩu đã được gửi đến email của bạn.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * API đặt lại mật khẩu mới bằng token nhận được qua email.
     * POST /api/auth/reset-password
     *
     * @param request Body JSON gồm: token (UUID từ email), newPassword (mật khẩu mới)
     * @return 200 OK nếu thành công, 400 nếu token không hợp lệ/đã dùng
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok("Mật khẩu đã được đặt lại thành công.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API chạy trực tiếp chèn dữ liệu mẫu vào PostgreSQL từ tệp import.sql
     * POST /api/auth/import-data
     */
    @PostMapping("/import-data")
    public ResponseEntity<?> importData() {
        try {
            ClassPathResource resource = new ClassPathResource("import.sql");
            BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8));
            String sqlContent = reader.lines().collect(Collectors.joining("\n"));
            
            // Tách các lệnh SQL theo dấu chấm phẩy và bỏ qua các dòng comment hoặc trống
            String[] queries = sqlContent.split(";");
            int count = 0;
            for (String query : queries) {
                String cleanQuery = query.trim();
                // Bỏ qua dòng trống hoặc dòng chú thích
                if (!cleanQuery.isEmpty() && !cleanQuery.startsWith("--")) {
                    jdbcTemplate.execute(cleanQuery);
                    count++;
                }
            }
            return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", "Đã thực thi thành công " + count + " câu lệnh SQL chèn dữ liệu mẫu vào CSDL của bạn!"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}
