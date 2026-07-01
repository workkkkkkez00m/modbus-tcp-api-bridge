import './index.css';
import { bridgeDefaultPresets } from './bridgeDefaultConfig.js';
import { getLocale, setLocale, t, translateDom } from './i18n.js';
import { toReferenceAddress } from './modbusAddress.js';

const MODE_STORAGE_KEY = 'bms-protocol-mock-lab.activeMode';
const API_RESPONSE_SOURCE_MODE_STORAGE_KEY = 'bms-protocol-mock-lab.apiResponseSourceMode';
const SUPPORTED_MODES = ['api', 'modbus', 'bridge'];
const SUPPORTED_API_RESPONSE_SOURCE_MODES = ['manual', 'bridge'];
const BRIDGE_USER_EMPTY_OPTION_VALUE = '__bridge-user-empty__';

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
  clearPointsButton: document.querySelector('#clearModbusPointsButton'),
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

const localeElements = {
  select: document.querySelector('#localeSelect'),
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
let lastApiStatus = null;
let lastModbusStatus = null;
let lastApiLogs = [];
let lastModbusPoints = [];
let lastModbusLogs = [];
let lastBridgePreview = null;
let lastBridgePreviewOptions = null;

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
  labelText.textContent = t('modbus.undefinedBoolean.label');
  const indicator = document.createElement('span');
  indicator.className = 'tooltip-indicator has-tooltip';
  indicator.textContent = '?';
  indicator.dataset.tooltip = t('modbus.undefinedBoolean.tooltip');
  indicator.setAttribute('tabindex', '0');
  indicator.setAttribute('aria-label', t('modbus.undefinedBoolean.aria'));
  labelText.appendChild(indicator);

  select = document.createElement('select');
  select.id = 'modbusUndefinedBooleanModeSelect';
  select.innerHTML = `
    <option value="compatibility-false" selected>${escapeHtml(t('modbus.undefinedBoolean.option.compatibility'))}</option>
    <option value="strict">${escapeHtml(t('modbus.undefinedBoolean.option.strict'))}</option>
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
  labelText.textContent = t('modbus.feedbackMapping.label');
  const indicator = document.createElement('span');
  indicator.className = 'tooltip-indicator has-tooltip';
  indicator.textContent = '?';
  indicator.dataset.tooltip = t('modbus.feedbackMapping.tooltip');
  indicator.setAttribute('tabindex', '0');
  indicator.setAttribute('aria-label', t('modbus.feedbackMapping.aria'));
  labelText.appendChild(indicator);

  select = document.createElement('select');
  select.id = 'modbusFeedbackMappingModeSelect';
  select.innerHTML = `
    <option value="disabled" selected>${escapeHtml(t('modbus.feedbackMapping.option.disabled'))}</option>
    <option value="coil-to-discrete-same-address">${escapeHtml(t('modbus.feedbackMapping.option.sameAddress'))}</option>
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
      ${escapeHtml(`${t(preset.scope === 'default' ? 'bridge.preset.scope.default' : 'bridge.preset.scope.user')} ${preset.name}`)}
    </option>
  `;

  const defaultOptions = bridgePresetState.defaultPresets.map(buildOptionHtml).join('');
  const userOptions = bridgePresetState.userPresets.length
    ? bridgePresetState.userPresets.map(buildOptionHtml).join('')
    : `<option value="${BRIDGE_USER_EMPTY_OPTION_VALUE}" disabled>${escapeHtml(t('bridge.preset.userEmpty'))}</option>`;

  select.innerHTML = `
    <option value="${DEFAULT_BRIDGE_PRESET_OPTION_VALUE}" ${normalizedSelectedValue === DEFAULT_BRIDGE_PRESET_OPTION_VALUE ? 'selected' : ''}>
      ${escapeHtml(t('bridge.preset.selectPlaceholder'))}
    </option>
    <optgroup label="${escapeHtml(t('bridge.preset.optgroup.default'))}">
      ${defaultOptions}
    </optgroup>
    <optgroup label="${escapeHtml(t('bridge.preset.optgroup.user'))}">
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
    bridgeElements.loadMappingsButton.textContent = t('bridge.button.loadSample');
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
    presetLabelText.textContent = t('bridge.preset.label');

    const presetSelect = document.createElement('select');
    presetSelect.id = 'bridgePresetSelect';
    presetLabel.append(presetLabelText, '\n', presetSelect);

    const nameLabel = document.createElement('label');
    nameLabel.className = 'stacked-field';

    const nameLabelText = document.createElement('span');
    nameLabelText.className = 'label-text';
    nameLabelText.textContent = t('bridge.preset.nameLabel');

    const nameInput = document.createElement('input');
    nameInput.id = 'bridgePresetNameInput';
    nameInput.placeholder = t('bridge.preset.namePlaceholder');
    nameLabel.append(nameLabelText, '\n', nameInput);

    const newPresetButton = document.createElement('button');
    newPresetButton.type = 'button';
    newPresetButton.id = 'bridgeNewPresetButton';
    newPresetButton.className = 'bridge-preset-new';
    newPresetButton.textContent = t('bridge.preset.button.new');

    const savePresetButton = document.createElement('button');
    savePresetButton.type = 'button';
    savePresetButton.id = 'bridgeSavePresetButton';
    savePresetButton.className = 'bridge-preset-save';
    savePresetButton.textContent = t('bridge.preset.button.save');

    const deletePresetButton = document.createElement('button');
    deletePresetButton.type = 'button';
    deletePresetButton.id = 'bridgeDeletePresetButton';
    deletePresetButton.className = 'bridge-preset-delete';
    deletePresetButton.textContent = t('bridge.preset.button.delete');

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
  setBridgePreviewModeText(t('bridge.preview.mode.newPreset'));
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

function getEmptyTableRow(colspan, key) {
  return `
    <tr>
      <td colspan="${colspan}" class="empty">${escapeHtml(t(key))}</td>
    </tr>
  `;
}

function syncLocalizedOptionLabels() {
  MODBUS_REG_TYPES.coil.label = t('modbus.regType.coil');
  MODBUS_REG_TYPES.discreteInput.label = t('modbus.regType.discreteInput');
  MODBUS_REG_TYPES.inputRegister.label = t('modbus.regType.inputRegister');
  MODBUS_REG_TYPES.holdingRegister.label = t('modbus.regType.holdingRegister');

  MODBUS_TYPE_LABELS.short = t('modbus.valueType.short');
  MODBUS_TYPE_LABELS.int = t('modbus.valueType.int');
  MODBUS_TYPE_LABELS.long = t('modbus.valueType.long');
  MODBUS_TYPE_LABELS.float = t('modbus.valueType.float');
  MODBUS_TYPE_LABELS.double = t('modbus.valueType.double');
  MODBUS_TYPE_LABELS.binary = t('modbus.valueType.binary');

  MODBUS_ACTION_LABELS.manual = t('modbus.action.manual');
  MODBUS_ACTION_LABELS.random = t('modbus.action.random');
  MODBUS_ACTION_LABELS.increment = t('modbus.action.increment');
  MODBUS_ACTION_LABELS.toggle = t('modbus.action.toggle');
  MODBUS_ACTION_LABELS.sine = t('modbus.action.sine');

  BRIDGE_TRANSFORM_TYPES[0].label = t('bridge.transform.raw');
  BRIDGE_TRANSFORM_TYPES[1].label = t('bridge.transform.number');
  BRIDGE_TRANSFORM_TYPES[2].label = t('bridge.transform.boolean');
  BRIDGE_TRANSFORM_TYPES[3].label = t('bridge.transform.string');
}

function getModbusLogActionLabel(value) {
  const actionMap = {
    讀取: 'modbus.logAction.read',
    寫入: 'modbus.logAction.write',
    不支援: 'modbus.logAction.unsupported',
    失敗: 'modbus.logAction.failed',
  };

  const key = actionMap[value];
  return key ? t(key) : (value || '-');
}

function getModbusLogStatusLabel(value) {
  const statusMap = {
    成功: 'modbus.logStatus.success',
    錯誤: 'modbus.logStatus.error',
  };

  const key = statusMap[value];
  return key ? t(key) : (value || '-');
}

function getRequestAddressBaseModeLabel(value) {
  return value === 'legacy-1-based-compatible'
    ? t('modbus.requestAddressBase.legacy')
    : t('modbus.requestAddressBase.standard');
}

function syncInjectedModbusFieldI18n() {
  const undefinedLabelText = document.querySelector('#modbusUndefinedBooleanModeSelect')?.closest('label')?.querySelector('.label-text');
  if (undefinedLabelText) {
    undefinedLabelText.childNodes[0].textContent = t('modbus.undefinedBoolean.label');
  }

  const undefinedIndicator = document.querySelector('#modbusUndefinedBooleanModeSelect')?.closest('label')?.querySelector('.tooltip-indicator');
  if (undefinedIndicator) {
    undefinedIndicator.dataset.tooltip = t('modbus.undefinedBoolean.tooltip');
    undefinedIndicator.setAttribute('aria-label', t('modbus.undefinedBoolean.aria'));
  }

  if (modbusElements.undefinedBooleanModeSelect) {
    renderStaticSelectOptions(
      modbusElements.undefinedBooleanModeSelect,
      [
        { value: 'compatibility-false', label: t('modbus.undefinedBoolean.option.compatibility') },
        { value: 'strict', label: t('modbus.undefinedBoolean.option.strict') },
      ],
      modbusElements.undefinedBooleanModeSelect.value || 'compatibility-false'
    );
  }

  const feedbackLabelText = document.querySelector('#modbusFeedbackMappingModeSelect')?.closest('label')?.querySelector('.label-text');
  if (feedbackLabelText) {
    feedbackLabelText.childNodes[0].textContent = t('modbus.feedbackMapping.label');
  }

  const feedbackIndicator = document.querySelector('#modbusFeedbackMappingModeSelect')?.closest('label')?.querySelector('.tooltip-indicator');
  if (feedbackIndicator) {
    feedbackIndicator.dataset.tooltip = t('modbus.feedbackMapping.tooltip');
    feedbackIndicator.setAttribute('aria-label', t('modbus.feedbackMapping.aria'));
  }

  if (modbusElements.feedbackMappingModeSelect) {
    renderStaticSelectOptions(
      modbusElements.feedbackMappingModeSelect,
      [
        { value: 'disabled', label: t('modbus.feedbackMapping.option.disabled') },
        { value: 'coil-to-discrete-same-address', label: t('modbus.feedbackMapping.option.sameAddress') },
      ],
      modbusElements.feedbackMappingModeSelect.value || 'disabled'
    );
  }
}

function syncBridgePresetControlI18n() {
  if (bridgeElements.presetSelect) {
    const placeholderOption = bridgeElements.presetSelect.querySelector(`option[value="${DEFAULT_BRIDGE_PRESET_OPTION_VALUE}"]`);
    if (placeholderOption) {
      placeholderOption.textContent = t('bridge.preset.selectPlaceholder');
    }

    const emptyOption = bridgeElements.presetSelect.querySelector(`option[value="${BRIDGE_USER_EMPTY_OPTION_VALUE}"]`);
    if (emptyOption) {
      emptyOption.textContent = t('bridge.preset.userEmpty');
    }

    const optgroups = bridgeElements.presetSelect.querySelectorAll('optgroup');
    if (optgroups[0]) {
      optgroups[0].label = t('bridge.preset.optgroup.default');
    }
    if (optgroups[1]) {
      optgroups[1].label = t('bridge.preset.optgroup.user');
    }
  }

  const presetLabel = document.querySelector('#bridgePresetSelect')?.closest('label')?.querySelector('.label-text');
  if (presetLabel) {
    presetLabel.textContent = t('bridge.preset.label');
  }

  const presetNameLabel = document.querySelector('#bridgePresetNameInput')?.closest('label')?.querySelector('.label-text');
  if (presetNameLabel) {
    presetNameLabel.textContent = t('bridge.preset.nameLabel');
  }

  if (bridgeElements.presetNameInput) {
    bridgeElements.presetNameInput.placeholder = t('bridge.preset.namePlaceholder');
  }

  if (bridgeElements.newPresetButton) {
    bridgeElements.newPresetButton.textContent = t('bridge.preset.button.new');
  }

  if (bridgeElements.savePresetButton) {
    bridgeElements.savePresetButton.textContent = t('bridge.preset.button.save');
  }

  if (bridgeElements.deletePresetButton) {
    bridgeElements.deletePresetButton.textContent = t('bridge.preset.button.delete');
  }
}

function syncBridgeMappingRowI18n() {
  bridgeElements.mappingTableBody.querySelectorAll('.bridge-mapping-path-input').forEach((input) => {
    input.placeholder = t('bridge.placeholder.jsonPath');
  });

  bridgeElements.mappingTableBody.querySelectorAll('.bridge-mapping-fallback-input').forEach((input) => {
    input.placeholder = t('bridge.placeholder.fallback');
  });

  bridgeElements.mappingTableBody.querySelectorAll('.bridge-delete-mapping-button').forEach((button) => {
    button.textContent = t('bridge.button.deleteMapping');
  });
}

function syncModbusPointTableI18n() {
  modbusElements.pointTableBody.querySelectorAll('.point-action-config-input').forEach((input) => {
    input.placeholder = t('modbus.placeholder.actionConfig');
  });

  modbusElements.pointTableBody.querySelectorAll('.apply-point-button').forEach((button) => {
    button.textContent = t('modbus.table.apply');
  });
}

function setTextContent(selector, key) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = t(key);
  }
}

function setTooltipText(selector, tooltipKey, ariaKey) {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }

  element.dataset.tooltip = t(tooltipKey);
  element.setAttribute('aria-label', t(ariaKey));
}

function setLabelTextForInput(selector, key) {
  const labelText = document.querySelector(selector)?.closest('label')?.querySelector('.label-text');
  if (labelText?.childNodes[0]) {
    labelText.childNodes[0].textContent = t(key);
  }
}

function setTooltipForInput(selector, tooltipKey, ariaKey) {
  const tooltip = document.querySelector(selector)?.closest('label')?.querySelector('.tooltip-indicator');
  if (!tooltip) {
    return;
  }

  tooltip.dataset.tooltip = t(tooltipKey);
  tooltip.setAttribute('aria-label', t(ariaKey));
}

function syncStaticLocaleText() {
  setTextContent('#startButton', 'api.button.start');
  setTextContent('#stopButton', 'api.button.stop');
  setTextContent('#restartButton', 'api.button.restart');
  setTextContent('#clearLogsButton', 'api.button.clearLogs');

  const currentUrlLabel = document.querySelector('#apiPanel .info-box .info-label');
  if (currentUrlLabel) {
    currentUrlLabel.textContent = t('api.info.currentUrl');
  }

  setTextContent('#modbusStartButton', 'modbus.button.start');
  setTextContent('#modbusStopButton', 'modbus.button.stop');
  setTextContent('#modbusRestartButton', 'modbus.button.restart');
  setTextContent('#generateRegistersButton', 'modbus.button.generate');
  setTextContent('#clearModbusPointsButton', 'modbus.button.clearPoints');
  setTextContent('#clearModbusLogsButton', 'modbus.button.clearLogs');

  const modbusInfoLabels = document.querySelectorAll('#modbusPanel .info-box .info-label');
  if (modbusInfoLabels[0]) {
    modbusInfoLabels[0].textContent = t('modbus.info.status');
  }
  if (modbusInfoLabels[1]) {
    modbusInfoLabels[1].textContent = t('modbus.info.endpoint');
  }

  setTextContent('#bridgeReloadMappingsButton', 'bridge.button.reload');
  setTextContent('#bridgeLoadMappingsButton', 'bridge.button.loadSample');
  setTextContent('#bridgeAddMappingButton', 'bridge.button.add');
  setTextContent('#bridgeSaveMappingsButton', 'bridge.button.save');
  setTextContent('#bridgePreviewButton', 'bridge.button.preview');

  setLabelTextForInput('#apiResponseSourceSelect', 'api.label.responseSource');
  setTooltipForInput('#apiResponseSourceSelect', 'api.tooltip.responseSource', 'api.tooltip.responseSource.aria');

  setLabelTextForInput('#modbusRequestAddressBaseModeSelect', 'modbus.label.requestAddressBaseMode');
  setLabelTextForInput('#modbusAddressInputModeSelect', 'modbus.label.addressInputMode');
  setLabelTextForInput('#modbusRegisterType', 'modbus.label.registerType');
  setTooltipForInput('#modbusRequestAddressBaseModeSelect', 'modbus.tooltip.requestAddressBaseMode', 'modbus.tooltip.requestAddressBaseMode.aria');
  setTooltipForInput('#modbusRegisterType', 'modbus.tooltip.registerType', 'modbus.tooltip.registerType.aria');
  setTooltipForInput('#modbusAddressInputModeSelect', 'modbus.tooltip.addressInputMode', 'modbus.tooltip.addressInputMode.aria');

  if (modbusElements.initialValueInput) {
    modbusElements.initialValueInput.placeholder = t('modbus.placeholder.initialValue');
  }
  if (modbusElements.actionConfigInput) {
    modbusElements.actionConfigInput.placeholder = t('modbus.placeholder.actionConfig');
  }

  if (apiElements.responseSourceSelect) {
    renderStaticSelectOptions(
      apiElements.responseSourceSelect,
      [
        { value: 'manual', label: t('api.option.responseSource.manual') },
        { value: 'bridge', label: t('api.option.responseSource.bridge') },
      ],
      apiElements.responseSourceSelect.value || 'manual'
    );
  }

  if (modbusElements.requestAddressBaseModeSelect) {
    renderStaticSelectOptions(
      modbusElements.requestAddressBaseModeSelect,
      [
        { value: 'standard-0-based', label: t('modbus.option.requestAddressBase.standard') },
        { value: 'legacy-1-based-compatible', label: t('modbus.option.requestAddressBase.legacy') },
      ],
      modbusElements.requestAddressBaseModeSelect.value || 'standard-0-based'
    );
  }

  if (modbusElements.registerTypeSelect) {
    renderStaticSelectOptions(
      modbusElements.registerTypeSelect,
      Object.entries(MODBUS_REG_TYPES).map(([value, definition]) => ({
        value,
        label: definition.label,
      })),
      modbusElements.registerTypeSelect.value || 'holdingRegister'
    );
  }

  if (modbusElements.addressInputModeSelect) {
    renderStaticSelectOptions(
      modbusElements.addressInputModeSelect,
      [
        { value: 'reference', label: t('modbus.option.addressInput.reference') },
        { value: 'protocol', label: t('modbus.option.addressInput.protocol') },
      ],
      modbusElements.addressInputModeSelect.value || 'reference'
    );
  }

  const apiLogSection = apiElements.clearLogsButton?.closest('.section-title-row');
  const apiLogTitle = apiLogSection?.querySelector('h2');
  const apiLogSummary = apiLogSection?.querySelector('.muted');
  if (apiLogTitle) {
    apiLogTitle.textContent = t('api.section.requestLog');
  }
  if (apiLogSummary) {
    apiLogSummary.textContent = t('api.text.requestLogSummary');
  }

  const apiLogHeaders = document.querySelectorAll('#apiPanel table thead th');
  const apiLogHeaderKeys = [
    'api.table.time',
    'api.table.method',
    'api.table.path',
    'api.table.scenario',
    'api.table.status',
  ];
  apiLogHeaders.forEach((header, index) => {
    if (apiLogHeaderKeys[index]) {
      header.textContent = t(apiLogHeaderKeys[index]);
    }
  });

  const modbusPointHeaders = document.querySelectorAll('.modbus-table thead th');
  const modbusPointHeaderKeys = [
    'modbus.table.enabled',
    'modbus.table.regType',
    'modbus.table.address',
    'modbus.table.display',
    'modbus.table.hexBits',
    'modbus.table.value',
    'modbus.table.type',
    'modbus.table.wordOrder',
    'modbus.table.action',
    'modbus.table.actionConfig',
    'modbus.table.apply',
  ];
  modbusPointHeaders.forEach((header, index) => {
    if (modbusPointHeaderKeys[index]) {
      header.textContent = t(modbusPointHeaderKeys[index]);
    }
  });

  const modbusLogSection = modbusElements.clearLogsButton?.closest('.section-title-row');
  const modbusLogTitle = modbusLogSection?.querySelector('h2');
  const modbusLogSummary = modbusLogSection?.querySelector('.muted');
  if (modbusLogTitle) {
    modbusLogTitle.textContent = t('modbus.section.requestLog');
  }
  if (modbusLogSummary) {
    modbusLogSummary.textContent = t('modbus.text.requestLogSummary');
  }

  const modbusLogHeaders = document.querySelectorAll('.modbus-log-table thead th');
  const modbusLogHeaderKeys = [
    'api.table.time',
    'modbus.table.client',
    'modbus.table.unitId',
    'modbus.table.fc',
    'modbus.table.regType',
    'modbus.table.action',
    'modbus.table.request',
    'modbus.table.resolved',
    'modbus.table.reference',
    'modbus.table.quantity',
    'modbus.table.valueBits',
    'modbus.table.response',
    'modbus.table.mode',
    'modbus.table.status',
    'modbus.table.message',
  ];
  modbusLogHeaders.forEach((header, index) => {
    if (modbusLogHeaderKeys[index]) {
      header.textContent = t(modbusLogHeaderKeys[index]);
    }
  });

  const bridgeHeaders = document.querySelectorAll('.bridge-mapping-table thead th');
  const bridgeHeaderKeys = [
    'bridge.table.enabled',
    'bridge.table.jsonPath',
    'bridge.table.sourceType',
    'bridge.table.protocolAddress',
    'bridge.table.transformType',
    'bridge.table.fallback',
    'bridge.table.actions',
  ];
  bridgeHeaders.forEach((header, index) => {
    if (bridgeHeaderKeys[index]) {
      header.textContent = t(bridgeHeaderKeys[index]);
    }
  });
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

  apiElements.bridgeStatusBadge.textContent = t(isBridgeEnabled ? 'status.bridge.enabled' : 'status.bridge.disabled');
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
          placeholder="${escapeHtml(t('bridge.placeholder.jsonPath'))}"
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
          placeholder="${escapeHtml(t('bridge.placeholder.fallback'))}"
        />
      </td>
      <td class="bridge-mapping-actions-cell">
        <button type="button" class="secondary bridge-delete-mapping-button">${escapeHtml(t('bridge.button.deleteMapping'))}</button>
      </td>
    </tr>
  `;
}

function renderBridgeMappingTable(mappings) {
  if (!mappings.length) {
    bridgeElements.mappingTableBody.innerHTML = getEmptyTableRow(7, 'bridge.table.empty');
    return;
  }

  const drafts = mappings.map((mapping) => (
    Object.hasOwn(mapping, 'rowId')
      ? mapping
      : createBridgeMappingDraft(mapping)
  ));

  bridgeElements.mappingTableBody.innerHTML = drafts.map(renderBridgeMappingRow).join('');
  syncBridgeMappingRowI18n();
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
        throw new Error(t('bridge.validation.jsonPathRequired', { index: rowIndex + 1 }));
  }

  if (normalizedPath.includes('[') || normalizedPath.includes(']')) {
        throw new Error(t('bridge.validation.jsonPathArrayUnsupported', { index: rowIndex + 1 }));
  }

  const segments = normalizedPath.split('.');

  if (segments.some((segment) => !segment.trim())) {
        throw new Error(t('bridge.validation.jsonPathInvalid', { index: rowIndex + 1 }));
  }

  return normalizedPath;
}

function normalizeBridgeProtocolAddress(addressText, rowIndex) {
  const parsed = Number.parseInt(String(addressText ?? '').trim(), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(t('bridge.validation.protocolAddressInvalid', { index: rowIndex + 1 }));
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

  throw new Error(t('bridge.validation.fallbackBooleanInvalid', { index: rowIndex + 1 }));
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
        throw new Error(t('bridge.validation.fallbackNumberInvalid', { index: rowIndex + 1 }));
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
  updateLocalizedBridgePresetSelectionHint();
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

function updateLocalizedBridgePresetSelectionHint() {
  const preset = getBridgePresetById(bridgeElements.presetSelect?.value);
  if (!preset) {
    setBridgePreviewModeText(t('bridge.preview.mode.newPreset'));
    return;
  }

  setBridgePreviewModeText(
    preset.scope === 'default'
      ? t('bridge.preview.mode.defaultPresetSelected', { name: preset.name })
      : t('bridge.preview.mode.userPresetSelected', { name: preset.name })
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
      setPanelMessage(bridgeElements.messageBox, t('bridge.message.presetListLoadError', { message: error.message }), 'error');
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
    apiElements.payloadValidation.textContent = t('api.payloadValidation.empty');
    apiElements.payloadValidation.className = 'message error';
    return false;
  }

  try {
    JSON.parse(text);

    apiElements.payloadValidation.textContent = showSuccess ? t('api.payloadValidation.valid') : '';
    apiElements.payloadValidation.className = showSuccess ? 'message success' : 'message';
    return true;
  } catch (error) {
    apiElements.payloadValidation.textContent = t('api.payloadValidation.invalid', { message: error.message });
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
  setPanelMessage(apiElements.messageBox, t('api.message.useEditedPayload'), 'success');
}

function formatJson() {
  try {
    const parsed = JSON.parse(apiElements.payloadEditor.value);
    apiElements.payloadEditor.value = JSON.stringify(parsed, null, 2);
    validatePayloadEditor(true);
  } catch (error) {
    apiElements.payloadValidation.textContent = t('api.payloadValidation.formatError', { message: error.message });
    apiElements.payloadValidation.className = 'message error';
  }
}

async function resetPayloadExample() {
  apiElements.payloadEditor.value = JSON.stringify(createExamplePayload(), null, 2);
  await window.mockMeterApi.setCustomPayloadText(apiElements.payloadEditor.value);
  validatePayloadEditor(false);
  setPanelMessage(apiElements.messageBox, t('api.message.resetPayloadExample'), 'success');
}

function renderApiStatus(status, options = {}) {
  const {
    syncConfig = true,
    syncScenario = true,
    syncUrl = true,
  } = options;

  lastApiStatus = status;
  apiElements.serverBadge.textContent = t(status.running ? 'status.api.running' : 'status.api.stopped');
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
  lastApiLogs = logs;
  if (!logs.length) {
    apiElements.logTableBody.innerHTML = getEmptyTableRow(5, 'api.table.empty');
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
    return t('modbus.logMessage.undefined', { value: log.undefinedAddresses.join(', ') });
  }

  if (log.undefinedAddressCount != null) {
    return t('modbus.logMessage.undefined', { value: log.undefinedAddressCount });
  }

  return t('modbus.logMessage.undefined', { value: '-' });
}

function formatModbusLogExceptionInfo(log) {
  if (!log.exceptionCode) {
    return '';
  }

  return t('modbus.logMessage.exception', { value: log.exceptionCode });
}

function formatModbusLogMessage(log) {
  const baseMessage = log.feedbackMessage ?? log.message ?? '-';
  const parts = [baseMessage];

  if (log.actionApplied !== undefined) {
    if (log.actionApplied) {
      const ids = Array.isArray(log.actionPointIds) && log.actionPointIds.length
        ? log.actionPointIds.join(', ')
        : null;
      parts.push(ids
        ? t('modbus.logMessage.actionAppliedIds', { ids })
        : t('modbus.logMessage.actionApplied'));
    } else {
      parts.push(t('modbus.logMessage.actionNotApplied'));
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

  return parts.join('; ');
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

  const localizedHintText = t('modbus.generator.hint', {
    regType: regTypeLabel,
    type: getTypeLabel(type),
    span,
    unit: t(
      regType === 'coil' || regType === 'discreteInput'
        ? 'modbus.generator.hint.unit.bit'
        : 'modbus.generator.hint.unit.register'
    ),
  });

  if (modbusElements.generatorHint) {
    modbusElements.generatorHint.dataset.tooltip = localizedHintText || hintText;
    modbusElements.generatorHint.setAttribute('aria-label', localizedHintText || hintText);
  }
}

function renderModbusStatus(status, options = {}) {
  const { syncConfig = true } = options;
  const running = Boolean(status.running);
  lastModbusStatus = status;

  modbusElements.statusBadge.textContent = running ? '執行中' : '已停止';
  modbusElements.statusBadge.className = running
    ? 'badge badge-running status-running'
    : 'badge badge-stopped status-stopped';
  modbusElements.statusBadge.textContent = t(running ? 'status.running' : 'status.stopped');

  if (apiElements.modbusStatusBadge) {
    apiElements.modbusStatusBadge.textContent = running ? 'Modbus 執行中' : 'Modbus 已停止';
    apiElements.modbusStatusBadge.className = running
      ? 'badge status-badge badge-running'
      : 'badge status-badge badge-stopped';
    apiElements.modbusStatusBadge.textContent = t(running ? 'status.modbus.running' : 'status.modbus.stopped');
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
  lastBridgePreview = previewResult;
  lastBridgePreviewOptions = options;
  const {
    sourceLabel = t('bridge.preview.source.currentTable'),
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
      bridgeElements.diagnosticsSummary.textContent = t('bridge.diagnostics.summary', { appliedCount, missingCount });
    }
  } else {
    bridgeElements.diagnosticsPreview.textContent = t('bridge.diagnostics.empty');
    if (bridgeElements.diagnosticsSummary) {
      bridgeElements.diagnosticsSummary.textContent = t('bridge.diagnostics.empty');
    }
  }
  setBridgePreviewModeText(
    t('bridge.preview.mode.previewResult', {
      sourceLabel,
      totalCount,
      enabledCount,
      appliedCount,
      missingCount,
    })
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
      <td>${escapeHtml(MODBUS_REG_TYPES[point.regType]?.label || point.regTypeLabel || point.regType)}</td>
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
          placeholder="${escapeHtml(t('modbus.placeholder.actionConfig'))}"
        />
      </td>
      <td><button class="secondary apply-point-button">${escapeHtml(t('modbus.table.apply'))}</button></td>
    </tr>
  `;
}

function renderModbusPoints(points) {
  lastModbusPoints = points;
  if (!points.length) {
    modbusPointDrafts.clear();
    modbusElements.pointTableBody.innerHTML = getEmptyTableRow(11, 'modbus.table.emptyPoints');
    return;
  }

  const activePointIds = new Set(points.map((point) => point.id));
  [...modbusPointDrafts.keys()].forEach((pointId) => {
    if (!activePointIds.has(pointId)) {
      modbusPointDrafts.delete(pointId);
    }
  });

  modbusElements.pointTableBody.innerHTML = points.map(renderModbusPointRow).join('');
  syncModbusPointTableI18n();
}

function renderModbusLogs(logs) {
  lastModbusLogs = logs;
  if (!logs.length) {
    modbusElements.logTableBody.innerHTML = getEmptyTableRow(15, 'modbus.table.emptyLogs');
    return;
  }

  modbusElements.logTableBody.innerHTML = logs.map((log) => `
    <tr>
      <td>${escapeHtml(log.time)}</td>
      <td>${escapeHtml(log.client)}</td>
      <td>${escapeHtml(String(log.unitId))}</td>
      <td>${escapeHtml(log.functionCode)}</td>
      <td>${escapeHtml(MODBUS_REG_TYPES[log.regType]?.label || log.regTypeLabel || log.regType || '-')}</td>
      <td>${escapeHtml(getModbusLogActionLabel(log.action))}</td>
      <td>${escapeHtml(formatModbusLogRequest(log))}</td>
      <td>${escapeHtml(formatModbusLogResolved(log))}</td>
      <td>${escapeHtml(formatModbusLogReference(log))}</td>
      <td>${escapeHtml(formatModbusLogAddress(log.requestQuantity ?? log.quantity))}</td>
      <td>${escapeHtml(formatModbusLogValueBits(log))}</td>
      <td>${escapeHtml(formatModbusLogResponse(log))}</td>
      <td>${escapeHtml(getRequestAddressBaseModeLabel(log.requestAddressBaseMode))}</td>
      <td>${escapeHtml(getModbusLogStatusLabel(log.status))}</td>
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

function applyDynamicLocale() {
  syncStaticLocaleText();
  syncLocalizedOptionLabels();
  syncInjectedModbusFieldI18n();
  syncBridgePresetControlI18n();
  syncModbusGeneratorTypeOptions();

  if (lastApiStatus) {
    renderApiStatus(lastApiStatus, {
      syncConfig: false,
      syncScenario: false,
      syncUrl: false,
    });
  }

  renderBridgeResponseSourceBadge(apiElements.responseSourceSelect?.value || 'manual');
  renderApiLogs(lastApiLogs);

  if (lastModbusStatus) {
    renderModbusStatus(lastModbusStatus, { syncConfig: false });
  }

  renderModbusPoints(lastModbusPoints);
  renderModbusLogs(lastModbusLogs);

  if (bridgeElements.presetSelect) {
    syncBridgePresetControlI18n();
  }

  if (bridgeElements.mappingTableBody) {
    syncBridgeMappingRowI18n();
  }

  if (lastBridgePreview) {
    renderBridgePreview(lastBridgePreview, lastBridgePreviewOptions || {});
  } else {
    updateLocalizedBridgePresetSelectionHint();
  }
}

function initI18n() {
  const initialLocale = setLocale(getLocale());

  if (localeElements.select) {
    localeElements.select.value = initialLocale;
    localeElements.select.addEventListener('change', () => {
      const nextLocale = setLocale(localeElements.select.value);
      localeElements.select.value = nextLocale;
      translateDom();
      applyDynamicLocale();
    });
  }

  translateDom();
  applyDynamicLocale();
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
    setPanelMessage(apiElements.messageBox, t('api.message.startSuccess'), 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, t('api.message.startError', { message: error.message }), 'error');
  }
}

async function stopApiServer() {
  try {
    const status = await window.mockMeterApi.stopServer();
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, t('api.message.stopSuccess'), 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, t('api.message.stopError', { message: error.message }), 'error');
  }
}

async function restartApiServer() {
  try {
    const status = await window.mockMeterApi.restartServer(getApiConfigFromForm());
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, t('api.message.restartSuccess'), 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, t('api.message.restartError', { message: error.message }), 'error');
  }
}

async function clearApiLogs() {
  const logs = await window.mockMeterApi.clearLogs();
  renderApiLogs(logs);
}

async function copyCommand(command) {
  await navigator.clipboard.writeText(command);
  apiElements.copiedCommand.textContent = command;
  setPanelMessage(apiElements.messageBox, t('api.message.copyCommand'), 'success');
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
      t('bridge.preview.mode.loadedMappings', { count: mappings.length })
    );

    if (!silent) {
      setPanelMessage(bridgeElements.messageBox, t('bridge.message.loadMappingsSuccess'), 'success');
    }
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.loadMappingsError', { message: error.message }), 'error');
  }
}

async function startModbusServer() {
  try {
    const status = await window.modbusSimulator.startServer(getModbusConfigFromForm());
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, t('modbus.message.startSuccess'), 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, t('modbus.message.startError', { message: error.message }), 'error');
  }
}

async function stopModbusServer() {
  try {
    const status = await window.modbusSimulator.stopServer();
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, t('modbus.message.stopSuccess'), 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, t('modbus.message.stopError', { message: error.message }), 'error');
  }
}

async function restartModbusServer() {
  try {
    const status = await window.modbusSimulator.restartServer(getModbusConfigFromForm());
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, t('modbus.message.restartSuccess'), 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, t('modbus.message.restartError', { message: error.message }), 'error');
  }
}

async function loadBridgePreset(options = {}) {
  const { silent = false } = options;

  try {
    const preset = getBridgePresetById(bridgeElements.presetSelect?.value);
    if (!preset) {
      throw new Error(t('bridge.message.loadPresetMissing'));
    }

    const mappings = cloneBridgePresetMappings(preset.mappings);
    renderBridgeMappingTable(mappings);
    setBridgePreviewModeText(
      t('bridge.preview.mode.presetLoaded', {
        scope: t(preset.scope === 'default' ? 'bridge.preset.scope.default' : 'bridge.preset.scope.user'),
        name: preset.name,
        count: mappings.length,
      })
    );

    if (!silent) {
      setPanelMessage(bridgeElements.messageBox, t('bridge.message.loadPresetSuccess', { name: preset.name }), 'success');
    }
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.loadPresetError', { message: error.message }), 'error');
  }
}

function addBridgeMapping() {
  const drafts = readBridgeMappingDraftsFromTable();
  drafts.push(createEmptyBridgeMappingDraft());
  renderBridgeMappingTable(drafts);
  setBridgePreviewModeText(t('bridge.preview.mode.mappingAdded'));
}

async function saveBridgeMappings() {
  try {
    const mappings = collectBridgeMappingsFromTable();
    const savedMappings = await window.bridgeSimulator.setMappings(mappings);
    renderBridgeMappingTable(savedMappings);
    setBridgePreviewModeText(
      t('bridge.preview.mode.mappingsSaved', { count: savedMappings.length })
    );
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.saveMappingsSuccess'), 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.saveMappingsError', { message: error.message }), 'error');
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
      t('bridge.preview.mode.presetSaved', {
        name: result.preset.name,
        count: result.preset.mappings.length,
      })
    );
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.savePresetSuccess', { name: result.preset.name }), 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.savePresetError', { message: error.message }), 'error');
  }
}

async function deleteBridgeUserPreset() {
  try {
    const preset = getBridgePresetById(bridgeElements.presetSelect?.value);
    if (!preset || preset.scope !== 'user') {
      throw new Error(t('bridge.message.deletePresetInvalid'));
    }

    const result = await window.bridgeSimulator.deleteUserPreset(preset.id);
    applyBridgePresetLists(
      bridgePresetState.defaultPresets,
      result.userPresets,
      DEFAULT_BRIDGE_PRESET_ID
    );
    setBridgePreviewModeText(t('bridge.preview.mode.presetDeleted', { name: preset.name }));
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.deletePresetSuccess', { name: preset.name }), 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.deletePresetError', { message: error.message }), 'error');
  }
}

async function previewBridgePayload() {
  try {
    const mappings = collectBridgeMappingsFromTable();
    const previewResult = await window.bridgeSimulator.getPreview(mappings);
    renderBridgePreview(previewResult, {
      sourceLabel: t('bridge.preview.source.currentTable'),
      totalCount: mappings.length,
      enabledCount: getEnabledBridgeMappingCount(mappings),
    });
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.previewSuccess'), 'success');
  } catch (error) {
    setPanelMessage(bridgeElements.messageBox, t('bridge.message.previewError', { message: error.message }), 'error');
  }
}

async function generateModbusRegisters() {
  try {
    const result = await window.modbusSimulator.generateRegisters(getRegisterGeneratorConfigFromForm());
    renderModbusStatus(result.status);
    renderModbusPoints(result.points);
    setPanelMessage(modbusElements.messageBox, t('modbus.message.generateSuccess'), 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, t('modbus.message.generateError', { message: error.message }), 'error');
  }
}

async function clearModbusPoints() {
  const confirmed = confirm(t('modbus.confirm.clearPoints'));

  if (!confirmed) {
    return;
  }

  try {
    const result = await window.modbusSimulator.clearPoints();
    renderModbusStatus(result.status);
    renderModbusPoints(result.points);
    setPanelMessage(modbusElements.messageBox, t('modbus.message.clearPointsSuccess'), 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, t('modbus.message.clearPointsError', { message: error.message }), 'error');
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
    setPanelMessage(modbusElements.messageBox, t('modbus.message.applyPointSuccess', { pointId }), 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, t('modbus.message.applyPointError', { message: error.message }), 'error');
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
  setBridgePreviewModeText(t('bridge.preview.mode.tableEdited'));
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
    setPanelMessage(apiElements.messageBox, t('api.message.responseSourceChangeError', { message: error.message }), 'error');
    const currentMode = await window.mockMeterApi.getResponseSourceMode();
    persistApiResponseSourceMode(currentMode);
  }
});

apiElements.scenarioSelect.addEventListener('change', async () => {
  await updatePayloadEditor();

  try {
    const status = await window.mockMeterApi.setScenario(apiElements.scenarioSelect.value);
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, t('api.message.scenarioChanged', { scenario: apiElements.scenarioSelect.value }), 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, t('api.message.scenarioChangeError', { message: error.message }), 'error');
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
modbusElements.clearPointsButton.addEventListener('click', clearModbusPoints);
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
  initI18n();
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
    updateLocalizedBridgePresetSelectionHint();
  });

  await refreshApiStatus();
  await updatePayloadEditor();
  await refreshApiLogs();

  await refreshModbusStatus();
  await refreshModbusPoints();
  await refreshModbusLogs();
  await refreshBridgePresets({ silent: true });
  await loadBridgeMappingsFromMain({ silent: true });
  updateLocalizedBridgePresetSelectionHint();

  setInterval(refreshApiStatus, 1500);
  setInterval(refreshApiLogs, 1000);
  setInterval(refreshModbusStatus, 1500);
  setInterval(refreshModbusPoints, 1000);
  setInterval(refreshModbusLogs, 1000);
}

init();
