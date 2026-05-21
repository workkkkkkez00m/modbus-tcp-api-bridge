import './index.css';
import { bridgeDefaultPresets } from './bridgeDefaultConfig.js';
import { toReferenceAddress } from './modbusAddress.js';

const MODE_STORAGE_KEY = 'bms-protocol-mock-lab.activeMode';
const API_RESPONSE_SOURCE_MODE_STORAGE_KEY = 'bms-protocol-mock-lab.apiResponseSourceMode';
const SUPPORTED_MODES = ['api', 'modbus', 'bridge'];
const SUPPORTED_API_RESPONSE_SOURCE_MODES = ['manual', 'bridge'];

const MODBUS_REG_TYPES = {
  coil: {
    label: '線圈 Coil 0x',
    supportedTypes: ['binary'],
    defaultType: 'binary',
    displayBase: 1,
  },
  discreteInput: {
    label: '離散輸入 Discrete Input 1x',
    supportedTypes: ['binary'],
    defaultType: 'binary',
    displayBase: 10001,
  },
  inputRegister: {
    label: '輸入暫存器 Input Register 3x',
    supportedTypes: ['short', 'int', 'long', 'float', 'double', 'binary'],
    defaultType: 'short',
    displayBase: 30001,
  },
  holdingRegister: {
    label: '保持暫存器 Holding Register 4x',
    supportedTypes: ['short', 'int', 'long', 'float', 'double', 'binary'],
    defaultType: 'short',
    displayBase: 40001,
  },
};

const MODBUS_TYPE_LABELS = {
  short: 'short',
  int: 'int',
  long: 'long',
  float: 'float',
  double: 'double',
  binary: 'binary',
};

const MODBUS_TYPE_WORD_COUNT = {
  short: 1,
  int: 2,
  long: 4,
  float: 2,
  double: 4,
  binary: 1,
};

const MODBUS_ACTION_LABELS = {
  manual: '手動 manual',
  random: '隨機 random',
  increment: '遞增 increment',
  toggle: '切換 toggle',
  sine: '波動 sine',
};

const API_EMPTY_LOG_ROW = `
  <tr>
    <td colspan="5" class="empty">目前沒有 API Request Log。</td>
  </tr>
`;

const MODBUS_EMPTY_POINT_ROW = `
  <tr>
    <td colspan="11" class="empty">目前尚未建立 Modbus 點位。</td>
  </tr>
`;

const MODBUS_EMPTY_LOG_ROW = `
  <tr>
    <td colspan="15" class="empty">目前沒有 Modbus Request Log。</td>
  </tr>
`;

const BRIDGE_EMPTY_MAPPING_ROW = `
  <tr>
    <td colspan="7" class="empty">目前沒有 Mapping，請先新增或載入 Preset。</td>
  </tr>
`;

const BRIDGE_TRANSFORM_TYPES = [
  { value: 'raw', label: 'raw' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
  { value: 'string', label: 'string' },
];

const DEFAULT_BRIDGE_PRESET_ID = bridgeDefaultPresets[0]?.id ?? '';
const DEFAULT_BRIDGE_PRESET_OPTION_VALUE = '';

const apiElements = {
  hostInput: document.querySelector('#hostInput'),
  portInput: document.querySelector('#portInput'),
  pathInput: document.querySelector('#pathInput'),
  delayInput: document.querySelector('#delayInput'),
  scenarioSelect: document.querySelector('#scenarioSelect'),
  responseSourceSelect: document.querySelector('#apiResponseSourceSelect'),
  startButton: document.querySelector('#startButton'),
  stopButton: document.querySelector('#stopButton'),
  restartButton: document.querySelector('#restartButton'),
  clearLogsButton: document.querySelector('#clearLogsButton'),
  serverBadge: document.querySelector('#serverBadge'),
  modbusStatusBadge: document.querySelector('#modbusStatusBadge'),
  bridgeStatusBadge: document.querySelector('#bridgeStatusBadge'),
  currentUrl: document.querySelector('#currentUrl'),
  payloadEditor: document.querySelector('#payloadEditor'),
  payloadValidation: document.querySelector('#payloadValidation'),
  useEditedPayloadButton: document.querySelector('#useEditedPayloadButton'),
  formatJsonButton: document.querySelector('#formatJsonButton'),
  resetPayloadButton: document.querySelector('#resetPayloadButton'),
  messageBox: document.querySelector('#messageBox'),
  logTableBody: document.querySelector('#logTableBody'),
  copiedCommand: document.querySelector('#copiedCommand'),
};

const modbusElements = {
  hostInput: document.querySelector('#modbusHostInput'),
  portInput: document.querySelector('#modbusPortInput'),
  unitIdInput: document.querySelector('#modbusUnitIdInput'),
  requestAddressBaseModeSelect: document.querySelector('#modbusRequestAddressBaseModeSelect'),
  feedbackMappingModeSelect: document.querySelector('#modbusFeedbackMappingModeSelect'),
  undefinedBooleanModeSelect: document.querySelector('#modbusPanel #modbusUndefinedBooleanModeSelect'),
  startButton: document.querySelector('#modbusStartButton'),
  stopButton: document.querySelector('#modbusStopButton'),
  restartButton: document.querySelector('#modbusRestartButton'),
  statusBadge: document.querySelector('#modbusServerStatus'),
  endpoint: document.querySelector('#modbusEndpoint'),
  unitIdText: document.querySelector('#modbusCurrentUnitId'),
  messageBox: document.querySelector('#modbusMessageBox'),
  registerTypeSelect: document.querySelector('#modbusRegisterType'),
  startAddressInput: document.querySelector('#modbusStartAddressInput'),
  addressInputModeSelect: document.querySelector('#modbusAddressInputModeSelect'),
  countInput: document.querySelector('#modbusCountInput'),
  typeSelect: document.querySelector('#modbusValueType'),
  wordOrderSelect: document.querySelector('#modbusWordOrder'),
  initialValueInput: document.querySelector('#modbusInitialValueInput'),
  actionSelect: document.querySelector('#modbusAction'),
  actionConfigInput: document.querySelector('#modbusActionConfigInput'),
  generateButton: document.querySelector('#generateRegistersButton'),
  pointTableBody: document.querySelector('#modbusPointTableBody'),
  logTableBody: document.querySelector('#modbusLogTableBody'),
  clearLogsButton: document.querySelector('#clearModbusLogsButton'),
  generatorHint: document.querySelector('#modbusGeneratorHint'),
};

const bridgeElements = {
  previewModeText: document.querySelector('#bridgePreviewModeText'),
  messageBox: document.querySelector('#bridgeMessageBox'),
  mappingTableBody: document.querySelector('#bridgeMappingTableBody'),
  reloadMappingsButton: document.querySelector('#bridgeReloadMappingsButton'),
  loadMappingsButton: document.querySelector('#bridgeLoadMappingsButton'),
  presetSelect: null,
  presetNameInput: null,
  newPresetButton: null,
  savePresetButton: null,
  deletePresetButton: null,
  addMappingButton: document.querySelector('#bridgeAddMappingButton'),
  saveMappingsButton: document.querySelector('#bridgeSaveMappingsButton'),
  previewButton: document.querySelector('#bridgePreviewButton'),
  payloadPreview: document.querySelector('#bridgePayloadPreview'),
  diagnosticsPreview: document.querySelector('#bridgeDiagnosticsPreview'),
  diagnosticsSummary: document.querySelector('#bridgeDiagnosticsSummary'),
};

const modbusPointDrafts = new Map();
const bridgePresetState = {
  defaultPresets: bridgeDefaultPresets.map((preset) => ({
    id: String(preset.id ?? '').trim(),
    name: String(preset.label ?? preset.name ?? preset.id ?? '').trim(),
    description: String(preset.description ?? '').trim(),
    mappings: cloneBridgePresetMappings(preset.mappings),
    scope: 'default',
  })),
  userPresets: [],
};
let bridgeMappingRowSeed = 0;

function ensureModbusUndefinedBooleanModeField() {
  const buttonRow = document.querySelector('#modbusPanel .button-row');
  if (!buttonRow) {
    return document.querySelector('#modbusPanel #modbusUndefinedBooleanModeSelect');
  }

  const misplacedSelects = document.querySelectorAll('#apiPanel #modbusUndefinedBooleanModeSelect, #apiPanel #unusedModbusUndefinedBooleanModeSelect');
  misplacedSelects.forEach((select) => {
    const label = select.closest('label');
    if (label) {
      label.hidden = true;
    }

    const helpText = label?.nextElementSibling;
    if (helpText?.classList.contains('help-text')) {
      helpText.hidden = true;
    }
  });

  let select = document.querySelector('#modbusPanel #modbusUndefinedBooleanModeSelect');
  if (select) {
    return select;
  }

  const label = document.createElement('label');
  label.className = 'full stacked-field';

  const labelText = document.createElement('span');
  labelText.className = 'label-text';
  labelText.textContent = '未建立布林位址處理模式';
  const indicator = document.createElement('span');
  indicator.className = 'tooltip-indicator has-tooltip';
  indicator.textContent = '?';
  indicator.dataset.tooltip = '若 BMS 一次讀取較大範圍，且範圍內包含未建立的 Coil / Discrete Input，可使用 Compatibility 模式避免整段讀取失敗。';
  indicator.setAttribute('tabindex', '0');
  indicator.setAttribute('aria-label', '未建立布林位址處理模式提示');
  labelText.appendChild(indicator);

  select = document.createElement('select');
  select.id = 'modbusUndefinedBooleanModeSelect';
  select.innerHTML = `
    <option value="compatibility-false" selected>Compatibility：未建立位址回 false / 0</option>
    <option value="strict">Strict：未建立位址回 exception</option>
  `;
  label.append(labelText, '\n', select);
  buttonRow.before(label);

  return select;
}

function ensureModbusFeedbackMappingModeField() {
  const buttonRow = document.querySelector('#modbusPanel .button-row');
  if (!buttonRow) {
    return document.querySelector('#modbusPanel #modbusFeedbackMappingModeSelect');
  }

  let select = document.querySelector('#modbusPanel #modbusFeedbackMappingModeSelect');
  if (select) {
    return select;
  }

  const label = document.createElement('label');
  label.className = 'full stacked-field';

  const labelText = document.createElement('span');
  labelText.className = 'label-text';
  labelText.textContent = '控制回饋映射模式 Feedback Mapping Mode';
  const indicator = document.createElement('span');
  indicator.className = 'tooltip-indicator has-tooltip';
  indicator.textContent = '?';
  indicator.dataset.tooltip = '啟用後，外部 BMS 寫入 Coil 控制點時，mock server 會自動更新同 offset 的 Discrete Input，模擬 PLC / DDC 狀態回饋。';
  indicator.setAttribute('tabindex', '0');
  indicator.setAttribute('aria-label', '控制回饋映射模式提示');
  labelText.appendChild(indicator);

  select = document.createElement('select');
  select.id = 'modbusFeedbackMappingModeSelect';
  select.innerHTML = `
    <option value="disabled" selected>Disabled：不自動回饋</option>
    <option value="coil-to-discrete-same-address">Coil write → Discrete Input same address</option>
  `;
  label.append(labelText, '\n', select);
  buttonRow.before(label);

  return select;
}

function cloneBridgePresetMappings(mappings) {
  return JSON.parse(JSON.stringify(Array.isArray(mappings) ? mappings : []));
}

function normalizeBridgePresetForUi(preset, scope = 'user') {
  return {
    id: String(preset?.id ?? '').trim(),
    name: String(preset?.name ?? preset?.label ?? preset?.id ?? '').trim(),
    description: String(preset?.description ?? '').trim(),
    mappings: cloneBridgePresetMappings(preset?.mappings),
    createdAt: String(preset?.createdAt ?? '').trim(),
    updatedAt: String(preset?.updatedAt ?? '').trim(),
    scope,
  };
}

function setBridgeUserPresets(userPresets) {
  bridgePresetState.userPresets = Array.isArray(userPresets)
    ? userPresets.map((preset) => normalizeBridgePresetForUi(preset, 'user'))
    : [];
}

function setBridgeDefaultPresets(defaultPresets) {
  if (!Array.isArray(defaultPresets) || !defaultPresets.length) {
    return;
  }

  bridgePresetState.defaultPresets = defaultPresets
    .map((preset) => normalizeBridgePresetForUi(preset, 'default'))
    .filter((preset) => preset.id && preset.name);
}

function getAllBridgePresets() {
  return [...bridgePresetState.defaultPresets, ...bridgePresetState.userPresets];
}

function getBridgePresetById(presetId) {
  const normalizedPresetId = String(presetId ?? '').trim();
  if (!normalizedPresetId) {
    return null;
  }

  return getAllBridgePresets().find((preset) => preset.id === normalizedPresetId) || null;
}

function getBridgePresetDisplayLabel(preset) {
  return `${preset.scope === 'default' ? 'Default' : 'User'}：${preset.name}`;
}

function renderBridgePresetSelectOptions(select, selectedValue) {
  const normalizedSelectedValue = getBridgePresetById(selectedValue)
    ? selectedValue
    : (selectedValue === DEFAULT_BRIDGE_PRESET_OPTION_VALUE
      ? DEFAULT_BRIDGE_PRESET_OPTION_VALUE
      : DEFAULT_BRIDGE_PRESET_ID);

  const buildOptionHtml = (preset) => `
    <option value="${escapeHtml(preset.id)}" ${preset.id === normalizedSelectedValue ? 'selected' : ''}>
      ${escapeHtml(getBridgePresetDisplayLabel(preset))}
    </option>
  `;

  const defaultOptions = bridgePresetState.defaultPresets.map(buildOptionHtml).join('');
  const userOptions = bridgePresetState.userPresets.length
    ? bridgePresetState.userPresets.map(buildOptionHtml).join('')
    : '<option value="__bridge-user-empty__" disabled>尚無使用者 Preset</option>';

  select.innerHTML = `
    <option value="${DEFAULT_BRIDGE_PRESET_OPTION_VALUE}" ${normalizedSelectedValue === DEFAULT_BRIDGE_PRESET_OPTION_VALUE ? 'selected' : ''}>
      新增使用者自訂
    </option>
    <optgroup label="Default Presets">
      ${defaultOptions}
    </optgroup>
    <optgroup label="User Presets">
      ${userOptions}
    </optgroup>
  `;
}

function ensureBridgePresetControls() {
  const buttonRow = document.querySelector('#bridgePanel .button-row');
  if (!buttonRow) {
    bridgeElements.presetSelect = document.querySelector('#bridgePresetSelect');
    bridgeElements.presetNameInput = document.querySelector('#bridgePresetNameInput');
    bridgeElements.newPresetButton = document.querySelector('#bridgeNewPresetButton');
    bridgeElements.savePresetButton = document.querySelector('#bridgeSavePresetButton');
    bridgeElements.deletePresetButton = document.querySelector('#bridgeDeletePresetButton');
    return;
  }

  if (bridgeElements.loadMappingsButton) {
    bridgeElements.loadMappingsButton.textContent = '載入';
  }

  let controlRow = document.querySelector('#bridgePresetControlRow');
  if (!controlRow) {
    controlRow = document.createElement('div');
    controlRow.id = 'bridgePresetControlRow';
    controlRow.className = 'button-row bridge-preset-row';

    const presetLabel = document.createElement('label');
    presetLabel.className = 'stacked-field';

    const presetLabelText = document.createElement('span');
    presetLabelText.className = 'label-text';
    presetLabelText.textContent = '自訂Mapping選擇';

    const presetSelect = document.createElement('select');
    presetSelect.id = 'bridgePresetSelect';
    presetLabel.append(presetLabelText, '\n', presetSelect);

    const nameLabel = document.createElement('label');
    nameLabel.className = 'stacked-field';

    const nameLabelText = document.createElement('span');
    nameLabelText.className = 'label-text';
    nameLabelText.textContent = '自訂名稱';

    const nameInput = document.createElement('input');
    nameInput.id = 'bridgePresetNameInput';
    nameInput.placeholder = '例如：Energy Meter Test';
    nameLabel.append(nameLabelText, '\n', nameInput);

    const newPresetButton = document.createElement('button');
    newPresetButton.type = 'button';
    newPresetButton.id = 'bridgeNewPresetButton';
    newPresetButton.className = 'bridge-preset-new';
    newPresetButton.textContent = '新增自訂';

    const savePresetButton = document.createElement('button');
    savePresetButton.type = 'button';
    savePresetButton.id = 'bridgeSavePresetButton';
    savePresetButton.className = 'bridge-preset-save';
    savePresetButton.textContent = '儲存目前 Mapping 為自訂';

    const deletePresetButton = document.createElement('button');
    deletePresetButton.type = 'button';
    deletePresetButton.id = 'bridgeDeletePresetButton';
    deletePresetButton.className = 'bridge-preset-delete';
    deletePresetButton.textContent = '刪除使用者自訂';

    controlRow.append(
      presetLabel,
      nameLabel,
      newPresetButton,
      savePresetButton,
      deletePresetButton
    );
    buttonRow.before(controlRow);
  }

  bridgeElements.presetSelect = document.querySelector('#bridgePresetSelect');
  bridgeElements.presetNameInput = document.querySelector('#bridgePresetNameInput');
  bridgeElements.newPresetButton = document.querySelector('#bridgeNewPresetButton');
  bridgeElements.savePresetButton = document.querySelector('#bridgeSavePresetButton');
  bridgeElements.deletePresetButton = document.querySelector('#bridgeDeletePresetButton');

  renderBridgePresetSelectOptions(bridgeElements.presetSelect, DEFAULT_BRIDGE_PRESET_ID);
}

function selectBridgePreset(presetId, options = {}) {
  if (!bridgeElements.presetSelect || !bridgeElements.presetNameInput) {
    return;
  }

  const { preserveNameInput = false } = options;
  const normalizedPresetId = getBridgePresetById(presetId)
    ? presetId
    : DEFAULT_BRIDGE_PRESET_OPTION_VALUE;

  renderBridgePresetSelectOptions(bridgeElements.presetSelect, normalizedPresetId);

  const preset = getBridgePresetById(normalizedPresetId);
  if (!preserveNameInput) {
    bridgeElements.presetNameInput.value = preset?.name || '';
  }

  if (bridgeElements.deletePresetButton) {
    bridgeElements.deletePresetButton.disabled = preset?.scope !== 'user';
  }
}

function createNewBridgePresetDraft() {
  selectBridgePreset(DEFAULT_BRIDGE_PRESET_OPTION_VALUE);
  setBridgePreviewModeText('目前為新增使用者 Preset 模式；輸入名稱後可將目前表格儲存為新 preset。');
}

function readIntOrFallback(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setPanelMessage(element, message, type = 'info') {
  element.textContent = message;
  element.className = `message ${type}`;
}

function renderStaticSelectOptions(select, options, currentValue) {
  select.innerHTML = options.map((option) => `
    <option value="${escapeHtml(option.value)}" ${option.value === currentValue ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}>
      ${escapeHtml(option.label)}
    </option>
  `).join('');
}

function getApiConfigFromForm() {
  return {
    host: apiElements.hostInput.value.trim() || '127.0.0.1',
    port: readIntOrFallback(apiElements.portInput.value, 3101),
    path: apiElements.pathInput.value.trim() || '/api/energy',
    delayMs: readIntOrFallback(apiElements.delayInput.value, 0),
    scenario: apiElements.scenarioSelect.value,
  };
}

function getSafeApiResponseSourceMode(value) {
  return SUPPORTED_API_RESPONSE_SOURCE_MODES.includes(value) ? value : 'manual';
}

function renderBridgeResponseSourceBadge(mode) {
  if (!apiElements.bridgeStatusBadge) {
    return;
  }

  const safeMode = getSafeApiResponseSourceMode(mode);
  const isBridgeEnabled = safeMode === 'bridge';

  apiElements.bridgeStatusBadge.textContent = isBridgeEnabled ? 'Bridge 啟用' : 'Bridge 未啟用';
  apiElements.bridgeStatusBadge.className = isBridgeEnabled
    ? 'badge status-badge badge-running'
    : 'badge status-badge badge-stopped';
}

function syncApiResponseSourceModeUi(value) {
  if (!apiElements.responseSourceSelect) {
    return 'manual';
  }

  const safeMode = getSafeApiResponseSourceMode(value);
  apiElements.responseSourceSelect.value = safeMode;
  return safeMode;
}

function persistApiResponseSourceMode(value) {
  const safeMode = syncApiResponseSourceModeUi(value);
  localStorage.setItem(API_RESPONSE_SOURCE_MODE_STORAGE_KEY, safeMode);
  renderBridgeResponseSourceBadge(safeMode);
  return safeMode;
}

async function setApiResponseSourceMode(value) {
  const safeMode = getSafeApiResponseSourceMode(value);
  const nextMode = await window.mockMeterApi.setResponseSourceMode(safeMode);
  return persistApiResponseSourceMode(nextMode);
}

async function initApiResponseSourceMode() {
  const savedMode = localStorage.getItem(API_RESPONSE_SOURCE_MODE_STORAGE_KEY);

  if (savedMode !== null) {
    await setApiResponseSourceMode(savedMode);
    return;
  }

  const mode = await window.mockMeterApi.getResponseSourceMode();
  persistApiResponseSourceMode(mode);
}

function getModbusConfigFromForm() {
  return {
    host: modbusElements.hostInput.value.trim() || '127.0.0.1',
    port: readIntOrFallback(modbusElements.portInput.value, 1502),
    unitId: readIntOrFallback(modbusElements.unitIdInput.value, 1),
    requestAddressBaseMode: modbusElements.requestAddressBaseModeSelect?.value || 'standard-0-based',
    feedbackMappingMode: modbusElements.feedbackMappingModeSelect?.value || 'disabled',
    undefinedBooleanMode: modbusElements.undefinedBooleanModeSelect?.value || 'compatibility-false',
  };
}

function getRegisterGeneratorConfigFromForm() {
  return {
    regType: modbusElements.registerTypeSelect.value,
    startAddress: readIntOrFallback(modbusElements.startAddressInput.value, 1),
    addressInputMode: modbusElements.addressInputModeSelect?.value || 'reference',
    count: readIntOrFallback(modbusElements.countInput.value, 1),
    type: modbusElements.typeSelect.value,
    wordOrder: modbusElements.wordOrderSelect.value,
    initialValue: modbusElements.initialValueInput.value.trim(),
    action: modbusElements.actionSelect.value,
    actionConfig: modbusElements.actionConfigInput.value.trim(),
  };
}

function createExamplePayload() {
  const payload = {
    office: {
      power: 100.3,
      today: 1150.3,
      month: 30139.5,
    },
    residential: {
      power: 150.2,
      today: 2100.5,
      month: 55100.7,
    },
    total: {
      power: 250.5,
      today: 3250.8,
      month: 85240.2,
    },
    timestamp: new Date().toISOString(),
  };

  if (apiElements.scenarioSelect.value === 'no-total') {
    delete payload.total;
  }

  if (apiElements.scenarioSelect.value === 'invalid-schema') {
    payload.office.power = 'bad-value';
    delete payload.office.month;
  }

  return payload;
}

function formatJsonPreview(value) {
  return JSON.stringify(value, null, 2);
}

function buildSelectOptionsHtml(options, currentValue) {
  return options.map((option) => `
    <option value="${escapeHtml(option.value)}" ${option.value === currentValue ? 'selected' : ''}>
      ${escapeHtml(option.label)}
    </option>
  `).join('');
}

function nextBridgeMappingIds(mappingId) {
  bridgeMappingRowSeed += 1;

  return {
    rowId: `bridge-row-${bridgeMappingRowSeed}`,
    mappingId: mappingId || `bridge-mapping-${bridgeMappingRowSeed}`,
  };
}

function hasBridgeFallbackValue(mapping) {
  return Boolean(mapping && Object.hasOwn(mapping, 'fallbackValue'));
}

function formatBridgeFallbackValue(value, hasFallback = true) {
  if (!hasFallback) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function createBridgeMappingDraft(mapping = {}) {
  const ids = nextBridgeMappingIds(String(mapping.id ?? '').trim());

  return {
    rowId: ids.rowId,
    mappingId: ids.mappingId,
    enabled: mapping.enabled !== false,
    targetPath: String(mapping.targetPath ?? ''),
    regType: MODBUS_REG_TYPES[mapping.source?.regType] ? mapping.source.regType : 'holdingRegister',
    protocolAddress: String(mapping.source?.protocolAddress ?? '0'),
    transformType: BRIDGE_TRANSFORM_TYPES.some((item) => item.value === mapping.transform?.type)
      ? mapping.transform.type
      : 'raw',
    fallbackText: formatBridgeFallbackValue(mapping.fallbackValue, hasBridgeFallbackValue(mapping)),
  };
}

function createEmptyBridgeMappingDraft() {
  return createBridgeMappingDraft({
    enabled: true,
    targetPath: '',
    source: {
      regType: 'holdingRegister',
      protocolAddress: 0,
    },
    transform: {
      type: 'raw',
    },
  });
}

function renderBridgeMappingRow(draft) {
  const sourceTypeOptions = Object.entries(MODBUS_REG_TYPES).map(([value, definition]) => ({
    value,
    label: definition.label,
  }));

  return `
    <tr data-bridge-row-id="${escapeHtml(draft.rowId)}" data-mapping-id="${escapeHtml(draft.mappingId)}">
      <td class="checkbox-cell">
        <input class="bridge-mapping-enabled-input" type="checkbox" ${draft.enabled ? 'checked' : ''} />
      </td>
      <td>
        <input
          class="bridge-mapping-path-input"
          value="${escapeHtml(draft.targetPath)}"
          placeholder="例如 site.power.total"
        />
      </td>
      <td>
        <select class="bridge-mapping-select bridge-mapping-reg-type-select">
          ${buildSelectOptionsHtml(sourceTypeOptions, draft.regType)}
        </select>
      </td>
      <td>
        <input
          class="bridge-mapping-address-input"
          type="number"
          min="0"
          step="1"
          value="${escapeHtml(String(draft.protocolAddress))}"
        />
      </td>
      <td>
        <select class="bridge-mapping-select bridge-mapping-transform-select">
          ${buildSelectOptionsHtml(BRIDGE_TRANSFORM_TYPES, draft.transformType)}
        </select>
      </td>
      <td>
        <input
          class="bridge-mapping-fallback-input"
          value="${escapeHtml(draft.fallbackText)}"
          placeholder="留空表示不使用 fallback"
        />
      </td>
      <td class="bridge-mapping-actions-cell">
        <button type="button" class="secondary bridge-delete-mapping-button">刪除 Mapping</button>
      </td>
    </tr>
  `;
}

function renderBridgeMappingTable(mappings) {
  if (!mappings.length) {
    bridgeElements.mappingTableBody.innerHTML = BRIDGE_EMPTY_MAPPING_ROW;
    return;
  }

  const drafts = mappings.map((mapping) => (
    Object.hasOwn(mapping, 'rowId')
      ? mapping
      : createBridgeMappingDraft(mapping)
  ));

  bridgeElements.mappingTableBody.innerHTML = drafts.map(renderBridgeMappingRow).join('');
}

function getBridgeMappingRows() {
  return [...bridgeElements.mappingTableBody.querySelectorAll('tr[data-bridge-row-id]')];
}

function readBridgeMappingDraftsFromTable() {
  return getBridgeMappingRows().map((row) => ({
    rowId: row.dataset.bridgeRowId,
    mappingId: row.dataset.mappingId || nextBridgeMappingIds().mappingId,
    enabled: row.querySelector('.bridge-mapping-enabled-input')?.checked ?? true,
    targetPath: row.querySelector('.bridge-mapping-path-input')?.value ?? '',
    regType: row.querySelector('.bridge-mapping-reg-type-select')?.value ?? 'holdingRegister',
    protocolAddress: row.querySelector('.bridge-mapping-address-input')?.value ?? '0',
    transformType: row.querySelector('.bridge-mapping-transform-select')?.value ?? 'raw',
    fallbackText: row.querySelector('.bridge-mapping-fallback-input')?.value ?? '',
  }));
}

function normalizeBridgeJsonPath(pathText, rowIndex) {
  const normalizedPath = String(pathText ?? '').trim();

  if (!normalizedPath) {
    throw new Error(`第 ${rowIndex + 1} 筆 Mapping 的 JSON Path 不可為空。`);
  }

  if (normalizedPath.includes('[') || normalizedPath.includes(']')) {
    throw new Error(`第 ${rowIndex + 1} 筆 Mapping 的 JSON Path 不支援 array path。`);
  }

  const segments = normalizedPath.split('.');

  if (segments.some((segment) => !segment.trim())) {
    throw new Error(`第 ${rowIndex + 1} 筆 Mapping 的 JSON Path 格式無效。`);
  }

  return normalizedPath;
}

function normalizeBridgeProtocolAddress(addressText, rowIndex) {
  const parsed = Number.parseInt(String(addressText ?? '').trim(), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`第 ${rowIndex + 1} 筆 Mapping 的 Protocol Address 必須是 0 以上整數。`);
  }

  return parsed;
}

function parseBridgeBooleanText(value, rowIndex) {
  const normalizedValue = String(value ?? '').trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  throw new Error(`第 ${rowIndex + 1} 筆 Mapping 的 Fallback 必須是 true / false / 1 / 0。`);
}

function parseBridgeFallbackValue(fallbackText, transformType, rowIndex) {
  const rawValue = String(fallbackText ?? '');
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return {
      hasFallback: false,
      fallbackValue: undefined,
    };
  }

  switch (transformType) {
    case 'number': {
      const parsedNumber = Number(trimmedValue);
      if (!Number.isFinite(parsedNumber)) {
        throw new Error(`第 ${rowIndex + 1} 筆 Mapping 的 Fallback 必須是有效數字。`);
      }
      return {
        hasFallback: true,
        fallbackValue: parsedNumber,
      };
    }

    case 'boolean':
      return {
        hasFallback: true,
        fallbackValue: parseBridgeBooleanText(trimmedValue, rowIndex),
      };

    case 'string':
      return {
        hasFallback: true,
        fallbackValue: rawValue,
      };

    case 'raw':
    default:
      try {
        return {
          hasFallback: true,
          fallbackValue: JSON.parse(trimmedValue),
        };
      } catch {
        return {
          hasFallback: true,
          fallbackValue: rawValue,
        };
      }
  }
}

function collectBridgeMappingsFromTable() {
  return readBridgeMappingDraftsFromTable().map((draft, index) => {
    const regType = MODBUS_REG_TYPES[draft.regType] ? draft.regType : 'holdingRegister';
    const transformType = BRIDGE_TRANSFORM_TYPES.some((item) => item.value === draft.transformType)
      ? draft.transformType
      : 'raw';
    const fallback = parseBridgeFallbackValue(draft.fallbackText, transformType, index);

    const mapping = {
      id: draft.mappingId,
      enabled: Boolean(draft.enabled),
      targetPath: normalizeBridgeJsonPath(draft.targetPath, index),
      source: {
        regType,
        protocolAddress: normalizeBridgeProtocolAddress(draft.protocolAddress, index),
      },
      transform: {
        type: transformType,
      },
    };

    if (fallback.hasFallback) {
      mapping.fallbackValue = fallback.fallbackValue;
    }

    return mapping;
  });
}

function getEnabledBridgeMappingCount(mappings) {
  return mappings.filter((mapping) => mapping?.enabled !== false).length;
}

function setBridgePreviewModeText(message) {
  bridgeElements.previewModeText.textContent = message;
}

function applyBridgePresetLists(defaultPresets, userPresets, selectedPresetId) {
  setBridgeDefaultPresets(defaultPresets);
  setBridgeUserPresets(userPresets);
  selectBridgePreset(selectedPresetId);
  updateBridgePresetSelectionHint();
}

function updateBridgePresetSelectionHint() {
  const preset = getBridgePresetById(bridgeElements.presetSelect?.value);
  if (!preset) {
    setBridgePreviewModeText('目前為新增使用者 Preset 模式；輸入名稱後可將目前表格儲存為新 preset。');
    return;
  }

  setBridgePreviewModeText(
    preset.scope === 'default'
      ? `目前已選擇 Default Preset「${preset.name}」；可載入使用，但不可直接覆蓋或刪除。`
      : `目前已選擇 User Preset「${preset.name}」；可載入、覆蓋儲存或刪除。`
  );
}

async function refreshBridgePresets(options = {}) {
  const {
    silent = false,
    selectedPresetId = bridgeElements.presetSelect?.value || DEFAULT_BRIDGE_PRESET_ID,
  } = options;

  try {
    const presetResult = await window.bridgeSimulator.getPresets();
    applyBridgePresetLists(
      presetResult.defaultPresets,
      presetResult.userPresets,
      selectedPresetId
    );
  } catch (error) {
    applyBridgePresetLists(bridgeDefaultPresets, [], selectedPresetId);

    if (!silent) {
      setPanelMessage(bridgeElements.messageBox, `讀取 Preset 清單失敗：${error.message}`, 'error');
    }
  }
}

function updateUrlPreview() {
  const config = getApiConfigFromForm();
  const path = config.path.startsWith('/') ? config.path : `/${config.path}`;
  apiElements.currentUrl.textContent = `http://${config.host}:${config.port}${path}`;
}

async function updatePayloadEditor() {
  if (apiElements.scenarioSelect.value === 'custom') {
    const customPayloadText = await window.mockMeterApi.getCustomPayloadText();
    apiElements.payloadEditor.value = customPayloadText;
    validatePayloadEditor(false);
    return;
  }

  apiElements.payloadEditor.value = JSON.stringify(createExamplePayload(), null, 2);
  validatePayloadEditor(false);
}

function validatePayloadEditor(showSuccess = true) {
  const text = apiElements.payloadEditor.value.trim();

  if (!text) {
    apiElements.payloadValidation.textContent = 'Payload 不可為空。';
    apiElements.payloadValidation.className = 'message error';
    return false;
  }

  try {
    JSON.parse(text);

    apiElements.payloadValidation.textContent = showSuccess ? 'JSON 格式正確。' : '';
    apiElements.payloadValidation.className = showSuccess ? 'message success' : 'message';
    return true;
  } catch (error) {
    apiElements.payloadValidation.textContent = `JSON 格式錯誤：${error.message}`;
    apiElements.payloadValidation.className = 'message error';
    return false;
  }
}

async function useEditedPayload() {
  const customPayloadText = apiElements.payloadEditor.value;

  await window.mockMeterApi.setCustomPayloadText(customPayloadText);
  apiElements.scenarioSelect.value = 'custom';
  const status = await window.mockMeterApi.setScenario('custom');

  renderApiStatus(status);
  validatePayloadEditor(true);
  setPanelMessage(apiElements.messageBox, '已將目前 Payload 套用到 custom scenario。', 'success');
}

function formatJson() {
  try {
    const parsed = JSON.parse(apiElements.payloadEditor.value);
    apiElements.payloadEditor.value = JSON.stringify(parsed, null, 2);
    validatePayloadEditor(true);
  } catch (error) {
    apiElements.payloadValidation.textContent = `無法格式化 JSON：${error.message}`;
    apiElements.payloadValidation.className = 'message error';
  }
}

async function resetPayloadExample() {
  apiElements.payloadEditor.value = JSON.stringify(createExamplePayload(), null, 2);
  await window.mockMeterApi.setCustomPayloadText(apiElements.payloadEditor.value);
  validatePayloadEditor(false);
  setPanelMessage(apiElements.messageBox, '已重設為目前 scenario 的範例 Payload。', 'success');
}

function renderApiStatus(status, options = {}) {
  const {
    syncConfig = true,
    syncScenario = true,
    syncUrl = true,
  } = options;

  apiElements.serverBadge.textContent = status.running ? 'API 執行中' : 'API 已停止';
  apiElements.serverBadge.className = status.running
    ? 'badge status-badge badge-running'
    : 'badge status-badge badge-stopped';

  if (status.config && syncConfig) {
    apiElements.hostInput.value = status.config.host;
    apiElements.portInput.value = status.config.port;
    apiElements.pathInput.value = status.config.path;
    apiElements.delayInput.value = status.config.delayMs;
  }

  if (status.config && syncScenario) {
    apiElements.scenarioSelect.value = status.config.scenario;
  }

  if (syncUrl) {
    apiElements.currentUrl.textContent = status.url || apiElements.currentUrl.textContent;
  }
}

function renderApiLogs(logs) {
  if (!logs.length) {
    apiElements.logTableBody.innerHTML = API_EMPTY_LOG_ROW;
    return;
  }

  apiElements.logTableBody.innerHTML = logs.map((log) => `
    <tr>
      <td>${escapeHtml(log.time)}</td>
      <td>${escapeHtml(log.method)}</td>
      <td><code>${escapeHtml(log.path)}</code></td>
      <td>${escapeHtml(log.scenario)}</td>
      <td>${escapeHtml(String(log.statusCode))}</td>
    </tr>
  `).join('');
}

function getTypeLabel(type) {
  return MODBUS_TYPE_LABELS[type] || type;
}

function formatDisplayAddress(point) {
  return point.displayAddress
    || point.referenceAddress
    || toReferenceAddress(point.regType, point.protocolAddress ?? point.address);
}

function formatPointBitsOrHex(point) {
  if (point.regType === 'coil' || point.regType === 'discreteInput') {
    return point.bits?.[0] ? 'true / 1' : 'false / 0';
  }

  return point.hex.join(' ');
}

function formatModbusLogAddress(value) {
  return value == null ? '-' : String(value);
}

function formatModbusLogReference(log) {
  if (log.referenceAddress != null) {
    return String(log.referenceAddress);
  }

  if (!log.referenceStartAddress) {
    return '-';
  }

  if (!log.referenceEndAddress || log.referenceStartAddress === log.referenceEndAddress) {
    return String(log.referenceStartAddress);
  }

  return `${log.referenceStartAddress} ~ ${log.referenceEndAddress}`;
}

function formatModbusLogRequest(log) {
  if (log.requestAddress != null) {
    return String(log.requestAddress);
  }

  if (log.requestStartAddress != null) {
    return String(log.requestStartAddress);
  }

  return '-';
}

function formatModbusLogResolved(log) {
  if (log.resolvedInternalAddress != null) {
    return String(log.resolvedInternalAddress);
  }

  if (log.resolvedInternalStartAddress != null) {
    return String(log.resolvedInternalStartAddress);
  }

  return '-';
}

function formatBooleanDisplay(value) {
  return value ? 'true' : 'false';
}

function formatBooleanArray(values) {
  return `[${values.map((value) => formatBooleanDisplay(value)).join(', ')}]`;
}

function formatModbusLogValueBits(log) {
  const parts = [];

  if (log.writeValue !== undefined) {
    parts.push(`write: ${formatBooleanDisplay(log.writeValue)}`);
  }

  if (Array.isArray(log.writeValues)) {
    parts.push(`write: ${formatBooleanArray(log.writeValues)}`);
  }

  if (Array.isArray(log.readValues)) {
    parts.push(`read: ${formatBooleanArray(log.readValues)}`);
  }

  if (log.rawValueAfterWrite !== undefined) {
    parts.push(`raw: ${formatBooleanDisplay(log.rawValueAfterWrite)}`);
  }

  if (Array.isArray(log.rawValuesAfterWrite)) {
    parts.push(`raw: ${formatBooleanArray(log.rawValuesAfterWrite)}`);
  }

  return parts.length ? parts.join(' | ') : '-';
}

function formatModbusLogResponse(log) {
  if (!Array.isArray(log.responseBytes) || !log.responseBytes.length) {
    return '-';
  }

  return log.responseBytes.join(' ');
}

function formatModbusLogUndefinedInfo(log) {
  if (!log.hasUndefinedAddress
    && !Array.isArray(log.undefinedAddresses)
    && log.undefinedAddressCount == null) {
    return '';
  }

  if (Array.isArray(log.undefinedAddresses) && log.undefinedAddresses.length) {
    return `Undefined: ${log.undefinedAddresses.join(', ')}`;
  }

  if (log.undefinedAddressCount != null) {
    return `Undefined: ${log.undefinedAddressCount}`;
  }

  return 'Undefined: -';
}

function formatModbusLogExceptionInfo(log) {
  if (!log.exceptionCode) {
    return '';
  }

  return `Exception: ${log.exceptionCode}`;
}

function formatModbusLogMessage(log) {
  const baseMessage = log.feedbackMessage ?? log.message ?? '-';
  const parts = [baseMessage];

  if (log.actionApplied !== undefined) {
    if (log.actionApplied) {
      const ids = Array.isArray(log.actionPointIds) && log.actionPointIds.length
        ? `：${log.actionPointIds.join(', ')}`
        : '';
      parts.push(`動作已更新${ids}`);
    } else {
      parts.push('動作未更新');
    }
  }

  if (log.requestAddressResolutionNote) {
    parts.push(log.requestAddressResolutionNote);
  }

  const undefinedInfo = formatModbusLogUndefinedInfo(log);
  if (undefinedInfo) {
    parts.push(undefinedInfo);
  }

  const exceptionInfo = formatModbusLogExceptionInfo(log);
  if (exceptionInfo) {
    parts.push(exceptionInfo);
  }

  return parts.join('；');
}

function isBinaryLike(regType, type) {
  return regType === 'coil' || regType === 'discreteInput' || type === 'binary';
}

function isWordOrderEditable(regType, type) {
  return (regType === 'inputRegister' || regType === 'holdingRegister')
    && (MODBUS_TYPE_WORD_COUNT[type] || 1) > 1;
}

function getActionOptions(regType, type, selectedAction) {
  const binaryLike = isBinaryLike(regType, type);

  return Object.entries(MODBUS_ACTION_LABELS).map(([value, label]) => ({
    value,
    label,
    disabled: binaryLike && value === 'sine',
    selected: value === selectedAction,
  }));
}

function syncModbusGeneratorTypeOptions() {
  const regType = modbusElements.registerTypeSelect.value;
  const definition = MODBUS_REG_TYPES[regType];
  const currentType = modbusElements.typeSelect.value;
  const nextType = definition.supportedTypes.includes(currentType)
    ? currentType
    : definition.defaultType;

  renderStaticSelectOptions(
    modbusElements.typeSelect,
    definition.supportedTypes.map((type) => ({
      value: type,
      label: getTypeLabel(type),
    })),
    nextType
  );

  syncModbusGeneratorActionOptions();
  syncModbusGeneratorWordOrderState();
  syncModbusGeneratorHint();
}

function syncModbusGeneratorActionOptions() {
  const regType = modbusElements.registerTypeSelect.value;
  const type = modbusElements.typeSelect.value;
  const options = getActionOptions(regType, type, modbusElements.actionSelect.value);
  const enabledOptions = options.filter((option) => !option.disabled);
  const selectedValue = enabledOptions.some((option) => option.value === modbusElements.actionSelect.value)
    ? modbusElements.actionSelect.value
    : 'manual';

  renderStaticSelectOptions(modbusElements.actionSelect, options, selectedValue);
}

function syncModbusGeneratorWordOrderState() {
  const regType = modbusElements.registerTypeSelect.value;
  const type = modbusElements.typeSelect.value;
  const editable = isWordOrderEditable(regType, type);
  modbusElements.wordOrderSelect.disabled = !editable;

  if (!editable) {
    modbusElements.wordOrderSelect.value = 'HL';
  }
}

function syncModbusGeneratorHint() {
  const regType = modbusElements.registerTypeSelect.value;
  const type = modbusElements.typeSelect.value;
  const span = MODBUS_TYPE_WORD_COUNT[type] || 1;
  const regTypeLabel = MODBUS_REG_TYPES[regType]?.label || regType;

  const hintText = [
    `${regTypeLabel} 的 Address 使用 Modbus protocol address，從 0 開始。`,
    `Display Address 僅供對照點表。`,
    `${getTypeLabel(type)} 每個點位需要 ${span} 個 ${regType === 'coil' || regType === 'discreteInput' ? 'bit 位址' : 'register 位址'}。`,
  ].join(' ');

  if (modbusElements.generatorHint) {
    modbusElements.generatorHint.dataset.tooltip = hintText;
    modbusElements.generatorHint.setAttribute('aria-label', hintText);
  }
}

function renderModbusStatus(status, options = {}) {
  const { syncConfig = true } = options;
  const running = Boolean(status.running);

  modbusElements.statusBadge.textContent = running ? '執行中' : '已停止';
  modbusElements.statusBadge.className = running
    ? 'badge badge-running status-running'
    : 'badge badge-stopped status-stopped';

  if (apiElements.modbusStatusBadge) {
    apiElements.modbusStatusBadge.textContent = running ? 'Modbus 執行中' : 'Modbus 已停止';
    apiElements.modbusStatusBadge.className = running
      ? 'badge status-badge badge-running'
      : 'badge status-badge badge-stopped';
  }

  modbusElements.endpoint.textContent = status.endpoint || '-';
  modbusElements.unitIdText.textContent = String(status.unitId ?? '-');

  if (syncConfig && status.config) {
    modbusElements.hostInput.value = status.config.host;
    modbusElements.portInput.value = status.config.port;
    modbusElements.unitIdInput.value = status.config.unitId;
    if (modbusElements.requestAddressBaseModeSelect) {
      modbusElements.requestAddressBaseModeSelect.value =
        status.config.requestAddressBaseMode || 'standard-0-based';
    }
    if (modbusElements.feedbackMappingModeSelect) {
      modbusElements.feedbackMappingModeSelect.value =
        status.config.feedbackMappingMode || 'disabled';
    }
    if (modbusElements.undefinedBooleanModeSelect) {
      modbusElements.undefinedBooleanModeSelect.value =
        status.config.undefinedBooleanMode || 'compatibility-false';
    }
  }
}

function renderBridgePreview(previewResult, options = {}) {
  const {
    sourceLabel = '目前表格',
    totalCount = 0,
    enabledCount = totalCount,
  } = options;
  const payload = previewResult?.payload ?? {};
  const diagnostics = previewResult?.diagnostics;
  const appliedCount = Array.isArray(diagnostics?.appliedMappings)
    ? diagnostics.appliedMappings.length
    : 0;
  const missingCount = Array.isArray(diagnostics?.missingMappings)
    ? diagnostics.missingMappings.length
    : 0;

  bridgeElements.payloadPreview.textContent = formatJsonPreview(payload);
  if (diagnostics != null) {
    bridgeElements.diagnosticsPreview.textContent = formatJsonPreview(diagnostics);
    if (bridgeElements.diagnosticsSummary) {
      bridgeElements.diagnosticsSummary.textContent = `套用 ${appliedCount} 筆，缺少 ${missingCount} 筆`;
    }
  } else {
    bridgeElements.diagnosticsPreview.textContent = '尚無除錯資訊';
    if (bridgeElements.diagnosticsSummary) {
      bridgeElements.diagnosticsSummary.textContent = '尚無除錯資訊';
    }
  }
  setBridgePreviewModeText(
    `Preview 使用${sourceLabel} mappings，共 ${totalCount} 筆，啟用 ${enabledCount} 筆；成功套用 ${appliedCount} 筆，缺少來源 ${missingCount} 筆。`
  );
}

function renderModbusPointRow(point) {
  const draft = modbusPointDrafts.get(point.id) || {};
  const draftValue = draft.value ?? String(point.value);
  const draftWordOrder = draft.wordOrder ?? point.wordOrder;
  const draftAction = draft.action ?? point.action;
  const draftActionConfig = draft.actionConfig ?? point.actionConfigText ?? '';
  const wordOrderEditable = isWordOrderEditable(point.regType, point.type);

  const actionOptionsHtml = getActionOptions(point.regType, point.type, draftAction).map((option) => `
    <option value="${escapeHtml(option.value)}" ${option.value === draftAction ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}>
      ${escapeHtml(option.label)}
    </option>
  `).join('');

  return `
    <tr data-point-id="${escapeHtml(point.id)}">
      <td><input type="checkbox" ${point.enabled ? 'checked' : ''} disabled /></td>
      <td>${escapeHtml(point.regTypeLabel || MODBUS_REG_TYPES[point.regType]?.label || point.regType)}</td>
      <td>${escapeHtml(String(point.address))}</td>
      <td>${escapeHtml(formatDisplayAddress(point))}</td>
      <td><code>${escapeHtml(formatPointBitsOrHex(point))}</code></td>
      <td>
        <input class="inline-input point-value-input" value="${escapeHtml(String(draftValue))}" />
      </td>
      <td>${escapeHtml(getTypeLabel(point.type))}</td>
      <td>
        ${wordOrderEditable ? `
          <select class="small-select point-word-order-select">
            <option value="HL" ${draftWordOrder === 'HL' ? 'selected' : ''}>HL</option>
            <option value="LH" ${draftWordOrder === 'LH' ? 'selected' : ''}>LH</option>
          </select>
        ` : '<span class="muted-note">-</span>'}
      </td>
      <td>
        <select class="small-select point-action-select">
          ${actionOptionsHtml}
        </select>
      </td>
      <td>
        <input
          class="inline-input point-action-config-input"
          value="${escapeHtml(String(draftActionConfig))}"
          placeholder='例如 {"step":1}'
        />
      </td>
      <td><button class="secondary apply-point-button">套用</button></td>
    </tr>
  `;
}

function renderModbusPoints(points) {
  if (!points.length) {
    modbusPointDrafts.clear();
    modbusElements.pointTableBody.innerHTML = MODBUS_EMPTY_POINT_ROW;
    return;
  }

  const activePointIds = new Set(points.map((point) => point.id));
  [...modbusPointDrafts.keys()].forEach((pointId) => {
    if (!activePointIds.has(pointId)) {
      modbusPointDrafts.delete(pointId);
    }
  });

  modbusElements.pointTableBody.innerHTML = points.map(renderModbusPointRow).join('');
}

function renderModbusLogs(logs) {
  if (!logs.length) {
    modbusElements.logTableBody.innerHTML = MODBUS_EMPTY_LOG_ROW;
    return;
  }

  modbusElements.logTableBody.innerHTML = logs.map((log) => `
    <tr>
      <td>${escapeHtml(log.time)}</td>
      <td>${escapeHtml(log.client)}</td>
      <td>${escapeHtml(String(log.unitId))}</td>
      <td>${escapeHtml(log.functionCode)}</td>
      <td>${escapeHtml(log.regTypeLabel ?? log.regType ?? '-')}</td>
      <td>${escapeHtml(log.action ?? '-')}</td>
      <td>${escapeHtml(formatModbusLogRequest(log))}</td>
      <td>${escapeHtml(formatModbusLogResolved(log))}</td>
      <td>${escapeHtml(formatModbusLogReference(log))}</td>
      <td>${escapeHtml(formatModbusLogAddress(log.requestQuantity ?? log.quantity))}</td>
      <td>${escapeHtml(formatModbusLogValueBits(log))}</td>
      <td>${escapeHtml(formatModbusLogResponse(log))}</td>
      <td>${escapeHtml(log.requestAddressBaseMode ?? 'standard-0-based')}</td>
      <td>${escapeHtml(log.status ?? '-')}</td>
      <td>${escapeHtml(formatModbusLogMessage(log))}</td>
    </tr>
  `).join('');
}

function isEditingModbusPointTable() {
  const activeElement = document.activeElement;

  if (!activeElement) {
    return false;
  }

  return Boolean(
    activeElement.closest('#modbusPointTableBody')
    && (
      activeElement.classList.contains('point-value-input')
      || activeElement.classList.contains('point-word-order-select')
      || activeElement.classList.contains('point-action-select')
      || activeElement.classList.contains('point-action-config-input')
    )
  );
}

function setActiveMode(mode) {
  const safeMode = SUPPORTED_MODES.includes(mode) ? mode : 'api';

  document.querySelectorAll('.mode-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === safeMode);
  });

  document.querySelectorAll('.mode-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.modePanel === safeMode);
  });

  localStorage.setItem(MODE_STORAGE_KEY, safeMode);
}

function initModeTabs() {
  document.querySelectorAll('.mode-tab').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveMode(button.dataset.mode);
    });
  });

  setActiveMode(localStorage.getItem(MODE_STORAGE_KEY) || 'api');
}

async function refreshApiStatus() {
  const status = await window.mockMeterApi.getServerStatus();
  renderApiStatus(status, {
    syncConfig: false,
    syncScenario: false,
    syncUrl: false,
  });
}

async function refreshApiLogs() {
  const logs = await window.mockMeterApi.getLogs();
  renderApiLogs(logs);
}

async function startApiServer() {
  try {
    const status = await window.mockMeterApi.startServer(getApiConfigFromForm());
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, 'API Server 已啟動。', 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `啟動 API Server 失敗：${error.message}`, 'error');
  }
}

async function stopApiServer() {
  try {
    const status = await window.mockMeterApi.stopServer();
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, 'API Server 已停止。', 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `停止 API Server 失敗：${error.message}`, 'error');
  }
}

async function restartApiServer() {
  try {
    const status = await window.mockMeterApi.restartServer(getApiConfigFromForm());
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, 'API Server 已重新啟動。', 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `重新啟動 API Server 失敗：${error.message}`, 'error');
  }
}

async function clearApiLogs() {
  const logs = await window.mockMeterApi.clearLogs();
  renderApiLogs(logs);
}

async function copyCommand(command) {
  await navigator.clipboard.writeText(command);
  apiElements.copiedCommand.textContent = command;
  setPanelMessage(apiElements.messageBox, '已複製測試指令。', 'success');
}

async function refreshModbusStatus() {
  const status = await window.modbusSimulator.getStatus();
  renderModbusStatus(status, { syncConfig: false });
}

async function refreshModbusPoints() {
  if (isEditingModbusPointTable()) {
    return;
  }

  const points = await window.modbusSimulator.getPoints();
  renderModbusPoints(points);
}

async function refreshModbusLogs() {
  const logs = await window.modbusSimulator.getLogs();
  renderModbusLogs(logs);
}

async function loadBridgeMappingsFromMain(options = {}) {
  const { silent = false } = options;

  try {
    const mappings = await window.bridgeSimulator.getMappings();
    renderBridgeMappingTable(mappings);
    setBridgePreviewModeText(
      `已讀取 main process 中的 mappings，共 ${mappings.length} 筆；API Simulator 若選擇 Modbus Bridge，會使用這批設定。`
    );

    if (!silent) {
      setPanelMessage(bridgeElements.messageBox, '已讀取已儲存 Mapping。', 'success');
    }
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, `讀取已儲存 Mapping 失敗：${error.message}`, 'error');
  }
}

async function startModbusServer() {
  try {
    const status = await window.modbusSimulator.startServer(getModbusConfigFromForm());
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, 'Modbus TCP Server 已啟動。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `啟動 Modbus TCP Server 失敗：${error.message}`, 'error');
  }
}

async function stopModbusServer() {
  try {
    const status = await window.modbusSimulator.stopServer();
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, 'Modbus TCP Server 已停止。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `停止 Modbus TCP Server 失敗：${error.message}`, 'error');
  }
}

async function restartModbusServer() {
  try {
    const status = await window.modbusSimulator.restartServer(getModbusConfigFromForm());
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, 'Modbus TCP Server 已重新啟動。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `重新啟動 Modbus TCP Server 失敗：${error.message}`, 'error');
  }
}

async function loadBridgePreset(options = {}) {
  const { silent = false } = options;

  try {
    const preset = getBridgePresetById(bridgeElements.presetSelect?.value);
    if (!preset) {
      throw new Error('請先選擇要載入的 Preset。');
    }

    const mappings = cloneBridgePresetMappings(preset.mappings);
    renderBridgeMappingTable(mappings);
    setBridgePreviewModeText(
      `已載入 ${preset.scope === 'default' ? 'Default' : 'User'} Preset「${preset.name}」到表格，共 ${mappings.length} 筆；目前仍未儲存到 main process。`
    );

    if (!silent) {
      setPanelMessage(bridgeElements.messageBox, `已載入 Preset「${preset.name}」。`, 'success');
    }
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, `載入 Preset 失敗：${error.message}`, 'error');
  }
}

function addBridgeMapping() {
  const drafts = readBridgeMappingDraftsFromTable();
  drafts.push(createEmptyBridgeMappingDraft());
  renderBridgeMappingTable(drafts);
  setBridgePreviewModeText(
    '已新增一列 Mapping；Preview 會直接讀取目前表格內容，儲存後 API Simulator 的 Modbus Bridge 會套用。'
  );
}

async function saveBridgeMappings() {
  try {
    const mappings = collectBridgeMappingsFromTable();
    const savedMappings = await window.bridgeSimulator.setMappings(mappings);
    renderBridgeMappingTable(savedMappings);
    setBridgePreviewModeText(
      `已儲存 mappings，共 ${savedMappings.length} 筆；API Simulator 若選擇 Modbus Bridge，會使用這批設定。`
    );
    setPanelMessage(bridgeElements.messageBox, '已儲存 Mapping 到 main process。', 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, `儲存 Mapping 失敗：${error.message}`, 'error');
  }
}

async function saveBridgeUserPreset() {
  try {
    const presetName = bridgeElements.presetNameInput?.value ?? '';
    const selectedPreset = getBridgePresetById(bridgeElements.presetSelect?.value);
    const mappings = collectBridgeMappingsFromTable();
    const result = await window.bridgeSimulator.saveUserPreset({
      id: selectedPreset?.scope === 'user' ? selectedPreset.id : undefined,
      name: presetName,
      description: selectedPreset?.scope === 'user' ? selectedPreset.description : '',
      mappings,
    });

    applyBridgePresetLists(
      bridgePresetState.defaultPresets,
      result.userPresets,
      result.preset.id
    );
    bridgeElements.presetNameInput.value = result.preset.name;
    setBridgePreviewModeText(
      `已儲存 User Preset「${result.preset.name}」，共 ${result.preset.mappings.length} 筆 mapping。`
    );
    setPanelMessage(bridgeElements.messageBox, `已儲存使用者 Preset「${result.preset.name}」。`, 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, `儲存 Preset 失敗：${error.message}`, 'error');
  }
}

async function deleteBridgeUserPreset() {
  try {
    const preset = getBridgePresetById(bridgeElements.presetSelect?.value);
    if (!preset || preset.scope !== 'user') {
      throw new Error('目前選取的不是可刪除的使用者 Preset。');
    }

    const result = await window.bridgeSimulator.deleteUserPreset(preset.id);
    applyBridgePresetLists(
      bridgePresetState.defaultPresets,
      result.userPresets,
      DEFAULT_BRIDGE_PRESET_ID
    );
    setBridgePreviewModeText(`已刪除 User Preset「${preset.name}」。`);
    setPanelMessage(bridgeElements.messageBox, `已刪除使用者 Preset「${preset.name}」。`, 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, `刪除 Preset 失敗：${error.message}`, 'error');
  }
}

async function previewBridgePayload() {
  try {
    const mappings = collectBridgeMappingsFromTable();
    const previewResult = await window.bridgeSimulator.getPreview(mappings);
    renderBridgePreview(previewResult, {
      sourceLabel: '目前表格',
      totalCount: mappings.length,
      enabledCount: getEnabledBridgeMappingCount(mappings),
    });
    setPanelMessage(bridgeElements.messageBox, 'Bridge Payload Preview 已更新。', 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, `產生 Bridge Preview 失敗：${error.message}`, 'error');
  }
}

async function generateModbusRegisters() {
  try {
    const result = await window.modbusSimulator.generateRegisters(getRegisterGeneratorConfigFromForm());
    renderModbusStatus(result.status);
    renderModbusPoints(result.points);
    setPanelMessage(modbusElements.messageBox, '已產生 Modbus 點位。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `產生點位失敗：${error.message}`, 'error');
  }
}

async function applyModbusPointUpdate(row) {
  const pointId = row.dataset.pointId;
  const value = row.querySelector('.point-value-input')?.value ?? '';
  const action = row.querySelector('.point-action-select')?.value ?? 'manual';
  const actionConfig = row.querySelector('.point-action-config-input')?.value ?? '';
  const wordOrderSelect = row.querySelector('.point-word-order-select');
  const wordOrder = wordOrderSelect ? wordOrderSelect.value : 'HL';

  try {
    const result = await window.modbusSimulator.updatePoint({
      id: pointId,
      value,
      wordOrder,
      action,
      actionConfig,
    });

    modbusPointDrafts.delete(pointId);
    renderModbusStatus(result.status);
    renderModbusPoints(result.points);
    setPanelMessage(modbusElements.messageBox, `已套用點位 ${pointId}。`, 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `套用點位失敗：${error.message}`, 'error');
  }
}

async function clearModbusLogs() {
  const logs = await window.modbusSimulator.clearLogs();
  renderModbusLogs(logs);
}

function updatePointDraft(event) {
  const row = event.target.closest('tr[data-point-id]');
  if (!row) {
    return;
  }

  const pointId = row.dataset.pointId;
  const currentDraft = modbusPointDrafts.get(pointId) || {};

  if (event.target.classList.contains('point-value-input')) {
    modbusPointDrafts.set(pointId, {
      ...currentDraft,
      value: event.target.value,
    });
    return;
  }

  if (event.target.classList.contains('point-action-config-input')) {
    modbusPointDrafts.set(pointId, {
      ...currentDraft,
      actionConfig: event.target.value,
    });
  }
}

function updatePointDraftSelection(event) {
  const row = event.target.closest('tr[data-point-id]');
  if (!row) {
    return;
  }

  const pointId = row.dataset.pointId;
  const currentDraft = modbusPointDrafts.get(pointId) || {};

  if (event.target.classList.contains('point-word-order-select')) {
    modbusPointDrafts.set(pointId, {
      ...currentDraft,
      wordOrder: event.target.value,
    });
    return;
  }

  if (event.target.classList.contains('point-action-select')) {
    modbusPointDrafts.set(pointId, {
      ...currentDraft,
      action: event.target.value,
    });
  }
}

async function handlePointTableClick(event) {
  const button = event.target.closest('.apply-point-button');
  if (!button) {
    return;
  }

  const row = button.closest('tr[data-point-id]');
  if (!row) {
    return;
  }

  await applyModbusPointUpdate(row);
}

function markBridgeTableAsEdited() {
  setBridgePreviewModeText(
    '目前正在編輯表格 mappings；Preview 會直接讀取表格內容，儲存後 API Simulator 的 Modbus Bridge 會套用。'
  );
}

function handleBridgeMappingTableInput(event) {
  if (!event.target.closest('tr[data-bridge-row-id]')) {
    return;
  }

  markBridgeTableAsEdited();
}

function handleBridgeMappingTableClick(event) {
  const button = event.target.closest('.bridge-delete-mapping-button');
  if (!button) {
    return;
  }

  const row = button.closest('tr[data-bridge-row-id]');
  if (!row) {
    return;
  }

  const drafts = readBridgeMappingDraftsFromTable()
    .filter((draft) => draft.rowId !== row.dataset.bridgeRowId);

  renderBridgeMappingTable(drafts);
  markBridgeTableAsEdited();
}

apiElements.startButton.addEventListener('click', startApiServer);
apiElements.stopButton.addEventListener('click', stopApiServer);
apiElements.restartButton.addEventListener('click', restartApiServer);
apiElements.clearLogsButton.addEventListener('click', clearApiLogs);

apiElements.hostInput.addEventListener('input', updateUrlPreview);
apiElements.portInput.addEventListener('input', updateUrlPreview);
apiElements.pathInput.addEventListener('input', updateUrlPreview);
apiElements.delayInput.addEventListener('input', updateUrlPreview);
apiElements.useEditedPayloadButton.addEventListener('click', useEditedPayload);
apiElements.formatJsonButton.addEventListener('click', formatJson);
apiElements.resetPayloadButton.addEventListener('click', resetPayloadExample);
apiElements.payloadEditor.addEventListener('input', () => validatePayloadEditor(false));
apiElements.responseSourceSelect?.addEventListener('change', async () => {
  try {
    await setApiResponseSourceMode(apiElements.responseSourceSelect.value);
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `切換 API Response Source 失敗：${error.message}`, 'error');
    const currentMode = await window.mockMeterApi.getResponseSourceMode();
    persistApiResponseSourceMode(currentMode);
  }
});

apiElements.scenarioSelect.addEventListener('change', async () => {
  await updatePayloadEditor();

  try {
    const status = await window.mockMeterApi.setScenario(apiElements.scenarioSelect.value);
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, `已切換到 scenario：${apiElements.scenarioSelect.value}`, 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `切換 scenario 失敗：${error.message}`, 'error');
  }
});

document.querySelectorAll('.copy-command').forEach((button) => {
  button.addEventListener('click', () => {
    copyCommand(button.dataset.command);
  });
});

modbusElements.startButton.addEventListener('click', startModbusServer);
modbusElements.stopButton.addEventListener('click', stopModbusServer);
modbusElements.restartButton.addEventListener('click', restartModbusServer);
modbusElements.generateButton.addEventListener('click', generateModbusRegisters);
modbusElements.clearLogsButton.addEventListener('click', clearModbusLogs);
modbusElements.registerTypeSelect.addEventListener('change', syncModbusGeneratorTypeOptions);
modbusElements.typeSelect.addEventListener('change', () => {
  syncModbusGeneratorActionOptions();
  syncModbusGeneratorWordOrderState();
  syncModbusGeneratorHint();
});
modbusElements.pointTableBody.addEventListener('input', updatePointDraft);
modbusElements.pointTableBody.addEventListener('change', updatePointDraftSelection);
modbusElements.pointTableBody.addEventListener('click', handlePointTableClick);

bridgeElements.reloadMappingsButton.addEventListener('click', () => {
  loadBridgeMappingsFromMain();
});
bridgeElements.loadMappingsButton.addEventListener('click', () => {
  loadBridgePreset();
});
bridgeElements.addMappingButton.addEventListener('click', addBridgeMapping);
bridgeElements.saveMappingsButton.addEventListener('click', saveBridgeMappings);
bridgeElements.previewButton.addEventListener('click', previewBridgePayload);
bridgeElements.mappingTableBody.addEventListener('input', handleBridgeMappingTableInput);
bridgeElements.mappingTableBody.addEventListener('change', handleBridgeMappingTableInput);
bridgeElements.mappingTableBody.addEventListener('click', handleBridgeMappingTableClick);

async function init() {
  initModeTabs();
  await initApiResponseSourceMode();
  updateUrlPreview();
  modbusElements.feedbackMappingModeSelect = ensureModbusFeedbackMappingModeField();
  modbusElements.undefinedBooleanModeSelect = ensureModbusUndefinedBooleanModeField();
  ensureBridgePresetControls();
  syncModbusGeneratorTypeOptions();

  bridgeElements.newPresetButton?.addEventListener('click', createNewBridgePresetDraft);
  bridgeElements.savePresetButton?.addEventListener('click', saveBridgeUserPreset);
  bridgeElements.deletePresetButton?.addEventListener('click', deleteBridgeUserPreset);
  bridgeElements.presetSelect?.addEventListener('change', () => {
    selectBridgePreset(bridgeElements.presetSelect?.value, { preserveNameInput: false });
    updateBridgePresetSelectionHint();
  });

  await refreshApiStatus();
  await updatePayloadEditor();
  await refreshApiLogs();

  await refreshModbusStatus();
  await refreshModbusPoints();
  await refreshModbusLogs();
  await refreshBridgePresets({ silent: true });
  await loadBridgeMappingsFromMain({ silent: true });
  updateBridgePresetSelectionHint();

  setInterval(refreshApiStatus, 1500);
  setInterval(refreshApiLogs, 1000);
  setInterval(refreshModbusStatus, 1500);
  setInterval(refreshModbusPoints, 1000);
  setInterval(refreshModbusLogs, 1000);
}

init();
