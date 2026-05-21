import fs from 'node:fs';
import path from 'node:path';

const BRIDGE_PRESET_FILE_NAME = 'bridge-mapping-presets.json';
const BRIDGE_PRESET_STORE_VERSION = 1;

function cloneJsonValue(value) {
  if (value == null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function getBridgePresetFilePath(app) {
  return path.join(app.getPath('userData'), BRIDGE_PRESET_FILE_NAME);
}

function createEmptyBridgePresetStore() {
  return {
    version: BRIDGE_PRESET_STORE_VERSION,
    presets: [],
  };
}

function normalizePresetId(value) {
  return String(value ?? '').trim();
}

function normalizePresetName(value) {
  const presetName = String(value ?? '').trim();

  if (!presetName) {
    throw new Error('Preset 名稱不可空白。');
  }

  return presetName;
}

function normalizePresetDescription(value) {
  return String(value ?? '').trim();
}

function normalizeProtocolAddress(value, index) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`第 ${index + 1} 筆 Mapping 的 source.protocolAddress 必須是 0 以上整數。`);
  }

  return parsed;
}

function normalizePresetMappings(mappings) {
  if (!Array.isArray(mappings)) {
    throw new Error('Preset 的 mappings 必須是陣列。');
  }

  return mappings.map((mapping, index) => {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      throw new Error(`第 ${index + 1} 筆 Mapping 格式錯誤。`);
    }

    const targetPath = String(mapping.targetPath ?? '').trim();
    if (!targetPath) {
      throw new Error(`第 ${index + 1} 筆 Mapping 的 targetPath 不可空白。`);
    }

    const regType = String(mapping.source?.regType ?? '').trim();
    if (!regType) {
      throw new Error(`第 ${index + 1} 筆 Mapping 的 source.regType 不可空白。`);
    }

    return {
      ...cloneJsonValue(mapping),
      targetPath,
      source: {
        ...(cloneJsonValue(mapping.source) || {}),
        regType,
        protocolAddress: normalizeProtocolAddress(mapping.source?.protocolAddress, index),
      },
    };
  });
}

function toIsoTimestamp(value, fallbackValue) {
  const text = String(value ?? '').trim();
  if (!text) {
    return fallbackValue;
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? fallbackValue : new Date(timestamp).toISOString();
}

function createUserPresetId(name, existingIds) {
  const normalizedBase = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  const baseId = normalizedBase ? `user-${normalizedBase}` : 'user-preset';
  let nextId = baseId;
  let suffix = 2;

  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return nextId;
}

function normalizeStoredUserPreset(rawPreset, index) {
  const fallbackTimestamp = new Date().toISOString();
  const name = normalizePresetName(rawPreset?.name);
  const description = normalizePresetDescription(rawPreset?.description);
  const mappings = normalizePresetMappings(rawPreset?.mappings);
  const createdAt = toIsoTimestamp(rawPreset?.createdAt, fallbackTimestamp);
  const updatedAt = toIsoTimestamp(rawPreset?.updatedAt, createdAt);

  return {
    id: normalizePresetId(rawPreset?.id) || `user-imported-${index + 1}`,
    name,
    description,
    createdAt,
    updatedAt,
    mappings,
  };
}

function readBridgePresetStore(app) {
  const filePath = getBridgePresetFilePath(app);
  if (!fs.existsSync(filePath)) {
    return createEmptyBridgePresetStore();
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Bridge preset 檔案讀取失敗：${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Bridge preset 檔案格式錯誤，根節點必須是物件。');
  }

  const normalizedPresets = [];
  const rawPresets = Array.isArray(parsed.presets) ? parsed.presets : [];
  rawPresets.forEach((preset, index) => {
    try {
      normalizedPresets.push(normalizeStoredUserPreset(preset, index));
    } catch (error) {
      console.warn(`Skip invalid bridge preset at index ${index}:`, error);
    }
  });

  return {
    version: BRIDGE_PRESET_STORE_VERSION,
    presets: normalizedPresets,
  };
}

function writeBridgePresetStore(app, store) {
  const filePath = getBridgePresetFilePath(app);
  const folderPath = path.dirname(filePath);

  fs.mkdirSync(folderPath, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');

  return filePath;
}

function getBridgeUserPresets(app) {
  return cloneJsonValue(readBridgePresetStore(app).presets);
}

function saveUserBridgePreset(app, inputPreset) {
  const store = readBridgePresetStore(app);
  const existingPresets = store.presets;
  const inputId = normalizePresetId(inputPreset?.id);
  const presetName = normalizePresetName(inputPreset?.name);
  const description = normalizePresetDescription(inputPreset?.description);
  const mappings = normalizePresetMappings(inputPreset?.mappings);

  const matchedPresetById = inputId
    ? existingPresets.find((preset) => preset.id === inputId) || null
    : null;
  const matchedPresetByName = matchedPresetById
    ? null
    : existingPresets.find((preset) => preset.name === presetName) || null;
  const matchedPreset = matchedPresetById || matchedPresetByName;

  const now = new Date().toISOString();
  const reservedIds = new Set(
    existingPresets
      .filter((preset) => preset.id !== matchedPreset?.id)
      .map((preset) => preset.id)
  );
  const nextPreset = {
    id: matchedPreset?.id || inputId || createUserPresetId(presetName, reservedIds),
    name: presetName,
    description,
    createdAt: matchedPreset?.createdAt || now,
    updatedAt: now,
    mappings,
  };

  const nextPresets = matchedPreset
    ? existingPresets.map((preset) => (preset.id === matchedPreset.id ? nextPreset : preset))
    : [...existingPresets, nextPreset];

  const filePath = writeBridgePresetStore(app, {
    version: BRIDGE_PRESET_STORE_VERSION,
    presets: nextPresets,
  });

  return {
    filePath,
    preset: cloneJsonValue(nextPreset),
    userPresets: cloneJsonValue(nextPresets),
  };
}

function deleteUserBridgePreset(app, presetId) {
  const normalizedPresetId = normalizePresetId(presetId);
  if (!normalizedPresetId) {
    throw new Error('Preset ID 不可空白。');
  }

  const store = readBridgePresetStore(app);
  const nextPresets = store.presets.filter((preset) => preset.id !== normalizedPresetId);

  if (nextPresets.length === store.presets.length) {
    throw new Error('找不到可刪除的使用者 Preset。');
  }

  const filePath = writeBridgePresetStore(app, {
    version: BRIDGE_PRESET_STORE_VERSION,
    presets: nextPresets,
  });

  return {
    filePath,
    deletedPresetId: normalizedPresetId,
    userPresets: cloneJsonValue(nextPresets),
  };
}

export {
  BRIDGE_PRESET_FILE_NAME,
  getBridgePresetFilePath,
  getBridgeUserPresets,
  saveUserBridgePreset,
  deleteUserBridgePreset,
};
