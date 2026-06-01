# AGENTS.md
Use codegraph to analyze callers/callees before editing.
## 專案定位

本專案是獨立的 Electron + Vite 測試工具。

專案名稱目前定位為：

BMS Protocol Mock Lab

用途是模擬：

1. HTTP API Simulator
2. Modbus TCP Simulator
3. 未來的 Modbus → API Bridge Simulator

本專案不是 BMS 主專案。  
不得修改任何 BMS 主專案檔案。

---

## 當前狀態

目前已完成：

### R1：Mode Tabs

已完成 API / Modbus / Bridge 三個 mode tab。

- API Simulator 已可使用
- Modbus TCP Simulator 已可使用
- Bridge Simulator 目前仍是 placeholder

### R2：Modbus TCP Simulator v1

已完成：

- Modbus TCP server
- Host / Port / Unit ID
- Holding Register 4x
- FC03
- FC06
- FC16
- short
- float
- HL / LH
- manual value
- register table
- Modbus request log

### R3：完整 Modbus Register Type / Data Type / Action

已完成或正在完善：

- Coil 0x
- Discrete Input 1x
- Input Register 3x
- Holding Register 4x
- FC01
- FC02
- FC03
- FC04
- FC05
- FC06
- FC15
- FC16
- short
- int
- long
- float
- double
- binary
- manual
- random
- increment
- toggle
- sine

### 目前進行中：R3-A Address 修正

目前不要進入 R4。

當前優先修正：

- Modbus address input mode
- protocol address / reference address 分離
- Display address 不可再只顯示 1
- Discrete Input 第一點應顯示 reference address 100001
- Coil 第一點應顯示 reference address 000001
- Input Register 第一點應顯示 reference address 300001
- Holding Register 第一點應顯示 reference address 400001

---

## 全域規則

### 語言規則

所有說明或是能使用中文的區塊都必須以中文優先。

包含：

- UI 標題
- UI 說明
- 表格欄位
- 按鈕文字
- 錯誤訊息
- README
- Roadmap
- 使用說明
- 狀態訊息

但以下可維持英文：

- 檔案名稱
- 變數名稱
- 函式名稱
- IPC channel
- Modbus function code
- 技術 key

技術名詞可中英並列，例如：

- 線圈 Coil 0x
- 離散輸入 Discrete Input 1x
- 輸入暫存器 Input Register 3x
- 保持暫存器 Holding Register 4x
- 通訊位址 Protocol Address
- 參考位址 Reference Address
- 字組順序 Word Order

---

## 安全修改規則

嚴格遵守：

- 不修改 BMS 主專案
- 不新增 dependencies，除非先說明必要性
- 不新增 Express
- 不新增 Axios
- 不新增 Modbus 套件
- Modbus TCP server 繼續使用 Node.js 內建 net 模組
- HTTP API server 繼續使用 Node.js 內建 http 模組
- 不使用 PowerShell inline replace
- 不使用大型批次替換
- 不大幅重寫整個檔案
- 優先小範圍 patch
- 保持 UTF-8 編碼與 BOM 狀態
- 不開啟 nodeIntegration
- 維持 contextIsolation: true
- Renderer 不可直接建立 TCP server
- Renderer 不可直接使用 Node.js net/http
- Server 必須由 Electron main process 管理
- Renderer 只能透過 preload / contextBridge / IPC 操作 server

---

## 不可破壞功能

修改任何功能時，不可破壞：

### API Simulator

- Start Server
- Stop Server
- Restart Server
- Scenario
- normal
- no-total
- http-500
- invalid-json
- invalid-schema
- timeout
- custom
- Payload Editor
- Use Edited Payload
- Format JSON
- Reset Example
- Request Log
- Copy curl command

### Mode Tabs

- API Simulator tab
- Modbus TCP Simulator tab
- Modbus → API Bridge tab
- tab 切換不得停止任何已啟動 server
- tab 切換不得清空 logs
- tab 切換不得重設 scenario
- tab 切換不得覆蓋 Payload Editor

### Modbus TCP Simulator

不可破壞：

- FC01
- FC02
- FC03
- FC04
- FC05
- FC06
- FC15
- FC16
- raw maps
- register table
- request log
- point value update
- action update

---

## Modbus Address 核心規則

Modbus TCP 封包內一律使用：

Protocol Address，0-based。

UI 與現場點表對照一律顯示：

Reference Address。

Reference Address 對照：

| 類型 | Protocol Address 0 對應 Reference Address |
|---|---|
| Coil 0x | 000001 |
| Discrete Input 1x | 100001 |
| Input Register 3x | 300001 |
| Holding Register 4x | 400001 |

範例：

Discrete Input：

| Protocol Address | Reference Address |
|---:|---:|
| 0 | 100001 |
| 1 | 100002 |
| 2 | 100003 |

Holding Register：

| Protocol Address | Reference Address |
|---:|---:|
| 0 | 400001 |
| 1 | 400002 |
| 2 | 400003 |

---

## Address Input Mode

Register Generator 需支援兩種模式：

### Reference Address / 1-based 相容模式

預設模式。

適合一般 Modbus 模擬器與現場點表。

規則：

- 輸入 1 代表第一點
- 輸入 100001 也代表 Discrete Input 第一點
- 輸入 400001 代表 Holding Register 第一點
- 不允許輸入 0

Reference 模式輸入 0 時，錯誤訊息：

Reference Address / 1-based 模式不允許起始位址為 0，請輸入 1 或完整位址，例如 100001。

### Protocol Address / 0-based 模式

工程測試用。

規則：

- 輸入 0 代表第一點
- 輸入 1 代表第二點

---

## R3-A 修改優先順序

請依序執行：

1. R3-A1：address helper 與 generator 核心轉換
2. R3-A2：UI Address Input Mode 與 Register Table 顯示
3. R3-A3：Log 與 README 說明補充

不可跳過 R3-A1 直接大改 UI。

---

### R4 Bridge 共用規則

R4 目標是建立 Modbus → API Bridge：

Modbus points snapshot
→ Mapping Rules
→ HTTP API Payload

R4 必須遵守：

- 不修改 BMS 主專案
- 不新增 dependencies
- 不共用現有 API Simulator server instance
- 不把 Bridge 邏輯塞進 mockMeterApiServer.js
- 不破壞 API Simulator
- 不破壞 Modbus TCP Simulator
- 不改 R3 address / undefined boolean / feedback mapping 行為
- Bridge mapping 內部索引用 regType + protocolAddress
- 不用 point.id 當 mapping 主鍵
- 不用 Reference Address 當內部主索引
- Bridge server 必須是 main process 管理的獨立 HTTP server
- renderer 只能透過 preload / IPC 操作 Bridge
- 不開啟 nodeIntegration
- 維持 contextIsolation: true
- 不執行 npm start，除非使用者明確要求
- 中文優先

---

## 回報規則

每次修改後只回報：

1. 修改檔案
2. 新增檔案
3. 修改重點
4. 風險或未完成項目

不要提供冗長解釋。

除非明確要求，Codex 不要自行執行 npm start。