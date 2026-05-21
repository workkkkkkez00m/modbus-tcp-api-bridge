# BMS Protocol Mock Lab

以 Electron + Vite 建立的獨立 mock app，提供 API Simulator、Modbus TCP Simulator，並預留後續 Modbus → API Bridge。

## 安裝

```bash
npm install
```

## 啟動

```bash
npm start
```

## API Simulator

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

### Scenario

- `normal`：回傳完整 energy payload
- `no-total`：移除 `total`
- `http-500`：回傳 HTTP 500
- `invalid-json`：回傳非合法 JSON
- `invalid-schema`：回傳欄位缺漏或型別錯誤的 JSON
- `timeout`：延長回應時間，模擬 timeout
- `custom`：回傳目前 Payload Editor 內容

## Modbus TCP Simulator

R3 支援：

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
- short
- int
- long
- float
- double
- binary
- HL / LH word order
- manual / random / increment / toggle / sine actions
- request log

### 位址規則

內部 address 使用 Modbus protocol address，從 0 開始。

Display address：

- Coil 0x：address 0 = 00001
- Discrete Input 1x：address 0 = 10001
- Input Register 3x：address 0 = 30001
- Holding Register 4x：address 0 = 40001

### 注意事項

- Port 502 可能需要系統管理員權限，建議本機測試使用 1502。
- Discrete Input 1x 與 Input Register 3x 為唯讀。
- Coil 0x 與 Holding Register 4x 可寫入。
- `Count` 使用 protocol address 數量；若資料型別需要多個 register，請使用對應倍數。
- `long` 以 64-bit signed integer 編解碼，UI 建議輸入整數字串；超出 JavaScript safe integer 範圍時，action 設定請避免依賴高精度數值運算。
- R4 將新增 Modbus → API Bridge。

### 控制回饋映射模式 Feedback Mapping Mode

此模式用於模擬 PLC / DDC 收到 Coil 控制命令後，將狀態回饋到 Discrete Input。

- `Disabled`：不自動回饋
- `Coil write → Discrete Input same address`：寫入 Coil 後，同步同 offset 的 Discrete Input

範例：

```text
Coil 000001 = true
=> Discrete Input 100001 = true
```

注意：
此功能不是 Coil / Discrete Input mirror。
它只在 Coil 寫入或 Coil 手動套用時，單向更新 Discrete Input。

## Modbus → API Bridge Preset

目前只保留最小必要 preset：

- `Sample Boolean`
  - `sample.coil1 <= coil protocolAddress 0`
  - `sample.discreteInput1 <= discreteInput protocolAddress 0`
- `Plumbing Pump Status`
  - `plumbing.pumps.pump1.run <= discreteInput protocolAddress 0`
  - `plumbing.pumps.pump1.fault <= discreteInput protocolAddress 1`
  - ...
  - `plumbing.pumps.pump11.run <= discreteInput protocolAddress 20`
  - `plumbing.pumps.pump11.fault <= discreteInput protocolAddress 21`

### 一般流程

1. 啟動 Modbus TCP Simulator。
2. 設定點位與相容模式。
3. 到 Bridge Mapping 進階設定選擇 preset，必要時再微調 mapping。
4. 回 API Simulator，將 API 回應來源切到 Modbus Bridge。
5. 啟動 API Server。

## Roadmap

### R1

- Mode Tabs UI
- API Simulator

### R2

- Modbus TCP Simulator 基礎版
- Holding Register 4x
- FC03 / FC06 / FC16

### R3

- 完整 Register Type / Data Type / Action
- 中文優先 UI
- 完整 Modbus Request Log

### R4

- Modbus → API Bridge
- register 到 HTTP API payload 的 mapping rules
