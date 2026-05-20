import net from 'node:net';
import {
  decodeRegistersToValue,
  encodeValueToRegisters,
  formatRegisterHex,
  getRegisterWordCount,
} from './modbusValueCodec.js';

const MAX_LOGS = 100;

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

function normalizeValueType(type) {
  return type === 'float' ? 'float' : 'short';
}

function normalizeWordOrder(wordOrder) {
  return wordOrder === 'LH' ? 'LH' : 'HL';
}

function getClientLabel(socket) {
  return `${socket.remoteAddress || 'unknown'}:${socket.remotePort || 0}`;
}

function buildDisplayAddress(address) {
  return 40001 + address;
}

function rangesOverlap(startA, lengthA, startB, lengthB) {
  const endA = startA + lengthA - 1;
  const endB = startB + lengthB - 1;
  return startA <= endB && startB <= endA;
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
      rawHoldingRegisters: {},
      logs: [],
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
      },
    };
  }

  getPoints() {
    return this.state.points.map((point) => ({
      ...point,
      registers: [...point.registers],
      hex: [...point.hex],
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
    const regType = 'holdingreg';
    const type = normalizeValueType(config.type);
    const wordOrder = normalizeWordOrder(config.wordOrder);
    const startAddress = Math.max(0, toInt(config.startAddress, 0));
    const count = Math.max(1, toInt(config.count, 1));
    const initialValue = Number(config.initialValue ?? 0);
    const registerSpan = getRegisterWordCount(type);
    const rangeLength = count * registerSpan;

    if (!Number.isFinite(initialValue)) {
      throw new Error('Initial Value must be a finite number.');
    }

    const overlappingPoints = this.state.points.filter((point) =>
      rangesOverlap(point.address, point.registers.length, startAddress, rangeLength)
    );

    for (const point of overlappingPoints) {
      this.deletePointRegisters(point);
    }

    this.state.points = this.state.points.filter((point) => !overlappingPoints.includes(point));

    for (let index = 0; index < count; index += 1) {
      const address = startAddress + (index * registerSpan);
      const registers = encodeValueToRegisters({
        value: initialValue,
        type,
        wordOrder,
      });

      const point = {
        id: `point-${++this.pointSequence}`,
        enabled: true,
        regType,
        address,
        displayAddress: buildDisplayAddress(address),
        type,
        wordOrder,
        action: 'manual',
        value: decodeRegistersToValue({ registers, type, wordOrder }),
        registers,
        hex: formatRegisterHex(registers),
      };

      this.writePointRegisters(point);
      this.state.points.push(point);
    }

    this.sortPoints();

    return {
      status: this.getStatus(),
      points: this.getPoints(),
    };
  }

  updatePoint(nextPoint = {}) {
    const point = this.state.points.find((item) => item.id === nextPoint.id);

    if (!point) {
      throw new Error(`Point not found: ${nextPoint.id}`);
    }

    const wordOrder = normalizeWordOrder(nextPoint.wordOrder || point.wordOrder);
    const value = Number(nextPoint.value ?? point.value);

    if (!Number.isFinite(value)) {
      throw new Error('Point value must be a finite number.');
    }

    const registers = encodeValueToRegisters({
      value,
      type: point.type,
      wordOrder,
    });

    point.wordOrder = wordOrder;
    point.value = decodeRegistersToValue({ registers, type: point.type, wordOrder });
    point.registers = registers;
    point.hex = formatRegisterHex(registers);

    this.writePointRegisters(point);

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
      if (functionCode === 0x03) {
        return this.handleReadHoldingRegisters(transactionId, unitId, pdu, socket);
      }

      if (functionCode === 0x06) {
        return this.handleWriteSingleRegister(transactionId, unitId, pdu, socket);
      }

      if (functionCode === 0x10) {
        return this.handleWriteMultipleRegisters(transactionId, unitId, pdu, socket);
      }

      this.addLog({
        client: getClientLabel(socket),
        unitId,
        functionCode: 'FC' + functionCode.toString(16).toUpperCase().padStart(2, '0'),
        action: 'unsupported function',
        address: null,
        quantity: null,
        status: 'exception 0x01',
      });

      return this.buildExceptionResponse(transactionId, unitId, functionCode, 0x01);
    } catch (error) {
      this.addLog({
        client: getClientLabel(socket),
        unitId,
        functionCode: 'FC' + functionCode.toString(16).toUpperCase().padStart(2, '0'),
        action: 'bad request',
        address: null,
        quantity: null,
        status: error.message,
      });

      return this.buildExceptionResponse(transactionId, unitId, functionCode, 0x03);
    }
  }

  handleReadHoldingRegisters(transactionId, unitId, pdu, socket) {
    if (pdu.length !== 5) {
      throw new Error('FC03 request length is invalid.');
    }

    const startAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);

    if (quantity < 1 || quantity > 125) {
      throw new Error('FC03 quantity must be between 1 and 125.');
    }

    const registers = [];

    for (let index = 0; index < quantity; index += 1) {
      const address = startAddress + index;
      const value = this.state.rawHoldingRegisters[String(address)];
      registers.push(value ?? 0);
    }

    const responsePdu = Buffer.alloc(2 + (quantity * 2));
    responsePdu.writeUInt8(0x03, 0);
    responsePdu.writeUInt8(quantity * 2, 1);

    registers.forEach((register, index) => {
      responsePdu.writeUInt16BE(register & 0xffff, 2 + (index * 2));
    });

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: 'FC03',
      action: 'read holding',
      address: startAddress,
      quantity,
      status: 'ok',
    });

    return this.buildResponse(transactionId, unitId, responsePdu);
  }

  handleWriteSingleRegister(transactionId, unitId, pdu, socket) {
    if (pdu.length !== 5) {
      throw new Error('FC06 request length is invalid.');
    }

    const address = pdu.readUInt16BE(1);
    const value = pdu.readUInt16BE(3);

    this.state.rawHoldingRegisters[String(address)] = value;
    this.syncPointsFromRawRange(address, 1);

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: 'FC06',
      action: 'write single holding',
      address,
      quantity: 1,
      status: 'ok',
    });

    return this.buildResponse(transactionId, unitId, pdu);
  }

  handleWriteMultipleRegisters(transactionId, unitId, pdu, socket) {
    if (pdu.length < 6) {
      throw new Error('FC16 request length is invalid.');
    }

    const startAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);
    const byteCount = pdu.readUInt8(5);

    if (quantity < 1 || quantity > 123) {
      throw new Error('FC16 quantity must be between 1 and 123.');
    }

    if (byteCount !== quantity * 2 || pdu.length !== 6 + byteCount) {
      throw new Error('FC16 byte count does not match quantity.');
    }

    for (let index = 0; index < quantity; index += 1) {
      const value = pdu.readUInt16BE(6 + (index * 2));
      this.state.rawHoldingRegisters[String(startAddress + index)] = value;
    }

    this.syncPointsFromRawRange(startAddress, quantity);

    const responsePdu = Buffer.alloc(5);
    responsePdu.writeUInt8(0x10, 0);
    responsePdu.writeUInt16BE(startAddress, 1);
    responsePdu.writeUInt16BE(quantity, 3);

    this.addLog({
      client: getClientLabel(socket),
      unitId,
      functionCode: 'FC16',
      action: 'write multiple holding',
      address: startAddress,
      quantity,
      status: 'ok',
    });

    return this.buildResponse(transactionId, unitId, responsePdu);
  }

  syncPointsFromRawRange(startAddress, quantity) {
    for (const point of this.state.points) {
      if (!rangesOverlap(point.address, point.registers.length, startAddress, quantity)) {
        continue;
      }

      const registers = [];

      for (let index = 0; index < point.registers.length; index += 1) {
        const rawValue = this.state.rawHoldingRegisters[String(point.address + index)];
        if (typeof rawValue !== 'number') {
          registers.length = 0;
          break;
        }

        registers.push(rawValue);
      }

      if (registers.length !== point.registers.length) {
        continue;
      }

      point.registers = registers;
      point.hex = formatRegisterHex(registers);
      point.value = decodeRegistersToValue({
        registers,
        type: point.type,
        wordOrder: point.wordOrder,
      });
    }
  }

  deletePointRegisters(point) {
    for (let index = 0; index < point.registers.length; index += 1) {
      delete this.state.rawHoldingRegisters[String(point.address + index)];
    }
  }

  writePointRegisters(point) {
    point.registers.forEach((register, index) => {
      this.state.rawHoldingRegisters[String(point.address + index)] = register;
    });
  }

  sortPoints() {
    this.state.points.sort((left, right) => left.address - right.address);
  }

  addLog(log) {
    this.state.logs.unshift({
      time: nowIso(),
      ...log,
    });
    this.state.logs = this.state.logs.slice(0, MAX_LOGS);
  }

  normalizeServerConfig(config = {}) {
    const host = String(config.host || this.state.host || '127.0.0.1').trim() || '127.0.0.1';
    const port = clampInt(config.port, 1, 65535, this.state.port || 1502);
    const unitId = clampInt(config.unitId, 0, 255, this.state.unitId || 1);

    return {
      host,
      port,
      unitId,
    };
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
};
