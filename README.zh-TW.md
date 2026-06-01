# modbus-tcp-api-bridge

[English](./README.md) | [繁體中文](./README.zh-TW.md)

這是一個以 Electron + Vite 建立、並由 Codex 輔助開發的獨立 mock app，提供 API Simulator、Modbus TCP Simulator，以及可作為 API Simulator 回應來源的 Modbus Bridge Mapping。

## 安裝

```bash
npm install
```

## 啟動

```bash
npm start
```

## API Simulator

### 控制項

- Host / Port / API Path / Delay (ms)。
- API 回應來源：`Scenario / Payload Editor` 或 `Modbus Bridge`。
- Request Log 最多保留最近 100 筆。

### API 路由

- `GET /health`
- `GET /api/energy`
- `GET /api/energy?scenario=normal`
- `GET /api/energy?scenario=no-total`
- `GET /api/energy?scenario=http-500`
- `GET /api/energy?scenario=invalid-json`
- `GET /api/energy?scenario=invalid-schema`
- `GET /api/energy?scenario=timeout`
- `GET /api/energy?scenario=custom`

### Scenario 規則

- `normal`：回傳完整 energy payload
- `no-total`：移除 `total`
- `http-500`：回傳 HTTP 500
- `invalid-json`：回傳非合法 JSON
- `invalid-schema`：回傳欄位缺漏或型別錯誤的 JSON
- `timeout`：延長回應時間（至少 10 秒）
- `custom`：回傳目前 Payload Editor 內容

Request 也可使用 `?scenario=...` 覆寫目前 UI 中的 Scenario。

當 API 回應來源為 `Modbus Bridge` 時，回應 payload 以 Bridge payload 為主，Scenario 只影響紀錄與延遲。

### Payload 編輯器

- 套用目前 JSON 到 `custom` scenario。
- 格式化 JSON，並可重設為目前 scenario 的範例 payload。

## Modbus TCP Simulator

### 伺服器控制

- Host / Port / Unit ID。
- 請求位址解析模式 Request Address Base Mode：
  - Standard 0-based：request address 0 = internal 0。
  - Legacy 1-based：request address 1 = internal 0（request 0 仍解析為 0）。

### 點位產生器

- 位址輸入模式 Address Input Mode：
  - Reference Address / 1-based：輸入 `1` 或完整位址如 `100001` 代表第一點，輸入 `0` 不允許。
  - Protocol Address / 0-based：輸入 `0` 代表第一點。
- `Count` 必須是資料型別所需位址數的倍數（例如 `int` = 2、`long` = 4）。

### Function 與 Data Type

- Coil 0x
- Discrete Input 1x
- Input Register 3x
- Holding Register 4x
- FC01 Read Coils
- FC02 Read Discrete Inputs
- FC03 Read Holding Registers
- FC04 Read Input Registers
- FC05 Write Single Coil
- FC06 Write Single Holding Register
- FC15 Write Multiple Coils
- FC16 Write Multiple Holding Registers
- short / int / long / float / double / binary
- HL / LH word order（多 register 資料型別）
- actions：manual / random / increment / toggle / sine
- request log（最多保留最近 100 筆）

### 位址規則

內部 address 使用 Modbus protocol address，從 0 開始。

Display（Reference）address：

- Coil 0x：address 0 = 000001
- Discrete Input 1x：address 0 = 100001
- Input Register 3x：address 0 = 300001
- Holding Register 4x：address 0 = 400001

### 注意事項

- Port 502 可能需要系統管理員權限，建議本機測試使用 1502。
- Discrete Input 1x 與 Input Register 3x 為唯讀。
- Coil 0x 與 Holding Register 4x 可寫入。
- `long` 以 64-bit signed integer 編解碼，超出 JavaScript safe integer 範圍時請改用整數字串。

### 未建立布林位址處理模式

控制讀取 Coil / Discrete Input 時，未建立位址的處理方式：

- `Compatibility`：未建立位址回 false / 0。
- `Strict`：未建立位址回 Modbus exception。

### 控制回饋映射模式 Feedback Mapping Mode

此模式用於模擬 PLC / DDC 收到 Coil 控制命令後，將狀態回饋到 Discrete Input。

- `Disabled`：不自動回饋。
- `Coil write → Discrete Input same address`：寫入 Coil 或手動套用 Coil 後，同步同 offset 的 Discrete Input。

範例：

```text
Coil 000001 = true
=> Discrete Input 100001 = true
```

注意：此功能不是 Coil / Discrete Input mirror。它只在 Coil 寫入或 Coil 手動套用時，單向更新 Discrete Input。

## Modbus → API Bridge Mapping

Bridge 不提供獨立 HTTP API Server。只有在 API Simulator 將回應來源切到 `Modbus Bridge` 時，API 回應才會使用 Bridge payload。

Bridge 的定位是：

- Modbus TCP Simulator 的點位資料來源
- API Simulator 的 response source
- Mapping Table / Preset / Payload Preview / Diagnostics 設定區

### Mapping 規則

- 內部索引固定使用 `regType + protocolAddress`（不用 point ID 與 Reference Address）。
- JSON Path 只支援點號路徑，不支援 array path。
- Transform 類型：`raw`、`number`、`boolean`、`string`。
- Mapping 可設定 fallback 值。

### Preset

預設 Preset：

- `Sample Boolean`
  - `sample.coil1 <= coil protocolAddress 0`
  - `sample.discreteInput1 <= discreteInput protocolAddress 0`
- `Plumbing Pump Status`
  - `plumbing.pumps.pump1.run <= discreteInput protocolAddress 0`
  - `plumbing.pumps.pump1.fault <= discreteInput protocolAddress 1`
  - ...
  - `plumbing.pumps.pump11.run <= discreteInput protocolAddress 20`
  - `plumbing.pumps.pump11.fault <= discreteInput protocolAddress 21`

Bridge Mapping 介面可新增、儲存、刪除使用者自訂 Preset。

### 一般流程

1. 啟動 Modbus TCP Simulator。
2. 設定點位與位址模式。
3. 到 Bridge Mapping 進階設定選擇 preset，必要時再微調 mapping。
4. 使用 Payload Preview 與 Diagnostics 確認輸出結果。
5. 回 API Simulator，將 API 回應來源切到 Modbus Bridge。
6. 啟動 API Server，並使用 API Simulator 的 URL 呼叫結果。
