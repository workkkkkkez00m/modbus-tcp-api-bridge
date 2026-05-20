const REFERENCE_BASE_BY_REG_TYPE = {
  coil: 1,
  discreteInput: 100001,
  inputRegister: 300001,
  holdingRegister: 400001,
};

function parseIntegerInput(inputValue) {
  const numericValue = typeof inputValue === 'number'
    ? inputValue
    : Number.parseInt(String(inputValue ?? '').trim(), 10);

  if (!Number.isFinite(numericValue) || !Number.isInteger(numericValue)) {
    throw new Error('起始位址必須是整數。');
  }

  return numericValue;
}

function getReferenceBase(regType) {
  const base = REFERENCE_BASE_BY_REG_TYPE[regType];

  if (!base) {
    throw new Error(`不支援的 Modbus 類型：${regType}`);
  }

  return base;
}

function toReferenceAddress(regType, protocolAddress) {
  const normalizedProtocolAddress = parseIntegerInput(protocolAddress);

  if (normalizedProtocolAddress < 0) {
    throw new Error('Protocol Address 不可小於 0。');
  }

  const base = getReferenceBase(regType);
  const referenceAddress = base + normalizedProtocolAddress;

  return regType === 'coil'
    ? String(referenceAddress).padStart(6, '0')
    : String(referenceAddress);
}

function parseStartAddress({ regType, inputValue, addressInputMode }) {
  const normalizedRegType = String(regType || '').trim();
  const numericValue = parseIntegerInput(inputValue);
  const mode = addressInputMode === 'protocol' ? 'protocol' : 'reference';

  getReferenceBase(normalizedRegType);

  if (mode === 'protocol') {
    if (numericValue < 0) {
      throw new Error('Protocol Address 模式的起始位址不可小於 0。');
    }

    return numericValue;
  }

  if (numericValue === 0) {
    throw new Error('Reference Address / 1-based 模式不允許起始位址為 0，請輸入 1 或完整位址，例如 100001。');
  }

  if (numericValue < 0) {
    throw new Error('Reference Address / 1-based 模式的起始位址不可小於 1。');
  }

  const referenceBase = getReferenceBase(normalizedRegType);

  if (numericValue >= referenceBase) {
    return numericValue - referenceBase;
  }

  return numericValue - 1;
}

function normalizeRequestAddressBaseMode(requestAddressBaseMode) {
  return requestAddressBaseMode === 'legacy-1-based-compatible'
    ? 'legacy-1-based-compatible'
    : 'standard-0-based';
}

function resolveRequestAddress(requestAddress, requestAddressBaseMode) {
  const normalizedRequestAddress = parseIntegerInput(requestAddress);
  const mode = normalizeRequestAddressBaseMode(requestAddressBaseMode);

  if (mode === 'legacy-1-based-compatible') {
    if (normalizedRequestAddress <= 0) {
      return 0;
    }

    return normalizedRequestAddress - 1;
  }

  return normalizedRequestAddress;
}

export {
  getReferenceBase,
  parseStartAddress,
  normalizeRequestAddressBaseMode,
  resolveRequestAddress,
  toReferenceAddress,
};
