import './index.css';
import { toReferenceAddress } from './modbusAddress.js';

const MODE_STORAGE_KEY = 'bms-protocol-mock-lab.activeMode';
const SUPPORTED_MODES = ['api', 'modbus', 'bridge'];

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

const apiElements = {
  hostInput: document.querySelector('#hostInput'),
  portInput: document.querySelector('#portInput'),
  pathInput: document.querySelector('#pathInput'),
  delayInput: document.querySelector('#delayInput'),
  scenarioSelect: document.querySelector('#scenarioSelect'),
  startButton: document.querySelector('#startButton'),
  stopButton: document.querySelector('#stopButton'),
  restartButton: document.querySelector('#restartButton'),
  clearLogsButton: document.querySelector('#clearLogsButton'),
  serverBadge: document.querySelector('#serverBadge'),
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

const modbusPointDrafts = new Map();

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
  label.className = 'full';
  label.textContent = '未建立布林位址處理模式';

  select = document.createElement('select');
  select.id = 'modbusUndefinedBooleanModeSelect';
  select.innerHTML = `
    <option value="compatibility-false" selected>Compatibility：未建立位址回 false / 0</option>
    <option value="strict">Strict：未建立位址回 exception</option>
  `;
  label.append('\n');
  label.append(select);

  const helpText = document.createElement('p');
  helpText.className = 'help-text';
  helpText.textContent = '若 BMS 一次讀取較大範圍，且範圍內包含未建立的 Coil / Discrete Input，可使用 Compatibility 模式避免整段讀取失敗。';

  buttonRow.before(helpText);
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
  label.className = 'full';
  label.textContent = '控制回饋映射模式 Feedback Mapping Mode';

  select = document.createElement('select');
  select.id = 'modbusFeedbackMappingModeSelect';
  select.innerHTML = `
    <option value="disabled" selected>Disabled：不自動回饋</option>
    <option value="coil-to-discrete-same-address">Coil write → Discrete Input same address</option>
  `;
  label.append('\n');
  label.append(select);

  const helpText = document.createElement('p');
  helpText.className = 'help-text';
  helpText.textContent = '啟用後，外部 BMS 寫入 Coil 控制點時，mock server 會自動更新同 offset 的 Discrete Input，模擬 PLC / DDC 狀態回饋。';

  buttonRow.before(helpText);
  buttonRow.before(label);

  return select;
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
  apiElements.serverBadge.className = status.running ? 'badge badge-running' : 'badge badge-stopped';

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

  modbusElements.generatorHint.textContent = [
    `${regTypeLabel} 的 Address 使用 Modbus protocol address，從 0 開始。`,
    `Display Address 僅供對照點表。`,
    `${getTypeLabel(type)} 每個點位需要 ${span} 個 ${regType === 'coil' || regType === 'discreteInput' ? 'bit 位址' : 'register 位址'}。`,
  ].join(' ');
}

function renderModbusStatus(status, options = {}) {
  const { syncConfig = true } = options;
  const running = Boolean(status.running);

  modbusElements.statusBadge.textContent = running ? '執行中' : '已停止';
  modbusElements.statusBadge.className = running
    ? 'badge badge-running status-running'
    : 'badge badge-stopped status-stopped';

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

async function init() {
  initModeTabs();
  updateUrlPreview();
  modbusElements.feedbackMappingModeSelect = ensureModbusFeedbackMappingModeField();
  modbusElements.undefinedBooleanModeSelect = ensureModbusUndefinedBooleanModeField();
  syncModbusGeneratorTypeOptions();

  await refreshApiStatus();
  await updatePayloadEditor();
  await refreshApiLogs();

  await refreshModbusStatus();
  await refreshModbusPoints();
  await refreshModbusLogs();

  setInterval(refreshApiStatus, 1500);
  setInterval(refreshApiLogs, 1000);
  setInterval(refreshModbusStatus, 1500);
  setInterval(refreshModbusPoints, 1000);
  setInterval(refreshModbusLogs, 1000);
}

init();
