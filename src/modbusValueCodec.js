function normalizeType(type) {
  if (type === 'short' || type === 'float') {
    return type;
  }

  throw new Error(`Unsupported Modbus value type: ${type}`);
}

function normalizeWordOrder(wordOrder) {
  if (wordOrder === 'HL' || wordOrder === 'LH') {
    return wordOrder;
  }

  throw new Error(`Unsupported Modbus word order: ${wordOrder}`);
}

function getRegisterWordCount(type) {
  const normalizedType = normalizeType(type);
  return normalizedType === 'float' ? 2 : 1;
}

function formatSingleRegisterHex(register) {
  return `0x${(register & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}

function formatRegisterHex(registers) {
  return registers.map(formatSingleRegisterHex);
}

function encodeShort(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error('Short value must be a finite number.');
  }

  const intValue = Math.trunc(numericValue);

  if (intValue < -32768 || intValue > 32767) {
    throw new Error('Short value must be between -32768 and 32767.');
  }

  return [intValue & 0xffff];
}

function decodeShort(registers) {
  if (!Array.isArray(registers) || registers.length !== 1) {
    throw new Error('Short value requires exactly one register.');
  }

  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(registers[0] & 0xffff, 0);
  return buffer.readInt16BE(0);
}

function encodeFloat(value, wordOrder) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error('Float value must be a finite number.');
  }

  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(numericValue, 0);

  const highWord = buffer.readUInt16BE(0);
  const lowWord = buffer.readUInt16BE(2);

  return wordOrder === 'LH'
    ? [lowWord, highWord]
    : [highWord, lowWord];
}

function decodeFloat(registers, wordOrder) {
  if (!Array.isArray(registers) || registers.length !== 2) {
    throw new Error('Float value requires exactly two registers.');
  }

  const [firstWord, secondWord] = registers.map((register) => register & 0xffff);
  const highWord = wordOrder === 'LH' ? secondWord : firstWord;
  const lowWord = wordOrder === 'LH' ? firstWord : secondWord;

  const buffer = Buffer.alloc(4);
  buffer.writeUInt16BE(highWord, 0);
  buffer.writeUInt16BE(lowWord, 2);

  const decoded = buffer.readFloatBE(0);
  return Number.isFinite(decoded)
    ? Number.parseFloat(decoded.toPrecision(8))
    : decoded;
}

function encodeValueToRegisters({ value, type, wordOrder = 'HL' }) {
  const normalizedType = normalizeType(type);
  const normalizedWordOrder = normalizeWordOrder(wordOrder);

  if (normalizedType === 'short') {
    return encodeShort(value);
  }

  return encodeFloat(value, normalizedWordOrder);
}

function decodeRegistersToValue({ registers, type, wordOrder = 'HL' }) {
  const normalizedType = normalizeType(type);
  const normalizedWordOrder = normalizeWordOrder(wordOrder);

  if (normalizedType === 'short') {
    return decodeShort(registers);
  }

  return decodeFloat(registers, normalizedWordOrder);
}

export {
  decodeRegistersToValue,
  encodeValueToRegisters,
  formatRegisterHex,
  getRegisterWordCount,
};
