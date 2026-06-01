# modbus-tcp-api-bridge

[English](./README.md) | [繁體中文](./README.zh-TW.md)

A standalone mock app built with Electron and Vite, with Codex-assisted development, providing an API Simulator, a Modbus TCP Simulator, and Modbus Bridge Mapping as a response source for the API Simulator.

## Install

```bash
npm install
```

## Start

```bash
npm start
```

## API Simulator

### Controls

- Host / Port / API Path / Delay (ms).
- Response Source: `Scenario / Payload Editor` or `Modbus Bridge`.
- Request Log keeps the most recent 100 entries.

### Routes

- `GET /health`
- `GET /api/energy`
- `GET /api/energy?scenario=normal`
- `GET /api/energy?scenario=no-total`
- `GET /api/energy?scenario=http-500`
- `GET /api/energy?scenario=invalid-json`
- `GET /api/energy?scenario=invalid-schema`
- `GET /api/energy?scenario=timeout`
- `GET /api/energy?scenario=custom`

### Scenario Rules

- `normal`: full energy payload
- `no-total`: remove `total`
- `http-500`: respond with HTTP 500
- `invalid-json`: respond with invalid JSON
- `invalid-schema`: respond with missing or invalid fields
- `timeout`: delay response (min 10s)
- `custom`: respond with current Payload Editor content

Scenario can be overridden per request with `?scenario=...`.

When Response Source is `Modbus Bridge`, the API response payload is always the bridge payload (scenario is only used for logging and delay).

### Payload Editor

- Apply current JSON to `custom` scenario.
- Format JSON and reset example payload for the current scenario.

## Modbus TCP Simulator

### Server Controls

- Host / Port / Unit ID.
- Request Address Base Mode:
  - Standard 0-based: request address 0 = internal 0.
  - Legacy 1-based: request address 1 = internal 0 (request 0 still resolves to 0).

### Register Generator

- Address Input Mode:
  - Reference Address / 1-based: input `1` or full address like `100001` for the first point. Input `0` is invalid.
  - Protocol Address / 0-based: input `0` for the first point.
- `Count` must be a multiple of the type span (e.g. `int` = 2 registers, `long` = 4 registers).

### Supported Functions and Data Types

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
- HL / LH word order (multi-register types)
- actions: manual / random / increment / toggle / sine
- request log (latest 100 entries)

### Address Rules

Internal address uses Modbus protocol address (0-based).

Display (Reference) address:

- Coil 0x: address 0 = 000001
- Discrete Input 1x: address 0 = 100001
- Input Register 3x: address 0 = 300001
- Holding Register 4x: address 0 = 400001

### Notes

- Port 502 may require admin privileges. For local testing, use 1502.
- Discrete Input 1x and Input Register 3x are read-only.
- Coil 0x and Holding Register 4x are writable.
- `long` uses 64-bit signed integer encoding. Use integer strings in the UI when exceeding JavaScript safe integer range.

### Undefined Boolean Address Mode

Controls how undefined Coil/Discrete Input addresses are handled during reads:

- `Compatibility`: undefined addresses return false / 0.
- `Strict`: undefined addresses return Modbus exception.

### Feedback Mapping Mode

Simulates PLC/DDC feedback by writing Coil changes into Discrete Input.

- `Disabled`: no auto feedback.
- `Coil write → Discrete Input same address`: after Coil write or manual Coil apply, update Discrete Input at the same offset.

Example:

```text
Coil 000001 = true
=> Discrete Input 100001 = true
```

Note: this is not a Coil/Discrete Input mirror. It only updates Discrete Input on Coil writes or manual Coil apply.

## Modbus to API Bridge Mapping

Bridge does not provide a standalone HTTP API server. The API response uses Bridge data only when the API Simulator Response Source is set to `Modbus Bridge`.

Bridge roles:

- data source for Modbus TCP Simulator points
- response source for API Simulator
- Mapping Table / Preset / Payload Preview / Diagnostics settings

### Mapping Rules

- Internal mapping key is `regType + protocolAddress` (not point ID or reference address).
- JSON Path supports dot notation only (no array path).
- Transform types: `raw`, `number`, `boolean`, `string`.
- Optional fallback value per mapping.

### Presets

Default presets:

- `Sample Boolean`
  - `sample.coil1 <= coil protocolAddress 0`
  - `sample.discreteInput1 <= discreteInput protocolAddress 0`
- `Plumbing Pump Status`
  - `plumbing.pumps.pump1.run <= discreteInput protocolAddress 0`
  - `plumbing.pumps.pump1.fault <= discreteInput protocolAddress 1`
  - ...
  - `plumbing.pumps.pump11.run <= discreteInput protocolAddress 20`
  - `plumbing.pumps.pump11.fault <= discreteInput protocolAddress 21`

User presets can be created, saved, and deleted in the Bridge Mapping panel.

### Typical Flow

1. Start Modbus TCP Simulator.
2. Configure points and address modes.
3. In Bridge Mapping advanced settings, select a preset and adjust mappings if needed.
4. Use Payload Preview and Diagnostics to confirm output.
5. Back in API Simulator, switch response source to Modbus Bridge.
6. Start API Server and call the API Simulator URL.
