import './index.css';

const MODE_STORAGE_KEY = 'bms-protocol-mock-lab.activeMode';
const SUPPORTED_MODES = ['api', 'modbus', 'bridge'];

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
  startButton: document.querySelector('#modbusStartButton'),
  stopButton: document.querySelector('#modbusStopButton'),
  restartButton: document.querySelector('#modbusRestartButton'),
  statusBadge: document.querySelector('#modbusServerStatus'),
  endpoint: document.querySelector('#modbusEndpoint'),
  unitIdText: document.querySelector('#modbusCurrentUnitId'),
  messageBox: document.querySelector('#modbusMessageBox'),
  registerTypeSelect: document.querySelector('#modbusRegisterType'),
  startAddressInput: document.querySelector('#modbusStartAddressInput'),
  countInput: document.querySelector('#modbusCountInput'),
  typeSelect: document.querySelector('#modbusValueType'),
  wordOrderSelect: document.querySelector('#modbusWordOrder'),
  initialValueInput: document.querySelector('#modbusInitialValueInput'),
  generateButton: document.querySelector('#generateRegistersButton'),
  pointTableBody: document.querySelector('#modbusPointTableBody'),
  logTableBody: document.querySelector('#modbusLogTableBody'),
  clearLogsButton: document.querySelector('#clearModbusLogsButton'),
};

const modbusPointDrafts = new Map();

function readIntOrFallback(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readNumberOrFallback(value, fallback) {
  const parsed = Number(value);
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
  };
}

function getRegisterGeneratorConfigFromForm() {
  return {
    regType: modbusElements.registerTypeSelect.value,
    startAddress: readIntOrFallback(modbusElements.startAddressInput.value, 0),
    count: readIntOrFallback(modbusElements.countInput.value, 1),
    type: modbusElements.typeSelect.value,
    wordOrder: modbusElements.wordOrderSelect.value,
    initialValue: readNumberOrFallback(modbusElements.initialValueInput.value, 0),
  };
}

function updateUrlPreview() {
  const config = getApiConfigFromForm();
  const path = config.path.startsWith('/') ? config.path : `/${config.path}`;
  apiElements.currentUrl.textContent = `http://${config.host}:${config.port}${path}`;
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

    if (showSuccess) {
      apiElements.payloadValidation.textContent = 'JSON 格式正確。';
      apiElements.payloadValidation.className = 'message success';
    } else {
      apiElements.payloadValidation.textContent = '';
      apiElements.payloadValidation.className = 'message';
    }

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
  setPanelMessage(apiElements.messageBox, '已將編輯後的 payload 套用為 custom 情境。', 'success');
}

async function formatJson() {
  try {
    const parsed = JSON.parse(apiElements.payloadEditor.value);
    apiElements.payloadEditor.value = JSON.stringify(parsed, null, 2);
    validatePayloadEditor(true);
  } catch (error) {
    apiElements.payloadValidation.textContent = `無法格式化錯誤的 JSON：${error.message}`;
    apiElements.payloadValidation.className = 'message error';
  }
}

async function resetPayloadExample() {
  apiElements.payloadEditor.value = JSON.stringify(createExamplePayload(), null, 2);
  await window.mockMeterApi.setCustomPayloadText(apiElements.payloadEditor.value);
  validatePayloadEditor(false);
  setPanelMessage(apiElements.messageBox, 'Payload 範例已重設。', 'success');
}

function renderApiStatus(status, options = {}) {
  const {
    syncConfig = true,
    syncScenario = true,
    syncUrl = true,
  } = options;

  apiElements.serverBadge.textContent = status.running ? '執行中' : '已停止';
  apiElements.serverBadge.className = status.running
    ? 'badge badge-running'
    : 'badge badge-stopped';

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
    apiElements.logTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty">目前沒有請求記錄。</td>
      </tr>
    `;
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
  }
}

function renderModbusPoints(points) {
  if (!points.length) {
    modbusPointDrafts.clear();
    modbusElements.pointTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="empty">尚未產生任何 registers。</td>
      </tr>
    `;
    return;
  }

  const activePointIds = new Set(points.map((point) => point.id));
  [...modbusPointDrafts.keys()].forEach((pointId) => {
    if (!activePointIds.has(pointId)) {
      modbusPointDrafts.delete(pointId);
    }
  });

  modbusElements.pointTableBody.innerHTML = points.map((point) => {
    const draft = modbusPointDrafts.get(point.id);
    const value = draft?.value ?? point.value;
    const wordOrder = draft?.wordOrder ?? point.wordOrder;

    return `
      <tr data-point-id="${escapeHtml(point.id)}">
        <td><input type="checkbox" ${point.enabled ? 'checked' : ''} disabled /></td>
        <td>${escapeHtml(point.regType)}</td>
        <td>${escapeHtml(String(point.address))}</td>
        <td>${escapeHtml(String(point.displayAddress))}</td>
        <td><code>${escapeHtml(point.hex.join(' '))}</code></td>
        <td>
          <input class="inline-input point-value-input" value="${escapeHtml(String(value))}" />
        </td>
        <td>${escapeHtml(point.type)}</td>
        <td>
          <select class="small-select point-word-order-select">
            <option value="HL" ${wordOrder === 'HL' ? 'selected' : ''}>HL</option>
            <option value="LH" ${wordOrder === 'LH' ? 'selected' : ''}>LH</option>
          </select>
        </td>
        <td>${escapeHtml(point.action)}</td>
        <td><button class="secondary apply-point-button">套用</button></td>
      </tr>
    `;
  }).join('');
}

function renderModbusLogs(logs) {
  if (!logs.length) {
    modbusElements.logTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">目前沒有 Modbus 請求記錄。</td>
      </tr>
    `;
    return;
  }

  modbusElements.logTableBody.innerHTML = logs.map((log) => `
    <tr>
      <td>${escapeHtml(log.time)}</td>
      <td>${escapeHtml(log.client)}</td>
      <td>${escapeHtml(String(log.unitId))}</td>
      <td>${escapeHtml(log.functionCode)}</td>
      <td>${escapeHtml(log.action)}</td>
      <td>${escapeHtml(log.address ?? '-')}</td>
      <td>${escapeHtml(log.quantity ?? '-')}</td>
      <td>${escapeHtml(log.status)}</td>
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
    setPanelMessage(apiElements.messageBox, 'Server 已啟動。', 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `啟動失敗：${error.message}`, 'error');
  }
}

async function stopApiServer() {
  try {
    const status = await window.mockMeterApi.stopServer();
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, 'Server 已停止。', 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `停止失敗：${error.message}`, 'error');
  }
}

async function restartApiServer() {
  try {
    const status = await window.mockMeterApi.restartServer(getApiConfigFromForm());
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, 'Server 已重新啟動。', 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `重新啟動失敗：${error.message}`, 'error');
  }
}

async function clearApiLogs() {
  const logs = await window.mockMeterApi.clearLogs();
  renderApiLogs(logs);
}

async function copyCommand(command) {
  await navigator.clipboard.writeText(command);
  apiElements.copiedCommand.textContent = command;
  setPanelMessage(apiElements.messageBox, '指令已複製。', 'success');
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
    setPanelMessage(modbusElements.messageBox, 'Modbus server 已啟動。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `啟動失敗：${error.message}`, 'error');
  }
}

async function stopModbusServer() {
  try {
    const status = await window.modbusSimulator.stopServer();
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, 'Modbus server 已停止。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `停止失敗：${error.message}`, 'error');
  }
}

async function restartModbusServer() {
  try {
    const status = await window.modbusSimulator.restartServer(getModbusConfigFromForm());
    renderModbusStatus(status);
    setPanelMessage(modbusElements.messageBox, 'Modbus server 已重新啟動。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `重新啟動失敗：${error.message}`, 'error');
  }
}

async function generateModbusRegisters() {
  try {
    const result = await window.modbusSimulator.generateRegisters(getRegisterGeneratorConfigFromForm());
    renderModbusStatus(result.status);
    renderModbusPoints(result.points);
    setPanelMessage(modbusElements.messageBox, 'Registers 已產生。', 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `產生失敗：${error.message}`, 'error');
  }
}

async function applyModbusPointUpdate(row) {
  const pointId = row.dataset.pointId;
  const value = row.querySelector('.point-value-input')?.value ?? '';
  const wordOrder = row.querySelector('.point-word-order-select')?.value ?? 'HL';

  try {
    const result = await window.modbusSimulator.updatePoint({
      id: pointId,
      value,
      wordOrder,
    });

    modbusPointDrafts.delete(pointId);
    renderModbusStatus(result.status);
    renderModbusPoints(result.points);
    setPanelMessage(modbusElements.messageBox, `點位 ${pointId} 已更新。`, 'success');
  } catch (error) {
    setPanelMessage(modbusElements.messageBox, `套用失敗：${error.message}`, 'error');
  }
}

async function clearModbusLogs() {
  const logs = await window.modbusSimulator.clearLogs();
  renderModbusLogs(logs);
}

function handlePointDraftInput(event) {
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
  }
}

function handlePointDraftChange(event) {
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

apiElements.useEditedPayloadButton?.addEventListener('click', useEditedPayload);
apiElements.formatJsonButton?.addEventListener('click', formatJson);
apiElements.resetPayloadButton?.addEventListener('click', resetPayloadExample);
apiElements.payloadEditor?.addEventListener('input', () => validatePayloadEditor(false));

apiElements.scenarioSelect.addEventListener('change', async () => {
  await updatePayloadEditor();

  try {
    const status = await window.mockMeterApi.setScenario(apiElements.scenarioSelect.value);
    renderApiStatus(status);
    setPanelMessage(apiElements.messageBox, `情境已切換為 ${apiElements.scenarioSelect.value}。`, 'success');
  } catch (error) {
    setPanelMessage(apiElements.messageBox, `情境更新失敗：${error.message}`, 'error');
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
modbusElements.pointTableBody.addEventListener('input', handlePointDraftInput);
modbusElements.pointTableBody.addEventListener('change', handlePointDraftChange);
modbusElements.pointTableBody.addEventListener('click', handlePointTableClick);

async function init() {
  initModeTabs();
  updateUrlPreview();

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
