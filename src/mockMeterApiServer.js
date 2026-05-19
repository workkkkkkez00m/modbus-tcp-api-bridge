import http from 'node:http';
import { URL } from 'node:url';

const SUPPORTED_SCENARIOS = [
    'normal',
    'no-total',
    'http-500',
    'invalid-json',
    'invalid-schema',
    'timeout',
    'custom',
];

function nowIso() {
    return new Date().toISOString();
}

function round1(value) {
    return Math.round(value * 10) / 10;
}

function toInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePath(path) {
    if (!path) return '/api/energy';
    return path.startsWith('/') ? path : `/${path}`;
}

function createPayload({ includeTotal = true } = {}) {
    const t = Date.now() / 1000;

    const officePower = round1(102 + Math.sin(t / 4) * 7);
    const residentialPower = round1(155 + Math.cos(t / 5) * 10);

    const officeToday = round1(1150.3 + (officePower - 100) * 0.2);
    const residentialToday = round1(2100.5 + (residentialPower - 150) * 0.2);

    const officeMonth = round1(30139.5 + (officePower - 100) * 1.2);
    const residentialMonth = round1(55100.7 + (residentialPower - 150) * 1.2);

    const payload = {
        office: {
            power: officePower,
            today: officeToday,
            month: officeMonth,
        },
        residential: {
            power: residentialPower,
            today: residentialToday,
            month: residentialMonth,
        },
        timestamp: nowIso(),
    };

    if (includeTotal) {
        payload.total = {
            power: round1(officePower + residentialPower),
            today: round1(officeToday + residentialToday),
            month: round1(officeMonth + residentialMonth),
        };
    }

    return payload;
}

function createInvalidSchemaPayload() {
    return {
        office: {
            power: 'bad-value',
            today: 1150.3,
            // month intentionally missing
        },
        residential: {
            power: 150.2,
            today: 2100.5,
            month: 55100.7,
        },
        timestamp: nowIso(),
    };
}

class MockMeterApiServer {
    constructor() {
        this.server = null;
        this.config = {
            host: '127.0.0.1',
            port: 3101,
            path: '/api/energy',
            delayMs: 0,
            scenario: 'normal',
            customPayloadText: JSON.stringify(createPayload({ includeTotal: true }), null, 2),
        };
        this.logs = [];
    }

    getSupportedScenarios() {
        return [...SUPPORTED_SCENARIOS];
    }

    getStatus() {
        return {
            running: Boolean(this.server),
            config: { ...this.config },
            url: this.getUrl(),
            supportedScenarios: this.getSupportedScenarios(),
        };
    }

    getUrl() {
        const { host, port, path } = this.config;
        return `http://${host}:${port}${normalizePath(path)}`;
    }

    getLogs() {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
    }

    setScenario(scenario) {
        if (!SUPPORTED_SCENARIOS.includes(scenario)) {
            throw new Error(`Unsupported scenario: ${scenario}`);
        }

        this.config.scenario = scenario;
        return this.getStatus();
    }

    setCustomPayloadText(customPayloadText) {
        this.config.customPayloadText = String(customPayloadText ?? '');
        return this.getStatus();
    }

    getCustomPayloadText() {
        return this.config.customPayloadText || '';
    }

    async start(nextConfig = {}) {
        if (this.server) {
            return this.getStatus();
        }

        this.config = this.normalizeConfig({
            ...this.config,
            ...nextConfig,
        });

        await new Promise((resolve, reject) => {
            const server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            server.on('error', reject);

            server.listen(this.config.port, this.config.host, () => {
                server.off('error', reject);
                this.server = server;
                resolve();
            });
        });

        return this.getStatus();
    }

    async stop() {
        if (!this.server) {
            return this.getStatus();
        }

        const serverToClose = this.server;
        this.server = null;

        await new Promise((resolve, reject) => {
            serverToClose.close((error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        return this.getStatus();
    }

    async restart(nextConfig = {}) {
        await this.stop();
        return this.start(nextConfig);
    }

    normalizeConfig(config) {
        const scenario = SUPPORTED_SCENARIOS.includes(config.scenario)
            ? config.scenario
            : 'normal';

        return {
            host: config.host || '127.0.0.1',
            port: toInt(config.port, 3101),
            path: normalizePath(config.path || '/api/energy'),
            delayMs: Math.max(0, toInt(config.delayMs, 0)),
            scenario,
            customPayloadText: String(config.customPayloadText ?? this.config.customPayloadText ?? ''),
        };
    }

    handleRequest(req, res) {
        const requestUrl = new URL(req.url, `http://${this.config.host}:${this.config.port}`);
        const pathname = requestUrl.pathname;

        if (req.method !== 'GET') {
            this.sendJson(req, res, 405, { error: 'method not allowed' }, 'method-not-allowed');
            return;
        }

        if (pathname === '/health') {
            this.sendJson(req, res, 200, {
                ok: true,
                service: 'mock-meter-api',
                timestamp: nowIso(),
            }, 'health');
            return;
        }

        if (pathname !== this.config.path) {
            this.sendJson(req, res, 404, { error: 'not found' }, 'not-found');
            return;
        }

        const queryScenario = requestUrl.searchParams.get('scenario');
        const scenario = SUPPORTED_SCENARIOS.includes(queryScenario)
            ? queryScenario
            : this.config.scenario;

        const delayMs = scenario === 'timeout'
            ? Math.max(10000, this.config.delayMs)
            : this.config.delayMs;

        setTimeout(() => {
            this.respondEnergy(req, res, scenario);
        }, delayMs);
    }

    respondEnergy(req, res, scenario) {
        if (scenario === 'custom') {
            this.sendRaw(req, res, 200, this.config.customPayloadText || '', scenario);
            return;
        }
        if (scenario === 'http-500') {
            this.sendJson(req, res, 500, { error: 'mock http 500' }, scenario);
            return;
        }

        if (scenario === 'invalid-json') {
            const body = '{"office": {"power": 100.3}, "residential": ';
            this.sendRaw(req, res, 200, body, scenario);
            return;
        }

        if (scenario === 'invalid-schema') {
            this.sendJson(req, res, 200, createInvalidSchemaPayload(), scenario);
            return;
        }

        if (scenario === 'no-total') {
            this.sendJson(req, res, 200, createPayload({ includeTotal: false }), scenario);
            return;
        }

        this.sendJson(req, res, 200, createPayload({ includeTotal: true }), scenario);
    }

    sendJson(req, res, statusCode, payload, scenario) {
        const body = JSON.stringify(payload, null, 2);

        res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store',
        });

        res.end(body);
        this.addLog(req, scenario, statusCode);
    }

    sendRaw(req, res, statusCode, body, scenario) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store',
        });

        res.end(body);
        this.addLog(req, scenario, statusCode);
    }

    addLog(req, scenario, statusCode) {
        const item = {
            time: nowIso(),
            method: req.method,
            path: req.url,
            scenario,
            statusCode,
        };

        this.logs.unshift(item);
        this.logs = this.logs.slice(0, 100);

        console.log(`[${item.time}] ${item.method} ${item.path} scenario=${scenario} status=${statusCode}`);
    }
}

export {
    MockMeterApiServer,
    SUPPORTED_SCENARIOS,
};