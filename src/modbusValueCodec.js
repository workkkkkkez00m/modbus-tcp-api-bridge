const TYPE_META = {
  short: { wordCount: 1 },
  int: { wordCount: 2 },
  long: { wordCount: 4 },
  float: { wordCount: 2 },
  double: { wordCount: 4 },
  binary: { wordCount: 1 },
};

const INT64_MIN = -(2n ** 63n);
const INT64_MAX = (2n ** 63n) - 1n;

function normalizeType(type) {
  if (Object.hasOwn(TYPE_META, type)) {
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
  return TYPE_META[normalizeType(type)].wordCount;
}

function formatSingleRegisterHex(register) {
  return `0x${(register & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}

function formatRegisterHex(registers) {
  return registers.map(formatSingleRegisterHex);
}

function getOrderedWordsFromBuffer(buffer, wordOrder) {
  const words = [];

  for (let offset = 0; offset < buffer.length; offset += 2) {
    words.push(buffer.readUInt16BE(offset));
  }

  return wordOrder === 'LH' && words.length > 1
    ? [...words].reverse()
    : words;
}

function getBufferFromOrderedWords(registers, wordOrder) {
  const orderedWords = wordOrder === 'LH' && registers.length > 1
    ? [...registers].reverse()
    : [...registers];

  const buffer = Buffer.alloc(orderedWords.length * 2);
  orderedWords.forEach((register, index) => {
    buffer.writeUInt16BE(register & 0xffff, index * 2);
  });
  return buffer;
}

function toFiniteInteger(value, label) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return Math.trunc(numericValue);
}

function toBinaryNumber(value) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Binary value must be 0 or 1.');
    }

    const intValue = Math.trunc(value);
    if (intValue === 0 || intValue === 1) {
      return intValue;
    }

    throw new Error('Binary value must be 0 or 1.');
  }

  const text = String(value).trim().toLowerCase();
  if (text === '0' || text === 'false') {
    return 0;
  }

  if (text === '1' || text === 'true') {
    return 1;
  }

  throw new Error('Binary value must be 0/1 or true/false.');
}

function toBigIntValue(value) {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error('Long value must be an integer.');
    }

    if (!Number.isSafeInteger(value)) {
      throw new Error('Long value exceeds the JavaScript safe integer range. Please use a string.');
    }

    return BigInt(value);
  }

  const text = String(value).trim();
  if (!/^[-+]?\d+$/.test(text)) {
    throw new Error('Long value must be an integer string.');
  }

  return BigInt(text);
}

function encodeShort(value) {
  const intValue = toFiniteInteger(value, 'Short value');

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

function encodeInt(value, wordOrder) {
  const intValue = toFiniteInteger(value, 'Int value');

  if (intValue < -2147483648 || intValue > 2147483647) {
    throw new Error('Int value must be between -2147483648 and 2147483647.');
  }

  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(intValue, 0);
  return getOrderedWordsFromBuffer(buffer, wordOrder);
}

function decodeInt(registers, wordOrder) {
  if (!Array.isArray(registers) || registers.length !== 2) {
    throw new Error('Int value requires exactly two registers.');
  }

  const buffer = getBufferFromOrderedWords(registers, wordOrder);
  return buffer.readInt32BE(0);
}

function encodeLong(value, wordOrder) {
  const bigIntValue = toBigIntValue(value);

  if (bigIntValue < INT64_MIN || bigIntValue > INT64_MAX) {
    throw new Error('Long value must fit in signed 64-bit range.');
  }

  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(bigIntValue, 0);
  return getOrderedWordsFromBuffer(buffer, wordOrder);
}

function decodeLong(registers, wordOrder) {
  if (!Array.isArray(registers) || registers.length !== 4) {
    throw new Error('Long value requires exactly four registers.');
  }

  const buffer = getBufferFromOrderedWords(registers, wordOrder);
  return buffer.readBigInt64BE(0).toString();
}

function encodeFloat(value, wordOrder) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error('Float value must be a finite number.');
  }

  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(numericValue, 0);
  return getOrderedWordsFromBuffer(buffer, wordOrder);
}

function decodeFloat(registers, wordOrder) {
  if (!Array.isArray(registers) || registers.length !== 2) {
    throw new Error('Float value requires exactly two registers.');
  }

  const buffer = getBufferFromOrderedWords(registers, wordOrder);
  const decoded = buffer.readFloatBE(0);
  return Number.isFinite(decoded)
    ? Number.parseFloat(decoded.toPrecision(8))
    : decoded;
}

function encodeDouble(value, wordOrder) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error('Double value must be a finite number.');
  }

  const buffer = Buffer.alloc(8);
  buffer.writeDoubleBE(numericValue, 0);
  return getOrderedWordsFromBuffer(buffer, wordOrder);
}

function decodeDouble(registers, wordOrder) {
  if (!Array.isArray(registers) || registers.length !== 4) {
    throw new Error('Double value requires exactly four registers.');
  }

  const buffer = getBufferFromOrderedWords(registers, wordOrder);
  return buffer.readDoubleBE(0);
}

function encodeBinary(value) {
  return [toBinaryNumber(value)];
}

function decodeBinary(registers) {
  if (!Array.isArray(registers) || registers.length !== 1) {
    throw new Error('Binary value requires exactly one register.');
  }

  return registers[0] ? 1 : 0;
}

function encodeValueToRegisters({ value, type, wordOrder = 'HL' }) {
  const normalizedType = normalizeType(type);
  const normalizedWordOrder = normalizeWordOrder(wordOrder);

  switch (normalizedType) {
    case 'short':
      return encodeShort(value);
    case 'int':
      return encodeInt(value, normalizedWordOrder);
    case 'long':
      return encodeLong(value, normalizedWordOrder);
    case 'float':
      return encodeFloat(value, normalizedWordOrder);
    case 'double':
      return encodeDouble(value, normalizedWordOrder);
    case 'binary':
      return encodeBinary(value);
    default:
      throw new Error(`Unsupported Modbus value type: ${normalizedType}`);
  }
}

function decodeRegistersToValue({ registers, type, wordOrder = 'HL' }) {
  const normalizedType = normalizeType(type);
  const normalizedWordOrder = normalizeWordOrder(wordOrder);

  switch (normalizedType) {
    case 'short':
      return decodeShort(registers);
    case 'int':
      return decodeInt(registers, normalizedWordOrder);
    case 'long':
      return decodeLong(registers, normalizedWordOrder);
    case 'float':
      return decodeFloat(registers, normalizedWordOrder);
    case 'double':
      return decodeDouble(registers, normalizedWordOrder);
    case 'binary':
      return decodeBinary(registers);
    default:
      throw new Error(`Unsupported Modbus value type: ${normalizedType}`);
  }
}

export {
  decodeRegistersToValue,
  encodeValueToRegisters,
  formatRegisterHex,
  getRegisterWordCount,
};
