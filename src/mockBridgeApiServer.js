import http from 'node:http';
import { URL } from 'node:url';

const DEFAULT_BRIDGE_SERVER_CONFIG = {
    host: '127.0.0.1',
    port: 3201,
    path: '/api/bridge',
};

function nowIso() {
    return new Date().toISOString();
}

function toInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePath(path) {
    if (!path) {
        return DEFAULT_BRIDGE_SERVER_CONFIG.path;
    }

    return path.startsWith('/') ? path : `/${path}`;
}

function normalizeList(value) {
    return Array.isArray(value) ? value : [];
}

function assertFunction(name, value) {
    if (typeof value !== 'function') {
        throw new Error(`${name} must be a function`);
    }
}

function getRequestUrl(config, req) {
    return new URL(req.url || '/', `http://${config.host}:${config.port}`);
}

function createJsonHeaders() {
    return {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
    };
}

function resolveEnabledMappingCount(mappings) {
    return normalizeList(mappings).filter((mapping) => mapping?.enabled !== false).length;
}

function resolveMissingMappingCount(buildResult) {
    return normalizeList(buildResult?.diagnostics?.missingMappings).length;
}

function resolvePayload(buildResult) {
    if (
        buildResult
        && typeof buildResult === 'object'
        && !Array.isArray(buildResult)
        && Object.hasOwn(buildResult, 'payload')
    ) {
        return buildResult.payload;
    }

    return buildResult;
}

class MockBridgeApiServer {
    constructor({ getPoints, getMappings, buildPayload } = {}) {
        assertFunction('getPoints', getPoints);
        assertFunction('getMappings', getMappings);
        assertFunction('buildPayload', buildPayload);

        this.server = null;
        this.getPoints = getPoints;
        this.getMappings = getMappings;
        this.buildPayload = buildPayload;
        this.config = {
            ...DEFAULT_BRIDGE_SERVER_CONFIG,
        };
        this.logs = [];
    }

    getStatus() {
        return {
            running: Boolean(this.server),
            config: { ...this.config },
            url: this.getUrl(),
        };
    }

    getUrl() {
        const { host, port, path } = this.config;
        return `http://${host}:${port}${path}`;
    }

    getLogs() {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
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
                this.handleRequest(req, res).catch((error) => {
                    this.sendInternalError(req, res, error);
                });
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
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        return this.getStatus();
    }

    async restart(nextConfig = {}) {
        await this.stop();
        return this.start(nextConfig);
    }

    normalizeConfig(config) {
        return {
            host: config.host || DEFAULT_BRIDGE_SERVER_CONFIG.host,
            port: toInt(config.port, DEFAULT_BRIDGE_SERVER_CONFIG.port),
            path: normalizePath(config.path || DEFAULT_BRIDGE_SERVER_CONFIG.path),
        };
    }

    async handleRequest(req, res) {
        const requestUrl = getRequestUrl(this.config, req);
        const pathname = requestUrl.pathname;

        if (req.method !== 'GET') {
            this.sendJson(req, res, 405, { error: 'method not allowed' }, {
                message: 'method-not-allowed',
            });
            return;
        }

        if (pathname === '/health') {
            this.sendJson(req, res, 200, {
                ok: true,
                service: 'mock-bridge-api',
                timestamp: nowIso(),
            }, {
                message: 'health',
            });
            return;
        }

        if (pathname !== this.config.path) {
            this.sendJson(req, res, 404, { error: 'not found' }, {
                message: 'not-found',
            });
            return;
        }

        await this.respondBridgePayload(req, res);
    }

    async respondBridgePayload(req, res) {
        const points = normalizeList(await this.getPoints());
        const mappings = normalizeList(await this.getMappings());
        const buildResult = await this.buildPayload({
            points,
            mappings,
            includeTimestamp: true,
        });
        const payload = resolvePayload(buildResult);
        const mappingCount = resolveEnabledMappingCount(mappings);
        const missingMappingCount = resolveMissingMappingCount(buildResult);

        this.sendJson(req, res, 200, payload, {
            mappingCount,
            missingMappingCount,
            message: 'bridge-payload',
        });
    }

    sendInternalError(req, res, error) {
        if (res.writableEnded) {
            return;
        }

        this.sendJson(req, res, 500, {
            error: 'bridge payload build failed',
            message: error instanceof Error ? error.message : 'unknown error',
        }, {
            message: error instanceof Error ? error.message : 'unknown error',
        });
    }

    sendJson(req, res, statusCode, payload, logMeta = {}) {
        const body = JSON.stringify(payload, null, 2);

        res.writeHead(statusCode, createJsonHeaders());
        res.end(body);

        this.addLog(req, statusCode, logMeta);
    }

    addLog(req, statusCode, logMeta = {}) {
        const requestUrl = getRequestUrl(this.config, req);
        const item = {
            time: nowIso(),
            method: req.method || 'GET',
            path: requestUrl.pathname,
            statusCode,
            mappingCount: toInt(logMeta.mappingCount, 0),
            missingMappingCount: toInt(logMeta.missingMappingCount, 0),
            message: String(logMeta.message || ''),
        };

        this.logs.unshift(item);
        this.logs = this.logs.slice(0, 100);

        console.log(
            `[${item.time}] ${item.method} ${item.path} status=${statusCode} mappings=${item.mappingCount} missing=${item.missingMappingCount} ${item.message}`
        );
    }
}

export {
    DEFAULT_BRIDGE_SERVER_CONFIG,
    MockBridgeApiServer,
};
