# 🍥 Fuwari (Customized Version)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

📖 README: [English](./README.en.md) | [简体中文](../README.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Indonesia](./README.id.md) | [한국어](./README.ko.md) | [ภาษาไทย](./README.th.md) | [Tiếng Việt](./README.vi.md)

Phiên bản tùy chỉnh của mẫu blog tĩnh [Fuwari](https://github.com/saicaca/fuwari) được xây dựng bằng [Astro](https://astro.build).

Trong khi vẫn giữ lại các hình ảnh động mượt mà và thiết kế đơn giản của bản gốc, phiên bản này tích hợp các tính năng thiết thực như **Theo dõi Bangumi**, **Bình luận Waline**, **Thống kê Umami**, v.v. Đồng thời, các **chi tiết giao diện người dùng (UI)** đã được tối ưu hóa sâu sắc.

[**🖥️ Xem trước Blog của tôi**](https://blog.xhwen.cn)

## ✨ Tính năng mới

So với Fuwari gốc, dự án này chủ yếu thêm các tính năng sau:

- 📺 **Trang Theo dõi Bangumi**
  - Tích hợp API Bangumi, tự động hiển thị tiến độ xem.
  - Hỗ trợ lọc và phân trang anime.
  - Trang chi tiết hiển thị ảnh bìa anime, xếp hạng, tóm tắt và các thông tin khác.

- 💬 **Hệ thống Bình luận Waline**
  - Tích hợp thành phần bình luận Waline, hỗ trợ tương tác bình luận trên trang bài viết.
  - Hỗ trợ tự động thích ứng chế độ tối.
  - Cấu hình linh hoạt địa chỉ máy chủ trong `src/config.ts`.

- 📊 **Tích hợp Thống kê Umami**
  - Tích hợp tập lệnh thống kê Umami, không cần sửa đổi HTML thủ công.
  - Hỗ trợ hiển thị thống kê PV/UV của trang.
  - Tự động xử lý báo cáo thống kê khi chuyển tuyến đường (tương thích với Swup).

## 🛠️ Hướng dẫn Cấu hình

Tất cả các mục cấu hình của dự án này đều nằm trong tệp `src/config.ts` và bao gồm các chú thích giải thích chi tiết.

## 📝 Cú pháp Mở rộng Markdown

Ngoài cú pháp Markdown được Astro hỗ trợ mặc định, dự án này mở rộng thành phần thẻ liên kết `::link-card`.

**Cú pháp:**

```markdown
::link-card{title="Tiêu đề" url="Địa chỉ liên kết" desc="Mô tả(Tùy chọn)" image="Liên kết hình ảnh(Tùy chọn)" badge="Huy hiệu(Tùy chọn)" target="Cách mở (`_blank`, `_self`, mặc định `_blank`)(Tùy chọn)"}
```

## 🚀 Chạy Cục bộ

1. Sao chép kho lưu trữ:
   ```bash
   git clone https://github.com/xiaowenmimimi/fuwari.git
   cd fuwari
   ```

2. Cài đặt các phụ thuộc:
   ```bash
   pnpm install
   ```

3. Khởi động máy chủ phát triển:
   ```bash
   pnpm dev
   ```

4. Xây dựng phiên bản sản xuất:
   ```bash
   pnpm build
   ```

## ⚡ Lệnh Thường dùng

| Lệnh | Mô tả |
|:---|:---|
| `pnpm install` | Cài đặt các phụ thuộc |
| `pnpm dev` | Khởi động máy chủ phát triển cục bộ (`localhost:4321`) |
| `pnpm build` | Xây dựng trang web sản xuất vào `./dist/` |
| `pnpm preview` | Xem trước bản dựng |
| `pnpm new-post <filename>` | Tạo bài viết mới |

## 🤝 Lời cảm ơn

- Tác giả chủ đề gốc: [Saicaca/fuwari](https://github.com/saicaca/fuwari)
- Tham khảo tính năng Bangumi: [Kasuha](https://kasuha.com/posts/fuwari-enhance-ep2/)

## 📄 Giấy phép

Dự án này tuân theo giao thức nguồn mở [MIT License](./LICENSE), xem tệp LICENSE để biết chi tiết.

Ban đầu được Fork từ [saicaca/fuwari](https://github.com/saicaca/fuwari), cảm ơn tác giả gốc.
