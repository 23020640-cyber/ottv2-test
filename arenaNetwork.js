// arenaNetwork.js — Bài 2: Đấu trường 4 bàn (tối thiểu 8 người chơi), đồng bộ bằng playhtml
// Luật chơi dùng lại 100% từ gameLogic.js (giống Bài 1). File này chỉ thêm:
//   ghế ngồi, lượt theo người chơi, đồng bộ qua mạng, người xem, chế độ trình chiếu.
import {
  COLS, ICONS, NAMES,
  createInitialBoard, getValidMovesForPiece, countPieces, applyMove,
} from "./gameLogic.js";

/* =================== CẤU HÌNH =================== */
// Test ổn thì chốt cứng version, ví dụ "https://unpkg.com/playhtml@2.9.0"
const PLAYHTML_URL = "https://unpkg.com/playhtml@latest";
const BOARD_IDS = ["board-1", "board-2", "board-3", "board-4"];
const N = 9;
const SIDE = { P1: "Xanh", P2: "Đỏ" };
const TYPES = ["rock", "paper", "scissors"];
const coord = (r, c) => `${COLS[c]}${N - r}`;

// arena.html?view=1 → chế độ trình chiếu: chỉ xem, ẩn mọi nút
const VIEW_ONLY = new URLSearchParams(location.search).get("view") === "1";
if (VIEW_ONLY) document.body.classList.add("view-only");

/* =================== NGƯỜI CHƠI =================== */
// Mỗi TAB là một người chơi (sessionStorage tách riêng từng tab)
const MY_ID = (() => {
  let id = sessionStorage.getItem("ottv2-id");
  if (!id) {
    id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("ottv2-id", id);
  }
  return id;
})();

const nameInput = document.getElementById("player-name");
try { const saved = localStorage.getItem("ottv2-name"); if (saved && nameInput) nameInput.value = saved; } catch {}
nameInput?.addEventListener("change", () => {
  try { localStorage.setItem("ottv2-name", nameInput.value.trim()); } catch {}
});
const myName = () => ((nameInput?.value || "").trim() || "Khách " + MY_ID.slice(0, 4)).slice(0, 20);

/* =================== TIỆN ÍCH =================== */
// Dữ liệu từ máy khác là KHÔNG tin cậy → escape trước khi đưa vào innerHTML (chống XSS)
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const clone = (d) => JSON.parse(JSON.stringify(d));   // dữ liệu playhtml có thể là Proxy
const sideOf = (data) => ["P1", "P2"].find((s) => data?.seats?.[s]?.id === MY_ID) || null;
const validPiece = (p) => p && (p.owner === "P1" || p.owner === "P2") && TYPES.includes(p.type);
const validBoard = (b) => Array.isArray(b) && b.length === N &&
  b.every((row) => Array.isArray(row) && row.length === N && row.every((p) => p === null || validPiece(p)));

function hasAnyMove(board, owner) {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (board[r][c]?.owner === owner && getValidMovesForPiece(board, r, c).length) return true;
  return false;
}

// Trạng thái đồng bộ của 1 bàn. Các trường board/turn/winner/winReason
// đúng tên mà applyMove() của gameLogic.js đọc và ghi.
function freshState(seats = { P1: null, P2: null }) {
  return {
    board: createInitialBoard(),
    turn: "P1",            // Xanh đi trước
    winner: null,
    winReason: null,
    seats,                 // { P1: {id, name} | null, P2: ... }
    moveNo: 0,
    lastMove: null,
  };
}

/* =================== TRẠNG THÁI CỤC BỘ (không đồng bộ) =================== */
const selected = {};   // quân đang chọn ở từng bàn
const latest = {};     // dữ liệu mới nhất của từng bàn, để biết mình đang ngồi bàn nào
const seatedElsewhere = (boardId) =>
  BOARD_IDS.some((id) => id !== boardId && sideOf(latest[id]));

/* =================== VẼ 1 BÀN =================== */
function render(el, data) {
  // Vừa ngồi / vừa rời ghế → vẽ lại các bàn khác để ẩn/hiện nút "Ngồi"
  const wasSeated = !!sideOf(latest[el.id]);
  latest[el.id] = data;
  if (wasSeated !== !!sideOf(data))
    BOARD_IDS.forEach((id) => {
      if (id !== el.id && latest[id]) render(document.getElementById(id), latest[id]);
    });

  const title = `<div class="t-head"><b>Bàn ${el.id.split("-")[1]}</b></div>`;
  if (!data || !validBoard(data.board)) {
    el.innerHTML = title + `<p class="t-error">Dữ liệu bàn bị lỗi.</p>` +
      (VIEW_ONLY ? "" : `<div class="t-actions"><button data-act="clear">Dọn bàn</button></div>`);
    return;
  }

  const me = sideOf(data);
  const full = data.seats?.P1 && data.seats?.P2;
  let sel = selected[el.id];
  if (sel && data.board[sel.r]?.[sel.c]?.owner !== me) sel = selected[el.id] = null;
  const moves = sel && !data.winner ? getValidMovesForPiece(data.board, sel.r, sel.c) : [];
  const lm = data.lastMove;

  // --- bàn cờ (cùng class CSS với Bài 1) ---
  let cells = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = data.board[r][c];
      const m = moves.find((x) => x.r === r && x.c === c);
      const cls = ["cell", (r + c) % 2 === 0 ? "light" : "dark",
        (r === 8 && c === 0) || (r === 0 && c === 8) ? "goal" : "",
        sel && sel.r === r && sel.c === c ? "selected" : "",
        m?.type === "move" ? "valid" : "",
        m?.type === "attack" ? "attack" : "",
        lm && ((lm.fr === r && lm.fc === c) || (lm.tr === r && lm.tc === c)) ? "last" : "",
      ].filter(Boolean).join(" ");
      const piece = p ? `<span class="piece ${p.owner}">${ICONS[p.type]}</span>` : "";
      const tip = coord(r, c) + (p ? ` – ${NAMES[p.type]} ${SIDE[p.owner]}` : "");
      cells += `<button class="${cls}" data-r="${r}" data-c="${c}" title="${tip}">${piece}</button>`;
    }
  }

  // --- ghế ngồi ---
  const seat = (s) => {
    const o = data.seats?.[s];
    if (o) {
      const mine = o.id === MY_ID;
      return `<span class="seat ${s}${mine ? " me" : ""}">${SIDE[s]}: ${esc(o.name)}${mine ? " (bạn)" : ""}</span>`;
    }
    if (VIEW_ONLY || me || seatedElsewhere(el.id))
      return `<span class="seat ${s} empty">${SIDE[s]}: trống</span>`;
    return `<button class="seat ${s}" data-act="sit-${s}">Ngồi ${SIDE[s]}</button>`;
  };

  // --- trạng thái ---
  let status, sCls = "";
  if (data.winner) {
    sCls = "win";
    status = `🏆 ${esc(data.winReason || SIDE[data.winner] + " thắng")}`;
  } else if (!full) {
    status = "Đang chờ đủ 2 người chơi";
  } else {
    if (me === data.turn) sCls = "go";
    status = `Lượt ${SIDE[data.turn]}${me === data.turn ? " (tới bạn)" : ""}` +
      (lm ? `. Nước ${Number(data.moveNo) || 0}: ${coord(lm.fr, lm.fc)} → ${coord(lm.tr, lm.tc)}` : "");
  }

  // --- số quân còn lại ---
  const counts = countPieces(data.board);
  const cnt = (s) => TYPES.map((t) => `<span title="${NAMES[t]}">${ICONS[t]}${counts[s][t]}</span>`).join(" ");

  const actions = VIEW_ONLY ? "" :
    (me ? `<button data-act="reset">Ván mới</button><button data-act="leave">Rời ghế</button>` : "") +
    `<button data-act="clear">Dọn bàn</button>`;

  el.innerHTML = `
    ${title}
    <div class="t-seats">${seat("P1")}${seat("P2")}</div>
    <div class="t-status ${sCls}">${status}</div>
    <div class="t-board">${cells}</div>
    <div class="t-counts"><span class="P1">${cnt("P1")}</span><span class="P2">${cnt("P2")}</span></div>
    ${actions ? `<div class="t-actions">${actions}</div>` : ""}`;
}

/* =================== XỬ LÝ CLICK =================== */
function handleClick(el, e, data, setData) {
  if (VIEW_ONLY) return;
  const t = e.target.closest("[data-act], [data-r]");
  if (!t || !el.contains(t)) return;
  const act = t.dataset.act;
  const me = sideOf(data);

  if (act === "sit-P1" || act === "sit-P2") {
    const s = act.slice(4);
    if (me || data.seats?.[s]) return;                       // đã ngồi / ghế có người
    if (seatedElsewhere(el.id))
      return alert("Bạn đang ngồi ở bàn khác. Bấm \"Rời ghế\" ở bàn đó trước.");
    const next = clone(data);
    next.seats[s] = { id: MY_ID, name: myName() };
    return setData(next);
  }
  if (act === "leave" && me) {
    if (!data.winner && data.moveNo > 0 && !confirm("Ván đang chơi dở. Rời ghế?")) return;
    const next = clone(data);
    next.seats[me] = null;
    return setData(next);
  }
  if (act === "reset" && me) {
    if (!data.winner && data.moveNo > 0 && !confirm("Ván đang chơi dở. Bắt đầu ván mới?")) return;
    selected[el.id] = null;
    return setData(freshState(clone(data.seats)));
  }
  if (act === "clear") {
    if (confirm("Xóa ván này và mời cả 2 người chơi ra khỏi ghế?")) {
      selected[el.id] = null;
      setData(freshState());
    }
    return;
  }

  if (t.dataset.r === undefined) return;
  const r = +t.dataset.r, c = +t.dataset.c;
  if (data.winner || !me || me !== data.turn) return;        // không phải lượt mình
  if (!data.seats?.P1 || !data.seats?.P2) return;            // chưa đủ 2 người

  const p = data.board[r][c];
  const sel = selected[el.id];
  if (p?.owner === me) {                                     // chọn / bỏ chọn quân mình
    selected[el.id] = sel && sel.r === r && sel.c === c ? null : { r, c };
    return render(el, data);
  }
  if (!sel) return;
  selected[el.id] = null;

  // Đi quân bằng CHÍNH hàm applyMove của Bài 1 (kiểm tra luật + đổi lượt + xét thắng)
  const next = clone(data);
  if (!applyMove(next, sel.r, sel.c, r, c)) return render(el, data);

  next.moveNo = (Number(next.moveNo) || 0) + 1;
  next.lastMove = { fr: sel.r, fc: sel.c, tr: r, tc: c };
  // Bổ sung luật gameLogic.js chưa có: đối thủ hết nước đi thì người vừa đi thắng
  if (!next.winner && !hasAnyMove(next.board, next.turn)) {
    next.winner = me;
    next.winReason = `${SIDE[next.turn]} hết nước đi, ${SIDE[me]} thắng!`;
  }
  setData(next);
}

/* =================== GẮN PLAYHTML =================== */
const boards = [];
for (const id of BOARD_IDS) {
  const el = document.getElementById(id);
  if (!el) { console.error(`[arena] Không tìm thấy #${id} trong arena.html`); continue; }
  el.setAttribute("can-play", "");
  el.defaultData = freshState();
  el.updateElement = ({ element, data }) => render(element, data);
  el.onClick = (e, { data, setData }) => handleClick(el, e, data, setData);
  boards.push(el);
}

// BẮT BUỘC import SAU khi gán defaultData. Import tĩnh bị hoist lên đầu file,
// nên phải dùng import động ở đây.
try {
  const { playhtml } = await import(PLAYHTML_URL);
  playhtml.init();
} catch (err) {
  console.error(err);
  for (const el of boards)
    el.innerHTML = `<p class="t-error">Không tải được thư viện playhtml. Kiểm tra Internet rồi tải lại trang.</p>`;
}