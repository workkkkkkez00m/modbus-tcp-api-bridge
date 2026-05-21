import { setByPath } from './bridgeJsonPath.js';

function normalizeProtocolAddress(protocolAddress) {
  const numericValue = typeof protocolAddress === 'number'
    ? protocolAddress
    : Number.parseInt(String(protocolAddress ?? '').trim(), 10);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new Error(`無效的 protocolAddress：${protocolAddress}`);
  }

  return numericValue;
}

function normalizeMappingList(mappings) {
  return Array.isArray(mappings) ? mappings : [];
}

function normalizePointList(points) {
  return Array.isArray(points) ? points : [];
}

function findPointValue(points, source = {}) {
  const normalizedPoints = normalizePointList(points);
  const regType = String(source.regType ?? '').trim();
  const protocolAddress = normalizeProtocolAddress(source.protocolAddress);
  const matchedPoint = normalizedPoints.find((point) => (
    point?.regType === regType
    && normalizeProtocolAddress(point.protocolAddress ?? point.address) === protocolAddress
  ));

  return matchedPoint?.value;
}

function toBooleanValue(value) {
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

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true' || normalizedValue === '1') {
      return true;
    }

    if (normalizedValue === 'false' || normalizedValue === '0') {
      return false;
    }
  }

  throw new Error(`無法轉為 boolean：${value}`);
}

function applyTransform(value, transform = {}, fallbackValue) {
  if (value == null) {
    return fallbackValue;
  }

  const transformType = String(transform?.type || 'raw').trim();

  try {
    switch (transformType) {
      case 'raw':
        return value;

      case 'number': {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : fallbackValue;
      }

      case 'string':
        return String(value);

      case 'boolean':
        return toBooleanValue(value);

      default:
        return value;
    }
  } catch {
    return fallbackValue;
  }
}

function createAppliedMappingRecord({ mapping, sourceValue, transformedValue, usedFallback }) {
  return {
    id: mapping.id,
    targetPath: mapping.targetPath,
    source: {
      regType: mapping.source.regType,
      protocolAddress: normalizeProtocolAddress(mapping.source.protocolAddress),
    },
    sourceValue,
    transformedValue,
    usedFallback,
  };
}

function createMissingMappingRecord({ mapping, fallbackApplied }) {
  return {
    id: mapping.id,
    targetPath: mapping.targetPath,
    source: {
      regType: mapping.source.regType,
      protocolAddress: normalizeProtocolAddress(mapping.source.protocolAddress),
    },
    fallbackApplied,
  };
}

function shouldIncludeTimestamp(includeTimestamp) {
  return includeTimestamp !== false;
}

function buildBridgePayload({ points, mappings, includeTimestamp = true } = {}) {
  const payload = {};
  const autoTimestamp = shouldIncludeTimestamp(includeTimestamp)
    ? new Date().toISOString()
    : null;
  const diagnostics = {
    appliedMappings: [],
    missingMappings: [],
    timestamp: autoTimestamp,
  };

  for (const mapping of normalizeMappingList(mappings)) {
    if (!mapping?.enabled) {
      continue;
    }

    const sourceValue = findPointValue(points, mapping.source);
    const transformedValue = applyTransform(
      sourceValue,
      mapping.transform,
      mapping.fallbackValue
    );
    const hasResolvedValue = transformedValue !== undefined;
    const usedFallback = sourceValue == null && Object.hasOwn(mapping, 'fallbackValue');

    if (sourceValue == null) {
      diagnostics.missingMappings.push(
        createMissingMappingRecord({
          mapping,
          fallbackApplied: usedFallback,
        })
      );
    }

    if (!hasResolvedValue) {
      continue;
    }

    setByPath(payload, mapping.targetPath, transformedValue);
    diagnostics.appliedMappings.push(
      createAppliedMappingRecord({
        mapping,
        sourceValue,
        transformedValue,
        usedFallback,
      })
    );
  }

  if (autoTimestamp && !Object.hasOwn(payload, 'timestamp')) {
    payload.timestamp = autoTimestamp;
  }

  return {
    payload,
    diagnostics,
  };
}

export {
  findPointValue,
  applyTransform,
  buildBridgePayload,
};
