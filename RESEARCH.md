# lib-model-registry research — nguồn, phát hiện, hướng cải tiến

Snapshot ngày 2026-09-24. Research bằng cách đọc lại git history của repo này
(11 commit, từ `2fa1002` tới `3fe5cef`), README/CHANGELOG/CLAUDE.md hiện tại,
code gốc bên Nexus (nơi thư viện được tách ra), và đối chiếu nhanh với prior
art công khai (catalog endpoint của các provider, LiteLLM). Facts dưới đây là
snapshot tại 1 thời điểm, không re-verify lại sau này.

## Nguồn research

**Nội bộ:**
- Repo GH gốc `acegalaxy-co/ace_commons-model-registry-nodejs` (nay đổi tên
  `lib-model-registry`), commit đầu `2fa1002 chore: initial commit — split
  from framework monorepo` (2026-05-05).
- Nexus consumer: `src/app/llm/client.ts` (load 3 layer + apply vào `MODELS`
  runtime, cache tại `data/llm-models-cache.json`), `src/app/services/agent/
  model-scanner.ts` (adapter gọi `commons.scanAndUpdate` từ
  `@acegalaxy/model-registry/scanner`, kèm 4 provider catalog fetcher: OpenAI/
  Anthropic/Google/DeepSeek), `src/app/schedulers/acenexus/model-registry.ts`
  (cron 23:00 ping tất cả model, ghi `data/model-registry.json`, alert
  Telegram khi đổi).
- Git log Nexus liên quan: `d0577362 refactor(llm-registry): add _api suffix`,
  `1c6f296e fix(model-registry): resolve 9router proxy before ping`,
  `3fe4936d8 chore(config): drop dead qwen provider`, `87a40f02 fix(llm):
  model-scanner skip rows with Active=false` — cho thấy registry sống chung
  với `@acegalaxy/ai-gateway` (dispatchCall) chứ không tự gọi provider trực
  tiếp trong runtime path, chỉ scanner mới gọi thẳng 4 `/v1/models`-style
  endpoint để dò catalog.

**Nguồn ngoài (prior art, không fetch URL cụ thể — chỉ nêu tên đã biết từ
kiến thức chung, không bịa link):**
- Các provider đều có endpoint liệt kê model runtime (`GET /v1/models` kiểu
  OpenAI/DeepSeek, `GET /v1/models` Anthropic, `GET /v1beta/models` Google) —
  đúng những gì `scanner.ts` gọi trực tiếp trong `model-scanner.ts` phía
  Nexus để dò model mới.
- LiteLLM có `model_prices_and_context_window.json` — 1 file tĩnh community
  maintain giá + context window cho hầu hết model, refresh qua PR thủ công.

## Đã tham khảo gì

### Bài toán gốc trong Nexus (vì sao tách lib)

Nexus cần 1 bảng giá + context-window + alias cho ~10-15 model (Claude/GPT/
Gemini/DeepSeek) dùng để tính cost và route request. Hardcode bảng này trong
`client.ts` từng gây lệch giá khi provider đổi pricing/deprecate model (dẫn
tới commit như `3fe4936d8 drop dead qwen provider`, `d0577362 add _api
suffix`) — mỗi lần đổi phải sửa code + deploy. Ý tưởng: cho ops sửa Notion DB
(1 table `llmModels`), Nexus load DB đó lúc boot/mỗi 5 phút thay vì hardcode.
Logic load-3-layer-fallback + scanner là phần generic, không riêng Nexus →
tách thành package độc lập để tái dùng cho service khác (kane-crawler…), giữ
Nexus chỉ còn phần Notion-adapter + provider fetcher cụ thể.

### Ý tưởng thiết kế chính trong code

- **3-layer load** (`index.ts loadModels()`): Notion (`fetchRows`, timeout
  cứng `NOTION_TIMEOUT_MS = 5000`) → cache file (`cachePath`, atomic write
  mode 0600 tmp+rename) → `defaults` bắt buộc non-empty. Đảm bảo Notion outage
  không bao giờ làm service không boot được — đúng pattern "graceful
  degradation" thường thấy ở config-loader.
- **Transport-free package**: package không tự gọi Notion API — nhận
  `fetchRows` do caller inject. Giữ package 0 runtime dependency, để mỗi
  consumer tái dùng Notion client/auth/rate-limit riêng (đúng rule
  `vault-no-mcp` bên Nexus: Notion CRUD luôn qua client riêng của consumer,
  không qua package chung).
- **`scanner.ts` — classify + version-compare heuristic**: `classify()` suy
  gia đình model (gpt/claude/gemini/deepseek) + marker (mini/nano/pro/haiku/
  sonnet/opus/flash/flash-lite) từ chuỗi model id bằng regex đơn giản.
  `candidatesFor()` lọc bỏ preview/experimental/date-suffixed id, giữ đúng
  family+marker. `pickLatest()` so `versionTuple()` (dotted `x.y` hoặc
  dash-number) để chọn bản mới nhất, tie-break bằng độ dài id ngắn hơn (ưu
  tiên alias gọn, tránh chọn nhầm bản preview dài). `scanAndUpdate()` gom row
  theo `provider|baseUrl|apiKeyEnv`, gọi 1 lần `fetchCatalogs` cho mỗi nhóm để
  tránh gọi API catalog trùng lặp, rồi so từng row với catalog để đề xuất
  bump — logic y hệt scanner cũ trong Nexus, tách ra để share với FW khác.
- **Alias resolution để ở phía consumer**, không có trong package — README
  chỉ show pattern mẫu (`resolve()` loop qua `aliases`), tránh áp đặt cách
  resolve cụ thể.

### Prior art & vì sao tự viết

- Không dùng thẳng response `/v1/models` provider làm nguồn giá — các
  endpoint đó chỉ trả model id có sẵn, không có pricing/context-window đầy
  đủ và nhất quán giữa provider (OpenAI/Anthropic/Google format khác nhau).
  `scanner.ts` dùng các endpoint này chỉ để dò model-id mới, còn giá vẫn do
  ops nhập tay vào Notion — tách rời "biết model nào tồn tại" khỏi "giá bao
  nhiêu" vì 2 việc có tần suất update khác nhau.
- LiteLLM's `model_prices_and_context_window.json` là 1 lựa chọn có sẵn
  (cộng đồng maintain giá đa provider) nhưng: (1) không tách theo tổ chức nội
  bộ (không cho ops ACE Galaxy tự sửa giá/route riêng), (2) không có kênh
  update real-time qua UI nội bộ (Notion) mà team đã dùng cho toàn bộ config
  khác, (3) thêm 1 dependency ngoài cần đồng bộ theo lịch riêng của LiteLLM,
  không khớp lịch daily-scan 23:00 hiện có. Vì vậy tự viết 1 loader mỏng
  thay vì kéo nguyên LiteLLM's price file vào.

## Hướng cải tiến

**Đã áp dụng:**
- `0.2.0` (2026-09-24, `CHANGELOG.md`): rename `@acegalaxy/model-registry` →
  `@acegalaxy/lib-model-registry`, chuyển sang private git-dep
  (`github:acegalaxy-co/lib-model-registry#v0.2.0`), npm package cũ
  deprecated, `package.json` thêm `"private": true`, bỏ `publishConfig`/
  `prepublishOnly`.
- Atomic cache write (mode 0600, tmp+rename) — chống corrupt cache khi crash
  giữa chừng, tránh leak cache file cho user khác đọc được (`index.ts`).
- Timeout cứng 5s cho `fetchRows()` — Notion chậm/treo không chặn boot.

**Deferred / chưa implement:**
- Test coverage chỉ có 1 file `test/smoke.test.js` — kiểm tra duy nhất
  `require("../dist/index.js")` load được và `loadModels` là function; không
  có test cho 3-layer fallback thật (Notion fail → cache, cache fail →
  defaults), không test `scanner.ts` (`classify`/`candidatesFor`/
  `pickLatest`/`scanAndUpdate`) dù đây là phần logic phức tạp nhất repo.
- `CI` (`.github/workflows/`) còn cấu hình cho luồng npm publish cũ (theo
  ghi chú trong plan orchestration khi rename hàng loạt repo) — cần dọn lại
  cho phù hợp private git-dep, chưa làm trong lần rename này.
- `scanner.ts`'s regex-based `classify()`/`candidatesFor()` là heuristic cứng
  theo naming convention hiện tại của 4 provider — model id đổi format (vd
  provider mới, naming scheme mới) sẽ cần sửa code, không có cơ chế
  config-hoá pattern.
- README ghi "Bring your own Notion fetcher" nhưng không có ví dụ interface
  lỗi/partial-data từ Notion (vd 1 số row thiếu field) — `loadModels()` xử lý
  thế nào khi `fetchRows()` trả object có row hỏng chưa được document rõ.
