import './index.css';

const elements = {
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

function getConfigFromForm() {
  return {
    host: elements.hostInput.value.trim() || '127.0.0.1',
    port: Number(elements.portInput.value) || 3101,
    path: elements.pathInput.value.trim() || '/api/energy',
    delayMs: Number(elements.delayInput.value) || 0,
    scenario: elements.scenarioSelect.value,
  };
}

function setMessage(message, type = 'info') {
  elements.messageBox.textContent = message;
  elements.messageBox.className = `message ${type}`;
}

function updateUrlPreview() {
  const config = getConfigFromForm();
  const path = config.path.startsWith('/') ? config.path : `/${config.path}`;
  elements.currentUrl.textContent = `http://${config.host}:${config.port}${path}`;
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

  if (elements.scenarioSelect.value === 'no-total') {
    delete payload.total;
  }

  if (elements.scenarioSelect.value === 'invalid-schema') {
    payload.office.power = 'bad-value';
    delete payload.office.month;
  }

  return payload;
}

async function updatePayloadEditor() {
  if (elements.scenarioSelect.value === 'custom') {
    const customPayloadText = await window.mockMeterApi.getCustomPayloadText();
    elements.payloadEditor.value = customPayloadText;
    validatePayloadEditor(false);
    return;
  }

  const payload = createExamplePayload();
  elements.payloadEditor.value = JSON.stringify(payload, null, 2);
  validatePayloadEditor(false);
}

function validatePayloadEditor(showSuccess = true) {
  const text = elements.payloadEditor.value.trim();

  if (!text) {
    elements.payloadValidation.textContent = 'Payload is empty.';
    elements.payloadValidation.className = 'message error';
    return false;
  }

  try {
    JSON.parse(text);

    if (showSuccess) {
      elements.payloadValidation.textContent = 'JSON format is valid.';
      elements.payloadValidation.className = 'message success';
    } else {
      elements.payloadValidation.textContent = '';
      elements.payloadValidation.className = 'message';
    }

    return true;
  } catch (error) {
    elements.payloadValidation.textContent = `Invalid JSON: ${error.message}`;
    elements.payloadValidation.className = 'message error';
    return false;
  }
}

async function useEditedPayload() {
  const customPayloadText = elements.payloadEditor.value;

  await window.mockMeterApi.setCustomPayloadText(customPayloadText);
  elements.scenarioSelect.value = 'custom';
  const status = await window.mockMeterApi.setScenario('custom');

  renderStatus(status);
  validatePayloadEditor(true);
  setMessage('Edited payload is now active as custom scenario.', 'success');
}

async function formatJson() {
  if (!elements.payloadEditor) {
    setMessage('Payload Editor element not found. Check index.html textarea id="payloadEditor".', 'error');
    return;
  }

  try {
    const parsed = JSON.parse(elements.payloadEditor.value);
    elements.payloadEditor.value = JSON.stringify(parsed, null, 2);
    validatePayloadEditor(true);
  } catch (error) {
    elements.payloadValidation.textContent = `Cannot format invalid JSON: ${error.message}`;
    elements.payloadValidation.className = 'message error';
  }
}

async function resetPayloadExample() {
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

  elements.payloadEditor.value = JSON.stringify(payload, null, 2);
  await window.mockMeterApi.setCustomPayloadText(elements.payloadEditor.value);
  validatePayloadEditor(false);
  setMessage('Payload example reset.', 'success');
}

function renderStatus(status) {
  elements.serverBadge.textContent = status.running ? 'Running' : 'Stopped';
  elements.serverBadge.className = status.running
    ? 'badge badge-running'
    : 'badge badge-stopped';

  if (status.config) {
    elements.hostInput.value = status.config.host;
    elements.portInput.value = status.config.port;
    elements.pathInput.value = status.config.path;
    elements.delayInput.value = status.config.delayMs;

  }

  elements.currentUrl.textContent = status.url || elements.currentUrl.textContent;
}
function renderLogs(logs) {
  if (!logs.length) {
    elements.logTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty">No request logs.</td>
      </tr>
    `;
    return;
  }

  elements.logTableBody.innerHTML = logs.map((log) => {
    return `
      <tr>
        <td>${escapeHtml(log.time)}</td>
        <td>${escapeHtml(log.method)}</td>
        <td><code>${escapeHtml(log.path)}</code></td>
        <td>${escapeHtml(log.scenario)}</td>
        <td>${escapeHtml(String(log.statusCode))}</td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function refreshStatus() {
  const status = await window.mockMeterApi.getServerStatus();
  renderStatus(status);
}

async function refreshLogs() {
  const logs = await window.mockMeterApi.getLogs();
  renderLogs(logs);
}

async function startServer() {
  try {
    const status = await window.mockMeterApi.startServer(getConfigFromForm());
    renderStatus(status);
    setMessage('Server started.', 'success');
  } catch (error) {
    setMessage(`Start failed: ${error.message}`, 'error');
  }
}

async function stopServer() {
  try {
    const status = await window.mockMeterApi.stopServer();
    renderStatus(status);
    setMessage('Server stopped.', 'success');
  } catch (error) {
    setMessage(`Stop failed: ${error.message}`, 'error');
  }
}

async function restartServer() {
  try {
    const status = await window.mockMeterApi.restartServer(getConfigFromForm());
    renderStatus(status);
    setMessage('Server restarted.', 'success');
  } catch (error) {
    setMessage(`Restart failed: ${error.message}`, 'error');
  }
}

async function updateScenario() {
  try {
    const status = await window.mockMeterApi.setScenario(elements.scenarioSelect.value);
    renderStatus(status);
    setMessage(`Scenario changed to ${elements.scenarioSelect.value}.`, 'success');
  } catch (error) {
    setMessage(`Scenario update failed: ${error.message}`, 'error');
  }
}

async function clearLogs() {
  const logs = await window.mockMeterApi.clearLogs();
  renderLogs(logs);
}

async function copyCommand(command) {
  await navigator.clipboard.writeText(command);
  elements.copiedCommand.textContent = command;
  setMessage('Command copied.', 'success');
}

elements.startButton.addEventListener('click', startServer);
elements.stopButton.addEventListener('click', stopServer);
elements.restartButton.addEventListener('click', restartServer);
elements.clearLogsButton.addEventListener('click', clearLogs);

elements.hostInput.addEventListener('input', updateUrlPreview);
elements.portInput.addEventListener('input', updateUrlPreview);
elements.pathInput.addEventListener('input', updateUrlPreview);
elements.delayInput.addEventListener('input', updateUrlPreview);

elements.useEditedPayloadButton?.addEventListener('click', useEditedPayload);
elements.formatJsonButton?.addEventListener('click', formatJson);
elements.resetPayloadButton?.addEventListener('click', resetPayloadExample);
elements.payloadEditor?.addEventListener('input', () => validatePayloadEditor(false));

elements.scenarioSelect.addEventListener('change', async () => {
  await updatePayloadEditor();

  try {
    const status = await window.mockMeterApi.setScenario(elements.scenarioSelect.value);
    renderStatus(status);
    setMessage(`Scenario changed to ${elements.scenarioSelect.value}.`, 'success');
  } catch (error) {
    setMessage(`Scenario update failed: ${error.message}`, 'error');
  }
});

document.querySelectorAll('.copy-command').forEach((button) => {
  button.addEventListener('click', () => {
    copyCommand(button.dataset.command);
  });
});

async function init() {
  updateUrlPreview();
  await refreshStatus();
  await updatePayloadEditor();
  await refreshLogs();

  setInterval(refreshStatus, 1500);
  setInterval(refreshLogs, 1000);
}

init();