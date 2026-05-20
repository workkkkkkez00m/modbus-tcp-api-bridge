import net from 'node:net';
import {
  decodeRegistersToValue,
  encodeValueToRegisters,
  formatRegisterHex,
  getRegisterWordCount,
} from './modbusValueCodec.js';
import {
  normalizeRequestAddressBaseMode,
  parseStartAddress,
  resolveRequestAddress,
  toReferenceAddress,
} from './modbusAddress.js';

const MAX_LOGS = 100;

const REG_TYPE_META = {
  coil: {
    key: 'coil',
    label: '線圈 Coil 0x',
    displayBase: 1,
    rawMapKey: 'rawCoils',
    kind: 'bit',
    writable: true,
  },
  discreteInput: {
    key: 'discreteInput',
    label: '離散輸入 Discrete Input 1x',
    displayBase: 10001,
    rawMapKey: 'rawDiscreteInputs',
    kind: 'bit',
    writable: false,
  },
  inputRegister: {
    key: 'inputRegister',
    label: '輸入暫存器 Input Register 3x',
    displayBase: 30001,
    rawMapKey: 'rawInputRegisters',
    kind: 'register',
    writable: false,
  },
  holdingRegister: {
    key: 'holdingRegister',
    label: '保持暫存器 Holding Register 4x',
    displayBase: 40001,
    rawMapKey: 'rawHoldingRegisters',
    kind: 'register',
    writable: true,
  },
};

const REGISTER_TYPES_BY_REG_TYPE = {
  coil: ['binary'],
  discreteInput: ['binary'],
  inputRegister: ['short', 'int', 'long', 'float', 'double', 'binary'],
  holdingRegister: ['short', 'int', 'long', 'float', 'double', 'binary'],
};

const ACTIONS = new Set(['manual', 'random', 'increment', 'toggle', 'sine']);

class ModbusRequestError extends Error {
  constructor(message, exceptionCode) {
    super(message);
    this.name = 'ModbusRequestError';
    this.exceptionCode = exceptionCode;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInt(value, min, max, fallback) {
  const parsed = toInt(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function getClientLabel(socket) {
  return `${socket.remoteAddress || 'unknown'}:${socket.remotePort || 0}`;
}

function rangesOverlap(startA, lengthA, startB, lengthB) {
  const endA = startA + lengthA - 1;
  const endB = startB + lengthB - 1;
  return startA <= endB && startB <= endA;
}

function normalizeRegType(regType) {
  if (Object.hasOwn(REG_TYPE_META, regType)) {
    return regType;
  }

  throw new Error(`Unsupported register type: ${regType}`);
}

function normalizeWordOrder(wordOrder) {
  return wordOrder === 'LH' ? 'LH' : 'HL';
}

function normalizeAction(action) {
  if (ACTIONS.has(action)) {
    return action;
  }

  return 'manual';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseActionConfigInput(value) {
  if (value == null || value === '') {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (!isPlainObject(parsed)) {
        throw new Error('Action Config 必須是 JSON 物件。');
      }

      return parsed;
    } catch (error) {
      if (error.message === 'Action Config 必須是 JSON 物件。') {
        throw error;
      }

      throw new Error(`Action Config JSON 格式錯誤：${error.message}`);
    }
  }

  if (!isPlainObject(value)) {
    throw new Error('Action Config 必須是 JSON 物件。');
  }

  return cloneJsonValue(value);
}

function readFiniteNumber(value, label) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`${label} 必須是有效數字。`);
  }

  return numericValue;
}

function readIntegerNumber(value, label) {
  const numericValue = readFiniteNumber(value, label);

  if (!Number.isInteger(numericValue)) {
    throw new Error(`${label} 必須是整數。`);
  }

  return numericValue;
}

function readBooleanValue(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 0) {
      return false;
    }

    if (value === 1) {
      return true;
    }
  }

  const text = String(value).trim().toLowerCase();

  if (text === '0' || text === 'false') {
    return false;
  }

  if (text === '1' || text === 'true') {
    return true;
  }

  throw new Error('binary 值只接受 0 / 1 / true / false。');
}

function readBinaryRegisterValue(value) {
  return readBooleanValue(value) ? 1 : 0;
}

function readLongStringValue(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error('long 值必須是整數。');
    }

    if (!Number.isSafeInteger(value)) {
      throw new Error('long 值超出 JavaScript safe integer 範圍，請改用整數字串。');
    }

    return String(value);
  }

  const text = String(value).trim();
  if (!/^[-+]?\d+$/.test(text)) {
    throw new Error('long 值必須是整數字串。');
  }

  return text;
}

function formatBitsDisplay(bitValue) {
  return bitValue ? 'true / 1' : 'false / 0';
}

function formatByteHex(value) {
  return `0x${value.toString(16).padStart(2, '0')}`;
}

function padFunctionCode(functionCode) {
  return `FC${functionCode.toString(16).toUpperCase().padStart(2, '0')}`;
}

function buildRequestAddressLogFields(
  regType,
  requestStartAddress,
  requestQuantity,
  requestAddressBaseMode
) {
  const normalizedMode = normalizeRequestAddressBaseMode(requestAddressBaseMode);

  if (!regType || !Object.hasOwn(REG_TYPE_META, regType)) {
    return {
      requestStartAddress: requestStartAddress ?? null,
      requestQuantity: requestQuantity ?? null,
      requestAddressBaseMode: normalizedMode,
      resolvedInternalStartAddress: requestStartAddress ?? null,
      referenceStartAddress: null,
      referenceEndAddress: null,
    };
  }

  const resolvedInternalStartAddress = resolveRequestAddress(
    requestStartAddress,
    normalizedMode
  );
  const safeQuantity = Number.isInteger(requestQuantity) && requestQuantity > 0
    ? requestQuantity
    : 1;

  return {
    requestStartAddress,
    requestQuantity,
    requestAddressBaseMode: normalizedMode,
    resolvedInternalStartAddress,
    referenceStartAddress: toReferenceAddress(regType, resolvedInternalStartAddress),
    referenceEndAddress: toReferenceAddress(
      regType,
      resolvedInternalStartAddress + safeQuantity - 1
    ),
  };
}

class MockModbusTcpServer {
  constructor() {
    this.server = null;
    this.sockets = new Set();
    this.pointSequence = 0;
    this.state = {
      host: '127.0.0.1',
      port: 1502,
      unitId: 1,
      points: [],
      rawCoils: {},
      rawDiscreteInputs: {},
      rawInputRegisters: {},
      rawHoldingRegisters: {},
      logs: [],
      requestAddressBaseMode: 'standard-0-based',
    };
  }

  getStatus() {
    return {
      running: Boolean(this.server),
      host: this.state.host,
      port: this.state.port,
      unitId: this.state.unitId,
      endpoint: `${this.state.host}:${this.state.port}`,
      pointCount: this.state.points.length,
      config: {
        host: this.state.host,
        port: this.state.port,
        unitId: this.state.unitId,
        requestAddressBaseMode: this.state.requestAddressBaseMode,
      },
    };
  }

  getPoints() {
    return this.state.points.map((point) => ({
      ...point,
      actionConfig: cloneJsonValue(point.actionConfig),
      registers: [...point.registers],
      hex: [...point.hex],
      bits: point.bits ? [...point.bits] : null,
    }));
  }

  getLogs() {
    return this.state.logs.map((log) => ({ ...log }));
  }

  clearLogs() {
    this.state.logs = [];
    return this.getLogs();
  }

  async start(nextConfig = {}) {
    if (this.server) {
      return this.getStatus();
    }

    this.state = {
      ...this.state,
      ...this.normalizeServerConfig(nextConfig),
    };

    await new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      server.on('error', reject);
      server.listen(this.state.port, this.state.host, () => {
        server.off('error', reject);
        server.on('error', (error) => {
          console.error('Modbus TCP server error:', error);
        });
        this.server = server;
        resolve();
      });
    });

    return this.getStatus();
  }

  async stop() {
    if (!this.server) {
      return this.getStatus();
    }

    const serverToClose = this.server;
    this.server = null;

    for (const socket of this.sockets) {
      socket.destroy();
    }

    this.sockets.clear();

    await new Promise((resolve, reject) => {
      serverToClose.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    return this.getStatus();
  }

  async restart(nextConfig = {}) {
    this.state = {
      ...this.state,
      ...this.normalizeServerConfig(nextConfig),
    };

    await this.stop();
    return this.start();
  }

  generateRegisters(config = {}) {
    const regType = normalizeRegType(config.regType || 'holdingRegister');
    const type = this.normalizePointType(regType, config.type || 'short');
    const span = this.getPointSpan(regType, type);
    const startAddress = parseStartAddress({
      regType,
      inputValue: config.startAddress ?? 1,
      addressInputMode: config.addressInputMode || 'reference',
    });
    const count = Math.max(1, toInt(config.count, span));

    if (count % span !== 0) {
      throw new Error(`數量必須是 ${type} 所需位址數 ${span} 的倍數。`);
    }

    const pointCount = count / span;
    const wordOrder = this.getNormalizedWordOrder(regType, type, config.wordOrder);
    const action = this.getNormalizedAction(regType, type, config.action);
    const actionConfig = this.normalizeActionConfig(regType, type, action, config.actionConfig);
    const initialValue = this.normalizePointValue(
      { regType, type, wordOrder },
      config.initialValue ?? this.getDefaultInitialValue(regType, type)
    );

    const overlappingPoints = this.state.points.filter((point) =>
      point.regType === regType
      && rangesOverlap(point.address, point.span, startAddress, count)
    );

    for (const point of overlappingPoints) {
      this.deletePointRawData(point);
    }

    this.state.points = this.state.points.filter((point) => !overlappingPoints.includes(point));

    for (let index = 0; index < pointCount; index += 1) {
      const address = startAddress + (index * span);
      const point = this.createPoint({
        regType,
        address,
        type,
        wordOrder,
        value: initialValue,
        action,
        actionConfig,
      });

      this.state.points.push(point);
      this.writePointRawData(point);
    }

    this.sortPoints();

    return {
      status: this.getStatus(),
      points: this.getPoints(),
    };
  }

  getResolvedRequestAddress(requestAddress) {
    return resolveRequestAddress(requestAddress, this.state.requestAddressBaseMode);
  }

  getRequestAddressResolutionNote(requestAddress) {
    if (
      this.state.requestAddressBaseMode === 'legacy-1-based-compatible'
      && requestAddress === 0
    ) {
      return 'legacy 模式收到 request address 0，已保留解析為 internal address 0';
    }

    return '';
  }

  updatePoint(nextPoint = {}) {
    const point = this.state.points.find((item) => item.id === nextPoint.id);

    if (!point) {
      throw new Error(`找不到點位：${nextPoint.id}`);
    }

    const wordOrder = this.getNormalizedWordOrder(
      point.regType,
      point.type,
      nextPoint.wordOrder ?? point.wordOrder
    );
    const action = this.getNormalizedAction(
      point.regType,
      point.type,
      nextPoint.action ?? point.action
    );
    const actionConfig = this.normalizeActionConfig(
      point.regType,
      point.type,
      action,
      nextPoint.actionConfig ?? nextPoint.actionConfigText ?? point.actionConfig
    );
    const value = this.normalizePointValue(
      { regType: point.regType, type: point.type, wordOrder },
      nextPoint.value ?? point.value
    );

    point.wordOrder = wordOrder;
    point.action = action;
    point.actionConfig = actionConfig;
    point.actionConfigText = this.stringifyActionConfig(actionConfig);
    point.value = value;

    this.writePointRawData(point);

    return {
      status: this.getStatus(),
      points: this.getPoints(),
    };
  }

  handleConnection(socket) {
    this.sockets.add(socket);
    socket.modbusBuffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      socket.modbusBuffer = Buffer.concat([socket.modbusBuffer, chunk]);
      this.consumeSocketBuffer(socket);
    });

    socket.on('close', () => {
      this.sockets.delete(socket);
    });

    socket.on('error', () => {
      this.sockets.delete(socket);
    });
  }

  consumeSocketBuffer(socket) {
    while (socket.modbusBuffer.length >= 7) {
      const frameLength = 6 + socket.modbusBuffer.readUInt16BE(4);

      if (socket.modbusBuffer.length < frameLength) {
        return;
      }

      const frame = socket.modbusBuffer.subarray(0, frameLength);
      socket.modbusBuffer = socket.modbusBuffer.subarray(frameLength);

      const response = this.handleFrame(frame, socket);

      if (response) {
        socket.write(response);
      }
    }
  }

  handleFrame(frame, socket) {
    const transactionId = frame.readUInt16BE(0);
    const protocolId = frame.readUInt16BE(2);
    const unitId = frame.readUInt8(6);
    const pdu = frame.subarray(7);

    if (protocolId !== 0 || pdu.length < 1) {
      return null;
    }

    const functionCode = pdu.readUInt8(0);

    try {
      switch (functionCode) {
        case 0x01:
          return this.handleReadBits(transactionId, unitId, pdu, socket, 'coil');
        case 0x02:
          return this.handleReadBits(transactionId, unitId, pdu, socket, 'discreteInput');
        case 0x03:
          return this.handleReadRegisters(transactionId, unitId, pdu, socket, 'holdingRegister');
        case 0x04:
          return this.handleReadRegisters(transactionId, unitId, pdu, socket, 'inputRegister');
        case 0x05:
          return this.handleWriteSingleCoil(transactionId, unitId, pdu, socket);
        case 0x06:
          return this.handleWriteSingleRegister(transactionId, unitId, pdu, socket);
        case 0x0F:
          return this.handleWriteMultipleCoils(transactionId, unitId, pdu, socket);
        case 0x10:
          return this.handleWriteMultipleRegisters(transactionId, unitId, pdu, socket);
        default:
          this.addLog({
            client: getClientLabel(socket),
            unitId,
            functionCode: padFunctionCode(functionCode),
            regType: '-',
            ...buildRequestAddressLogFields(null, null, null),
            action: '不支援',
            address: null,
            quantity: null,
            status: '錯誤',
            message: '不支援的 Function Code',
          });
          return this.buildExceptionResponse(transactionId, unitId, functionCode, 0x01);
      }
    } catch (error) {
      const exceptionCode = error instanceof ModbusRequestError
        ? error.exceptionCode
        : 0x03;

      this.addLog({
        client: getClientLabel(socket),
        unitId,
        functionCode: padFunctionCode(functionCode),
        regType: '-',
        ...buildRequestAddressLogFields(null, null, null, this.state.requestAddressBaseMode),
        action: '失敗',
        address: null,
        quantity: null,
        status: '錯誤',
        message: error.message,
      });

      return this.buildExceptionResponse(transactionId, unitId, functionCode, exceptionCode);
    }
  }

  handleReadBits(transactionId, unitId, pdu, socket, regType) {
    if (pdu.length !== 5) {
      throw new ModbusRequestError(`${padFunctionCode(pdu.readUInt8(0))} 要求長度不正確。`, 0x03);
    }

    const requestStartAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);
    const startAddress = this.getResolvedRequestAddress(requestStartAddress);
    const resolutionNote = this.getRequestAddressResolutionNote(requestStartAddress);

    if (quantity < 1 || quantity > 2000) {
      throw new ModbusRequestError('讀取 bit 數量必須介於 1 到 2000。', 0x03);
    }

    if (regType === 'coil') {
      this.syncPointsFromRawRange('coil', startAddress, quantity);
    }

    const actionPointIds = this.applyPointActionsForRange(regType, startAddress, quantity);

    const rawMap = this.getRawMap(regType);
    const byteCount = Math.ceil(quantity / 8);
    const responsePdu = Buffer.alloc(2 + byteCount);
    responsePdu.writeUInt8(pdu.readUInt8(0), 0);
    responsePdu.writeUInt8(byteCount, 1);
    const readValues = [];

    for (let index = 0; index < quantity; index += 1) {
      const address = startAddress + index;
      const key = String(address);

      if (!Object.hasOwn(rawMap, key)) {
        throw new ModbusRequestError('位址超出範圍。', 0x02);
      }

      const value = Boolean(rawMap[key]);
      readValues.push(value);

      if (value) {
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        responsePdu[2 + byteIndex] |= (1 << bitIndex);
      }
    }

    const responseBytes = Array.from(responsePdu.subarray(2)).map(formatByteHex);
    const actionLogFields = regType === 'coil'
      ? {
          actionApplied: actionPointIds.length > 0,
          actionPointIds,
        }
      : {};
    const requestAddress = quantity === 1 ? requestStartAddress : null;
    const resolvedInternalAddress = quantity === 1 ? startAddress : null;
    const referenceAddress = quantity === 1
      ? toReferenceAddress(regType, startAddress)
      : null;

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: padFunctionCode(pdu.readUInt8(0)),
      regType: REG_TYPE_META[regType].label,
      ...buildRequestAddressLogFields(
        regType,
        requestStartAddress,
        quantity,
        this.state.requestAddressBaseMode
      ),
      action: '讀取',
      requestAddress,
      resolvedInternalAddress,
      referenceAddress,
      address: startAddress,
      quantity,
      readValues,
      responseBytes,
      ...actionLogFields,
      requestAddressResolutionNote: resolutionNote,
      status: '成功',
      message: regType === 'coil'
        ? '讀取線圈成功'
        : '讀取離散輸入成功，注意：此功能碼讀取的是 Discrete Input，不是 Coil。',
    });

    return this.buildResponse(transactionId, unitId, responsePdu);
  }

  handleReadRegisters(transactionId, unitId, pdu, socket, regType) {
    if (pdu.length !== 5) {
      throw new ModbusRequestError(`${padFunctionCode(pdu.readUInt8(0))} 要求長度不正確。`, 0x03);
    }

    const requestStartAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);
    const startAddress = this.getResolvedRequestAddress(requestStartAddress);
    const resolutionNote = this.getRequestAddressResolutionNote(requestStartAddress);

    if (quantity < 1 || quantity > 125) {
      throw new ModbusRequestError('讀取 register 數量必須介於 1 到 125。', 0x03);
    }

    this.applyPointActionsForRange(regType, startAddress, quantity);

    const rawMap = this.getRawMap(regType);
    const responsePdu = Buffer.alloc(2 + (quantity * 2));
    responsePdu.writeUInt8(pdu.readUInt8(0), 0);
    responsePdu.writeUInt8(quantity * 2, 1);

    for (let index = 0; index < quantity; index += 1) {
      const address = startAddress + index;
      const key = String(address);

      if (!Object.hasOwn(rawMap, key)) {
        throw new ModbusRequestError('位址超出範圍。', 0x02);
      }

      responsePdu.writeUInt16BE(rawMap[key] & 0xffff, 2 + (index * 2));
    }

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: padFunctionCode(pdu.readUInt8(0)),
      regType: REG_TYPE_META[regType].label,
      ...buildRequestAddressLogFields(
        regType,
        requestStartAddress,
        quantity,
        this.state.requestAddressBaseMode
      ),
      action: '讀取',
      address: startAddress,
      quantity,
      requestAddressResolutionNote: resolutionNote,
      status: '成功',
      message: regType === 'holdingRegister'
        ? '讀取保持暫存器成功'
        : '讀取輸入暫存器成功',
    });

    return this.buildResponse(transactionId, unitId, responsePdu);
  }

  handleWriteSingleCoil(transactionId, unitId, pdu, socket) {
    if (pdu.length !== 5) {
      throw new ModbusRequestError('FC05 要求長度不正確。', 0x03);
    }

    const requestAddress = pdu.readUInt16BE(1);
    const rawValue = pdu.readUInt16BE(3);
    const address = this.getResolvedRequestAddress(requestAddress);
    const resolutionNote = this.getRequestAddressResolutionNote(requestAddress);

    if (rawValue !== 0xFF00 && rawValue !== 0x0000) {
      throw new ModbusRequestError('線圈寫入值只接受 0xFF00 或 0x0000。', 0x03);
    }

    const writeValue = rawValue === 0xFF00;
    const referenceAddress = toReferenceAddress('coil', address);

    this.getRawMap('coil')[String(address)] = writeValue;
    this.syncPointsFromRawRange('coil', address, 1);
    const rawValueAfterWrite = Boolean(this.getRawMap('coil')[String(address)]);

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: 'FC05',
      regType: REG_TYPE_META.coil.label,
      ...buildRequestAddressLogFields(
        'coil',
        requestAddress,
        1,
        this.state.requestAddressBaseMode
      ),
      action: '寫入',
      requestAddress,
      resolvedInternalAddress: address,
      referenceAddress,
      writeValue,
      rawValueAfterWrite,
      address,
      quantity: 1,
      requestAddressResolutionNote: resolutionNote,
      status: '成功',
      message: '寫入單一線圈成功',
    });

    return this.buildResponse(transactionId, unitId, pdu);
  }

  handleWriteSingleRegister(transactionId, unitId, pdu, socket) {
    if (pdu.length !== 5) {
      throw new ModbusRequestError('FC06 要求長度不正確。', 0x03);
    }

    const requestAddress = pdu.readUInt16BE(1);
    const value = pdu.readUInt16BE(3);
    const address = this.getResolvedRequestAddress(requestAddress);
    const resolutionNote = this.getRequestAddressResolutionNote(requestAddress);

    this.getRawMap('holdingRegister')[String(address)] = value;
    this.syncPointsFromRawRange('holdingRegister', address, 1);

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: 'FC06',
      regType: REG_TYPE_META.holdingRegister.label,
      ...buildRequestAddressLogFields(
        'holdingRegister',
        requestAddress,
        1,
        this.state.requestAddressBaseMode
      ),
      action: '寫入',
      address,
      quantity: 1,
      requestAddressResolutionNote: resolutionNote,
      status: '成功',
      message: '寫入單一保持暫存器成功',
    });

    return this.buildResponse(transactionId, unitId, pdu);
  }

  handleWriteMultipleCoils(transactionId, unitId, pdu, socket) {
    if (pdu.length < 6) {
      throw new ModbusRequestError('FC15 要求長度不正確。', 0x03);
    }

    const requestStartAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);
    const byteCount = pdu.readUInt8(5);
    const startAddress = this.getResolvedRequestAddress(requestStartAddress);
    const resolutionNote = this.getRequestAddressResolutionNote(requestStartAddress);

    if (quantity < 1 || quantity > 1968) {
      throw new ModbusRequestError('寫入線圈數量必須介於 1 到 1968。', 0x03);
    }

    if (byteCount !== Math.ceil(quantity / 8) || pdu.length !== 6 + byteCount) {
      throw new ModbusRequestError('FC15 byte count 與 quantity 不一致。', 0x03);
    }

    const rawMap = this.getRawMap('coil');
    const writeValues = [];

    for (let index = 0; index < quantity; index += 1) {
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      const bitValue = (pdu.readUInt8(6 + byteIndex) >> bitIndex) & 0x01;
      const value = Boolean(bitValue);
      writeValues.push(value);
      rawMap[String(startAddress + index)] = value;
    }

    this.syncPointsFromRawRange('coil', startAddress, quantity);
    const rawValuesAfterWrite = writeValues.map((_, index) => Boolean(
      rawMap[String(startAddress + index)]
    ));

    const responsePdu = Buffer.alloc(5);
    responsePdu.writeUInt8(0x0F, 0);
    responsePdu.writeUInt16BE(requestStartAddress, 1);
    responsePdu.writeUInt16BE(quantity, 3);

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: 'FC15',
      regType: REG_TYPE_META.coil.label,
      ...buildRequestAddressLogFields(
        'coil',
        requestStartAddress,
        quantity,
        this.state.requestAddressBaseMode
      ),
      action: '寫入',
      writeValues,
      rawValuesAfterWrite,
      address: startAddress,
      quantity,
      requestAddressResolutionNote: resolutionNote,
      status: '成功',
      message: '寫入多個線圈成功',
    });

    return this.buildResponse(transactionId, unitId, responsePdu);
  }

  handleWriteMultipleRegisters(transactionId, unitId, pdu, socket) {
    if (pdu.length < 6) {
      throw new ModbusRequestError('FC16 要求長度不正確。', 0x03);
    }

    const requestStartAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);
    const byteCount = pdu.readUInt8(5);
    const startAddress = this.getResolvedRequestAddress(requestStartAddress);
    const resolutionNote = this.getRequestAddressResolutionNote(requestStartAddress);

    if (quantity < 1 || quantity > 123) {
      throw new ModbusRequestError('寫入 register 數量必須介於 1 到 123。', 0x03);
    }

    if (byteCount !== quantity * 2 || pdu.length !== 6 + byteCount) {
      throw new ModbusRequestError('FC16 byte count 與 quantity 不一致。', 0x03);
    }

    const rawMap = this.getRawMap('holdingRegister');

    for (let index = 0; index < quantity; index += 1) {
      rawMap[String(startAddress + index)] = pdu.readUInt16BE(6 + (index * 2));
    }

    this.syncPointsFromRawRange('holdingRegister', startAddress, quantity);

    const responsePdu = Buffer.alloc(5);
    responsePdu.writeUInt8(0x10, 0);
    responsePdu.writeUInt16BE(requestStartAddress, 1);
    responsePdu.writeUInt16BE(quantity, 3);

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: 'FC10',
      regType: REG_TYPE_META.holdingRegister.label,
      ...buildRequestAddressLogFields(
        'holdingRegister',
        requestStartAddress,
        quantity,
        this.state.requestAddressBaseMode
      ),
      action: '寫入',
      address: startAddress,
      quantity,
      requestAddressResolutionNote: resolutionNote,
      status: '成功',
      message: '寫入多筆保持暫存器成功',
    });

    return this.buildResponse(transactionId, unitId, responsePdu);
  }

  createPoint({ regType, address, type, wordOrder, value, action, actionConfig }) {
    const span = this.getPointSpan(regType, type);
    const referenceAddress = toReferenceAddress(regType, address);

    return {
      id: `point-${++this.pointSequence}`,
      enabled: true,
      regType,
      regTypeLabel: REG_TYPE_META[regType].label,
      address,
      protocolAddress: address,
      displayAddress: referenceAddress,
      referenceAddress,
      type,
      wordOrder,
      action,
      actionConfig: cloneJsonValue(actionConfig),
      actionConfigText: this.stringifyActionConfig(actionConfig),
      value,
      span,
      registers: [],
      bits: null,
      hex: [],
      writable: REG_TYPE_META[regType].writable,
    };
  }

  normalizeServerConfig(config = {}) {
    const host = String(config.host || this.state.host || '127.0.0.1').trim() || '127.0.0.1';
    const port = clampInt(config.port, 1, 65535, this.state.port || 1502);
    const unitId = clampInt(config.unitId, 0, 255, this.state.unitId || 1);
    const requestAddressBaseMode = normalizeRequestAddressBaseMode(
      config.requestAddressBaseMode ?? this.state.requestAddressBaseMode
    );

    return {
      host,
      port,
      unitId,
      requestAddressBaseMode,
    };
  }

  normalizePointType(regType, type) {
    const normalizedRegType = normalizeRegType(regType);
    const supportedTypes = REGISTER_TYPES_BY_REG_TYPE[normalizedRegType];

    if (supportedTypes.includes(type)) {
      return type;
    }

    throw new Error(`${REG_TYPE_META[normalizedRegType].label} 不支援資料型別 ${type}。`);
  }

  getPointSpan(regType, type) {
    const normalizedRegType = normalizeRegType(regType);
    return REG_TYPE_META[normalizedRegType].kind === 'bit'
      ? 1
      : getRegisterWordCount(type);
  }

  usesWordOrder(regType, type) {
    return REG_TYPE_META[regType].kind === 'register' && this.getPointSpan(regType, type) > 1;
  }

  getNormalizedWordOrder(regType, type, wordOrder) {
    return this.usesWordOrder(regType, type)
      ? normalizeWordOrder(wordOrder)
      : 'HL';
  }

  isBinaryLike(regType, type) {
    return REG_TYPE_META[regType].kind === 'bit' || type === 'binary';
  }

  getNormalizedAction(regType, type, action) {
    const normalizedAction = normalizeAction(action);

    if (normalizedAction === 'sine' && this.isBinaryLike(regType, type)) {
      return 'manual';
    }

    return normalizedAction;
  }

  normalizeActionConfig(regType, type, action, configInput) {
    const normalizedAction = this.getNormalizedAction(regType, type, action);
    const config = parseActionConfigInput(configInput);

    switch (normalizedAction) {
      case 'manual':
      case 'toggle':
        return {};
      case 'random': {
        const defaultMin = this.isBinaryLike(regType, type) ? 0 : 0;
        const defaultMax = this.isBinaryLike(regType, type) ? 1 : 100;
        const min = readFiniteNumber(config.min ?? defaultMin, 'random.min');
        const max = readFiniteNumber(config.max ?? defaultMax, 'random.max');

        if (min > max) {
          throw new Error('random.min 不可大於 random.max。');
        }

        return { min, max };
      }
      case 'increment': {
        const step = type === 'long'
          ? readIntegerNumber(config.step ?? 1, 'increment.step')
          : readFiniteNumber(config.step ?? 1, 'increment.step');
        return { step };
      }
      case 'sine': {
        const base = readFiniteNumber(config.base ?? 0, 'sine.base');
        const amplitude = readFiniteNumber(config.amplitude ?? 1, 'sine.amplitude');
        const periodSec = readFiniteNumber(config.periodSec ?? 30, 'sine.periodSec');

        if (periodSec <= 0) {
          throw new Error('sine.periodSec 必須大於 0。');
        }

        return { base, amplitude, periodSec };
      }
      default:
        return {};
    }
  }

  getDefaultInitialValue(regType, type) {
    if (REG_TYPE_META[regType].kind === 'bit') {
      return false;
    }

    if (type === 'long') {
      return '0';
    }

    return 0;
  }

  normalizePointValue(spec, value) {
    const { regType, type, wordOrder } = spec;

    if (REG_TYPE_META[regType].kind === 'bit') {
      return readBooleanValue(value);
    }

    if (type === 'binary') {
      return readBinaryRegisterValue(value);
    }

    if (type === 'long') {
      const normalizedValue = readLongStringValue(value);
      const registers = encodeValueToRegisters({ value: normalizedValue, type, wordOrder });
      return decodeRegistersToValue({ registers, type, wordOrder });
    }

    if (type === 'short' || type === 'int') {
      const normalizedValue = readIntegerNumber(value, `${type} value`);
      const registers = encodeValueToRegisters({ value: normalizedValue, type, wordOrder });
      return decodeRegistersToValue({ registers, type, wordOrder });
    }

    const normalizedValue = readFiniteNumber(value, `${type} value`);
    const registers = encodeValueToRegisters({ value: normalizedValue, type, wordOrder });
    return decodeRegistersToValue({ registers, type, wordOrder });
  }

  writePointRawData(point) {
    if (REG_TYPE_META[point.regType].kind === 'bit') {
      point.registers = [];
      point.hex = [];
      point.bits = [Boolean(point.value)];
      this.getRawMap(point.regType)[String(point.address)] = Boolean(point.value);
      return;
    }

    const registers = encodeValueToRegisters({
      value: point.value,
      type: point.type,
      wordOrder: point.wordOrder,
    });

    point.value = decodeRegistersToValue({
      registers,
      type: point.type,
      wordOrder: point.wordOrder,
    });
    point.registers = registers;
    point.hex = formatRegisterHex(registers);
    point.bits = null;

    registers.forEach((register, index) => {
      this.getRawMap(point.regType)[String(point.address + index)] = register;
    });
  }

  deletePointRawData(point) {
    if (REG_TYPE_META[point.regType].kind === 'bit') {
      delete this.getRawMap(point.regType)[String(point.address)];
      return;
    }

    for (let index = 0; index < point.span; index += 1) {
      delete this.getRawMap(point.regType)[String(point.address + index)];
    }
  }

  syncPointsFromRawRange(regType, startAddress, quantity) {
    const rawMap = this.getRawMap(regType);

    for (const point of this.state.points) {
      if (point.regType !== regType || !rangesOverlap(point.address, point.span, startAddress, quantity)) {
        continue;
      }

      if (REG_TYPE_META[regType].kind === 'bit') {
        const key = String(point.address);
        if (!Object.hasOwn(rawMap, key)) {
          continue;
        }

        point.value = Boolean(rawMap[key]);
        point.bits = [point.value];
        point.registers = [];
        point.hex = [];
        continue;
      }

      const registers = [];
      let complete = true;

      for (let index = 0; index < point.span; index += 1) {
        const key = String(point.address + index);

        if (!Object.hasOwn(rawMap, key)) {
          complete = false;
          break;
        }

        registers.push(rawMap[key]);
      }

      if (!complete) {
        continue;
      }

      point.registers = registers;
      point.hex = formatRegisterHex(registers);
      point.bits = null;
      point.value = decodeRegistersToValue({
        registers,
        type: point.type,
        wordOrder: point.wordOrder,
      });
    }
  }

  applyPointActionsForRange(regType, startAddress, quantity) {
    const actionPointIds = [];

    for (const point of this.state.points) {
      if (
        !point.enabled
        || point.regType !== regType
        || !rangesOverlap(point.address, point.span, startAddress, quantity)
      ) {
        continue;
      }

      if (point.action === 'manual') {
        continue;
      }

      if (this.applyActionToPoint(point)) {
        actionPointIds.push(point.id);
      }
    }

    return actionPointIds;
  }

  applyActionToPoint(point) {
    switch (point.action) {
      case 'manual':
        return false;
      case 'random':
        point.value = this.buildRandomValue(point);
        this.writePointRawData(point);
        return true;
      case 'increment':
        point.value = this.buildIncrementValue(point);
        this.writePointRawData(point);
        return true;
      case 'toggle':
        point.value = this.buildToggleValue(point);
        this.writePointRawData(point);
        return true;
      case 'sine': {
        const nextValue = this.buildSineValue(point);
        if (nextValue !== undefined) {
          point.value = nextValue;
          this.writePointRawData(point);
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  }

  buildRandomValue(point) {
    if (this.isBinaryLike(point.regType, point.type)) {
      return REG_TYPE_META[point.regType].kind === 'bit'
        ? Math.random() >= 0.5
        : (Math.random() >= 0.5 ? 1 : 0);
    }

    const { min, max } = point.actionConfig;
    const randomValue = min + (Math.random() * (max - min));

    if (point.type === 'float' || point.type === 'double') {
      return randomValue;
    }

    if (point.type === 'long') {
      return String(Math.trunc(randomValue));
    }

    return Math.trunc(randomValue);
  }

  buildIncrementValue(point) {
    if (REG_TYPE_META[point.regType].kind === 'bit') {
      const currentValue = point.value ? 1 : 0;
      const nextValue = currentValue + Number(point.actionConfig.step || 1);
      return Math.abs(Math.trunc(nextValue)) % 2 === 1;
    }

    if (point.type === 'binary') {
      const nextValue = Number(point.value) + Number(point.actionConfig.step || 1);
      return Math.abs(Math.trunc(nextValue)) % 2;
    }

    if (point.type === 'long') {
      const nextValue = BigInt(readLongStringValue(point.value)) + BigInt(point.actionConfig.step);
      return nextValue.toString();
    }

    const nextValue = Number(point.value) + Number(point.actionConfig.step);
    if (point.type === 'float' || point.type === 'double') {
      return nextValue;
    }

    return Math.trunc(nextValue);
  }

  buildToggleValue(point) {
    if (REG_TYPE_META[point.regType].kind === 'bit') {
      return !Boolean(point.value);
    }

    return Number(point.value) === 0 ? 1 : 0;
  }

  buildSineValue(point) {
    if (this.isBinaryLike(point.regType, point.type)) {
      return undefined;
    }

    const nowSeconds = Date.now() / 1000;
    const { base, amplitude, periodSec } = point.actionConfig;
    const rawValue = base + (Math.sin((nowSeconds / periodSec) * Math.PI * 2) * amplitude);

    if (point.type === 'float' || point.type === 'double') {
      return rawValue;
    }

    if (point.type === 'long') {
      return String(Math.round(rawValue));
    }

    return Math.round(rawValue);
  }

  getRawMap(regType) {
    return this.state[REG_TYPE_META[regType].rawMapKey];
  }

  stringifyActionConfig(actionConfig) {
    return Object.keys(actionConfig || {}).length
      ? JSON.stringify(actionConfig)
      : '';
  }

  sortPoints() {
    this.state.points.sort((left, right) => {
      if (left.displayAddress === right.displayAddress) {
        return left.address - right.address;
      }

      return left.displayAddress - right.displayAddress;
    });
  }

  addLog(log) {
    this.state.logs.unshift({
      time: nowIso(),
      ...log,
    });
    this.state.logs = this.state.logs.slice(0, MAX_LOGS);
  }

  buildResponse(transactionId, unitId, pdu) {
    const header = Buffer.alloc(7);
    header.writeUInt16BE(transactionId, 0);
    header.writeUInt16BE(0, 2);
    header.writeUInt16BE(1 + pdu.length, 4);
    header.writeUInt8(unitId, 6);
    return Buffer.concat([header, pdu]);
  }

  buildExceptionResponse(transactionId, unitId, functionCode, exceptionCode) {
    const pdu = Buffer.from([functionCode | 0x80, exceptionCode]);
    return this.buildResponse(transactionId, unitId, pdu);
  }
}

export {
  MockModbusTcpServer,
  formatBitsDisplay,
  REG_TYPE_META,
};
