# BMS Protocol Mock Lab

以 Electron + Vite 建立的獨立 mock app，用於 API 模擬、Modbus TCP 模擬與後續 Modbus 對 API 橋接流程。

## 安裝

```bash
npm install
```

## 啟動

```bash
npm start
```

## API 模擬器

### API 端點

- `GET /health`
- `GET /api/energy`
- `GET /api/energy?scenario=normal`
- `GET /api/energy?scenario=no-total`
- `GET /api/energy?scenario=http-500`
- `GET /api/energy?scenario=invalid-json`
- `GET /api/energy?scenario=invalid-schema`
- `GET /api/energy?scenario=timeout`
- `GET /api/energy?scenario=custom`

### 情境

- `normal`：回傳正常的 energy payload
- `no-total`：省略 `total` 節點
- `http-500`：回傳 HTTP 500
- `invalid-json`：回傳格式損壞的 JSON 文字
- `invalid-schema`：回傳欄位型別錯誤或欄位缺漏的 JSON
- `timeout`：延遲回應以模擬 timeout 行為
- `custom`：回傳目前 Payload 編輯器中的內容

## Modbus TCP 模擬器

R2 目前支援：

- Modbus TCP server
- 可設定 host / port / unit ID
- Holding Register 4x
- FC03 Read Holding Registers
- FC06 Write Single Holding Register
- FC16 Write Multiple Holding Registers
- short
- float
- HL / LH word order
- 手動編輯數值
- request log

預設值：

- Host: `127.0.0.1`
- Port: `1502`
- Unit ID: `1`

位址規則：

- 內部位址使用 zero-based protocol address
- Holding Register display address = `40001 + protocol address`

範例：

- Protocol address `0` = Display address `40001`
- Protocol address `1` = Display address `40002`

R3 預計加入：

- Coil 0x
- Discrete Input 1x
- Input Register 3x
- int / long / double / binary
- random / increment / toggle / sine actions

## 路線圖

### R1

- Mode tabs UI
- API 模擬器

### R2

- Modbus TCP 模擬器
- Holding register 產生與編輯
- Modbus request logging

### R3

- 更多 register types
- 更多資料型別
- 更多 actions

### R4

- Modbus 對 API 橋接
- 從 registers 對應到 JSON payload 的 mapping rules
