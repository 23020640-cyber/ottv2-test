# OTTv2 – Oẳn Tù Tì trên bàn cờ 9×9

Bài tập 1 – Lập trình Web (môn Lập trình mạng).

| | Link |
|---|---|
| **Bài 1** – 2 người chơi trên một màn hình | https://23020640-cyber.github.io/ottv2-test/ |
| **Bài 2** – Đấu trường online 4 bàn (≥ 8 người) | https://23020640-cyber.github.io/ottv2-test/arena.html |
| Chế độ trình chiếu Bài 2 (chỉ xem, cho màn hình lớn) | https://23020640-cyber.github.io/ottv2-test/arena.html?view=1 |

## Luật chơi OTTv2

- Bàn cờ 9×9, cột `a`–`i`, hàng `1`–`9`. Mỗi bên có 9 quân: 3 Đấm ✊, 3 Lá ✋, 3 Kéo ✌️.
- Xanh (Người chơi 1) xuất phát quanh ô `a1`, Đỏ (Người chơi 2) xuất phát quanh ô `i9`. **Xanh đi trước.**
- Mỗi lượt, một quân đi đúng **1 ô theo 8 hướng** (giống quân Vua trong cờ vua).
- Ăn quân theo luật oẳn tù tì: **Đấm ăn Kéo, Kéo ăn Lá, Lá ăn Đấm**.
- Hai quân **cùng loại** không ăn được nhau, chỉ đứng chặn đường nhau. Quân không được đi vào ô có quân khắc mình.
- **Điều kiện thắng** (xét sau mỗi nước đi):
  1. Đưa được một quân vào ô đích: Xanh vào `i9`, Đỏ vào `a1`.
  2. Ăn sạch hoàn toàn **một loại** quân của đối phương.
  3. Đối phương tới lượt nhưng không còn nước đi hợp lệ nào.

## Bài 1 – 2 người chơi (`index.html`)

Hai người chơi luân phiên trên cùng một màn hình. Bấm vào quân của mình để chọn, các ô đi được hiện chấm, ô ăn được quân hiện vòng đỏ; bấm vào ô đó để đi. Có nhật ký nước đi, số quân còn lại và nút ván mới.

## Bài 2 – Đấu trường online nhiều người (`arena.html`)

Dùng thư viện **[playhtml](https://playhtml.fun)** để đồng bộ trạng thái giữa tất cả người đang mở trang, không cần tự viết server.

- 4 bàn chơi song song ở 4 góc màn hình → tối đa **8 người chơi** cùng lúc, số người xem không giới hạn.
- Bấm **Ngồi Xanh / Ngồi Đỏ** ở một bàn còn trống để chơi; không ngồi thì là người xem, vẫn theo dõi được cả 4 bàn theo thời gian thực.
- Mỗi người chỉ ngồi được một ghế. Chỉ người đang ngồi và đang tới lượt mới đi được quân.
- Tới lượt mình thì bàn có viền vàng và tiêu đề tab đổi thành "🔔 Tới lượt bạn!".

### Cách hoạt động

```
Người chơi bấm đi quân
   → arenaNetwork.js kiểm tra: đúng người, đúng lượt
   → applyMove() của gameLogic.js (cùng hàm với Bài 1) kiểm tra luật, đổi lượt, xét thắng
   → setData(trạng thái mới)  ── playhtml đồng bộ qua server ──►  mọi trình duyệt đang mở trang
   → updateElement() ở mỗi máy vẽ lại bàn cờ
```

- Mỗi bàn là một phần tử `can-play` của playhtml (`#board-1` … `#board-4`) với dữ liệu đồng bộ gồm: bàn cờ, lượt đi, người thắng, 2 ghế ngồi, nước đi cuối.
- Mỗi tab trình duyệt có một ID ngẫu nhiên (lưu trong `sessionStorage`) để xác định ai đang ngồi ghế nào.
- Tên người chơi và mọi dữ liệu nhận từ máy khác đều được escape trước khi hiển thị (chống XSS).

## Cấu trúc thư mục

| File | Vai trò |
|---|---|
| `gameLogic.js` | Toàn bộ luật chơi, dùng chung cho cả 2 bài |
| `index.html` | Giao diện Bài 1 |
| `arena.html` | Giao diện Bài 2 (4 bàn) |
| `arenaNetwork.js` | Bài 2: ghế ngồi, lượt theo người chơi, đồng bộ bằng playhtml |

## Chạy trên máy

Trang dùng ES module nên **không mở trực tiếp bằng double-click** (`file://`). Mở thư mục bằng VS Code → chuột phải `index.html` hoặc `arena.html` → **Open with Live Server**, hoặc chạy `python -m http.server 8000` rồi vào `http://localhost:8000`. Bài 2 cần có Internet để kết nối server của playhtml. Muốn thử 2 người trên một máy: mở 2 tab (tab mới, dán địa chỉ; không dùng "Duplicate tab").

## Thành viên

| Thành viên | Họ tên – MSSV | Phụ trách |
|---|---|---|
| TV1 | Nguyễn Đăng Doanh | `gameLogic.js` – luật chơi |
| TV2 | Nguyễn Đức Hải | `index.html` – giao diện Bài 1 |
| TV3 | Trương Gia Sinh – 23020640 | `arenaNetwork.js`, `arena.html` – Bài 2 online với playhtml |
| TV4 | Lê Bá Tùng Dương | Quản lý repo, README, kiểm thử |

## Hạn chế đã biết

- **Ghế không tự trống khi người chơi đóng tab**: dữ liệu ghế được playhtml lưu lâu dài. Bấm **Dọn bàn** để giải phóng bàn.
- **Nút Dọn bàn ai cũng bấm được** (kể cả người xem), vì đây là cách gỡ bàn có người chơi đã rời đi. Chế độ trình chiếu ẩn nút này.
- **Chưa có đăng nhập và server trọng tài**: playhtml chỉ đồng bộ dữ liệu, mọi kiểm tra luật chạy ở trình duyệt, nên người rành kỹ thuật có thể sửa dữ liệu qua DevTools. Mở nhiều tab thì được tính là nhiều người.
- Hai người bấm cùng một ghế trống đúng cùng lúc thì người ghi sau được giữ ghế.

## Hướng phát triển

- Tự giải phóng ghế khi người chơi rời đi (dùng presence của playhtml hoặc giới hạn thời gian mỗi lượt).
- Xoay bàn cờ để người chơi Đỏ thấy quân mình ở phía dưới.
- Chế độ đồng đội 4 đấu 4 trên một bàn, bảng xếp hạng.
- Server riêng làm trọng tài để chống gian lận.
