const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT_DIR = __dirname;
const CONFIG_FILE_PATH = path.join(ROOT_DIR, 'application.properties');
const DATA_DIR_PATH = path.join(ROOT_DIR, 'data');
const APP_STATE_FILE_PATH = path.join(DATA_DIR_PATH, 'personnel-tracking-state.json');
const ENV_FILE_CANDIDATES = ['.env.local', '.env'];

const DEFAULT_PORT = 8080;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_STATUS = 'Active';
const DEFAULT_APP_STATE_REDIS_KEY = 'personnel-tracking-system-pro:app-state';
const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'TRY', 'GBP']);
const STATUS_OPTIONS = new Set(['Active', 'Probation', 'On Leave', 'Inactive']);
let redisClientPromise = null;

const PLAN_CATALOG = {
    starter: {
        name: 'Starter',
        unitAmount: 2900,
        currency: 'usd',
        description: 'A compact one-time purchase for solo operators and lightweight internal teams.'
    },
    growth: {
        name: 'Growth',
        unitAmount: 8900,
        currency: 'usd',
        description: 'Hosted checkout for agencies, HR consultants, and polished client deliveries.'
    }
};

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Server failed to start.', error);
        process.exit(1);
    });
}

async function startServer() {
    const config = await loadConfig();

    const server = http.createServer((request, response) => {
        handleRequest(request, response, config).catch((error) => {
            console.error('Unhandled request error.', error);
            sendJson(response, error.statusCode ?? 500, {
                message: error.message || 'Internal server error.'
            }, { cors: isApiRequest(request.url) });
        });
    });

    server.listen(config.port, () => {
        console.log(`Personnel Tracking System is running at ${config.baseUrl}`);
    });
}

async function handleRequest(request, response, config) {
    const requestUrl = new URL(request.url || '/', config.baseUrl);

    if (requestUrl.pathname.startsWith('/api/')) {
        await handleApiRequest(request, response, requestUrl, config);
        return;
    }

    await serveStaticAsset(request, response, requestUrl);
}

async function handleApiRequest(request, response, requestUrl, config) {
    if (request.method === 'OPTIONS') {
        sendEmpty(response, 204, { cors: true });
        return;
    }

    try {
        if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
            sendJson(response, 200, {
                ok: true,
                mode: 'backend',
                timestamp: new Date().toISOString()
            }, { cors: true });
            return;
        }

        if (request.method === 'GET' && requestUrl.pathname === '/api/app-state') {
            const appState = await readAppState();
            sendJson(response, 200, appState, { cors: true });
            return;
        }

        if (request.method === 'PUT' && requestUrl.pathname === '/api/app-state') {
            const requestBody = await readJsonBody(request);
            const normalizedState = normalizeAppState(requestBody);
            const savedState = await writeAppState(normalizedState);

            sendJson(response, 200, savedState, { cors: true });
            return;
        }

        if (request.method === 'POST' && requestUrl.pathname === '/api/checkout/session') {
            const requestBody = await readJsonBody(request);
            const checkoutSession = await createCheckoutSession(requestBody, config);

            sendJson(response, 200, checkoutSession, { cors: true });
            return;
        }

        if (request.method === 'POST' && requestUrl.pathname === '/api/webhook/stripe') {
            await handleStripeWebhook(request, response, config);
            return;
        }

        sendJson(response, 404, { message: 'API route not found.' }, { cors: true });
    } catch (error) {
        sendJson(response, error.statusCode ?? 500, {
            message: error.message || 'Request failed.'
        }, { cors: true });
    }
}

async function serveStaticAsset(request, response, requestUrl) {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
        sendText(response, 405, 'Method not allowed.');
        return;
    }

    const requestPath = requestUrl.pathname === '/'
        ? 'index.html'
        : requestUrl.pathname.replace(/^\/+/, '');

    const safePath = resolveStaticPath(requestPath);

    if (!safePath) {
        sendText(response, 403, 'Forbidden.');
        return;
    }

    try {
        const fileStats = await fs.stat(safePath);
        const filePath = fileStats.isDirectory()
            ? path.join(safePath, 'index.html')
            : safePath;

        const fileContent = await fs.readFile(filePath);
        const extension = path.extname(filePath).toLowerCase();

        response.writeHead(200, {
            'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
            'Content-Type': MIME_TYPES[extension] || 'application/octet-stream'
        });

        if (request.method === 'HEAD') {
            response.end();
            return;
        }

        response.end(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            sendText(response, 404, 'Not found.');
            return;
        }

        throw error;
    }
}

function resolveStaticPath(requestPath) {
    const normalizedPath = path.normalize(requestPath);
    const resolvedPath = path.resolve(ROOT_DIR, normalizedPath);

    if (!resolvedPath.startsWith(ROOT_DIR)) {
        return '';
    }

    return resolvedPath;
}

async function loadConfig() {
    const envOverrides = await loadEnvOverrides();
    const rawConfig = await fs.readFile(CONFIG_FILE_PATH, 'utf8').catch(() => '');
    const properties = parseProperties(rawConfig);
    const port = sanitizePort(readConfigValue('PORT', properties['server.port'], envOverrides));
    const baseUrl = normalizeBaseUrl(readConfigValue('BASE_URL', properties['app.base-url'], envOverrides), port);

    return {
        port,
        baseUrl,
        stripeSecretKey: String(readConfigValue('STRIPE_SECRET_KEY', properties['stripe.secret.key'], envOverrides)).trim(),
        stripeWebhookSecret: String(readConfigValue('STRIPE_WEBHOOK_SECRET', properties['stripe.webhook.secret'], envOverrides)).trim()
    };
}

async function loadEnvOverrides() {
    const overrides = {};

    for (const fileName of ENV_FILE_CANDIDATES) {
        const filePath = path.join(ROOT_DIR, fileName);
        const content = await fs.readFile(filePath, 'utf8').catch(() => '');

        if (!content) {
            continue;
        }

        Object.assign(overrides, parseEnvFile(content));
    }

    return overrides;
}

function readConfigValue(envKey, propertyValue, envOverrides) {
    const processValue = String(process.env[envKey] || '').trim();

    if (processValue) {
        return processValue;
    }

    const envFileValue = String(envOverrides?.[envKey] || '').trim();

    if (envFileValue) {
        return envFileValue;
    }

    return propertyValue || '';
}

function parseEnvFile(content) {
    return String(content)
        .split(/\r?\n/)
        .reduce((values, rawLine) => {
            const line = rawLine.trim();

            if (!line || line.startsWith('#')) {
                return values;
            }

            const normalizedLine = line.startsWith('export ')
                ? line.slice('export '.length).trim()
                : line;
            const separatorIndex = normalizedLine.indexOf('=');

            if (separatorIndex <= 0) {
                return values;
            }

            const key = normalizedLine.slice(0, separatorIndex).trim();
            const rawValue = normalizedLine.slice(separatorIndex + 1).trim();

            if (!key) {
                return values;
            }

            values[key] = normalizeEnvValue(rawValue);
            return values;
        }, {});
}

function normalizeEnvValue(value) {
    if (!value) {
        return '';
    }

    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
        return value.slice(1, -1);
    }

    const commentIndex = value.indexOf(' #');
    return commentIndex >= 0 ? value.slice(0, commentIndex).trim() : value;
}

function parseProperties(content) {
    return String(content)
        .split(/\r?\n/)
        .reduce((properties, rawLine) => {
            const line = rawLine.trim();

            if (!line || line.startsWith('#') || line.startsWith('!')) {
                return properties;
            }

            const separatorIndex = line.search(/[:=]/);
            const key = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : line;
            const value = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : '';

            if (key) {
                properties[key] = value;
            }

            return properties;
        }, {});
}

function sanitizePort(value) {
    const numericValue = Number.parseInt(String(value || ''), 10);
    return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : DEFAULT_PORT;
}

function normalizeBaseUrl(value, port) {
    const fallbackBaseUrl = `http://localhost:${port}`;
    const candidateValue = String(value || '').trim() || fallbackBaseUrl;

    try {
        return new URL(candidateValue).toString().replace(/\/$/, '');
    } catch (error) {
        return fallbackBaseUrl;
    }
}

async function readAppState() {
    const redisState = await readAppStateFromRedis();

    if (redisState) {
        return redisState;
    }

    try {
        const rawState = await fs.readFile(APP_STATE_FILE_PATH, 'utf8');
        return normalizeAppState(JSON.parse(rawState));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return createDefaultAppState();
        }

        if (error.name === 'SyntaxError') {
            return createDefaultAppState();
        }

        throw error;
    }
}

async function writeAppState(appState) {
    const didWriteToRedis = await writeAppStateToRedis(appState);

    if (didWriteToRedis) {
        return appState;
    }

    if (process.env.VERCEL) {
        throw createHttpError(
            503,
            'Persistent storage is not configured. Add the Upstash Redis integration in Vercel.'
        );
    }

    await fs.mkdir(DATA_DIR_PATH, { recursive: true });
    await fs.writeFile(APP_STATE_FILE_PATH, JSON.stringify(appState, null, 2));
    return appState;
}

async function readAppStateFromRedis() {
    const redis = await getRedisClient();

    if (!redis) {
        return null;
    }

    const storedState = await redis.get(getAppStateRedisKey());

    if (!storedState) {
        return null;
    }

    if (typeof storedState === 'string') {
        try {
            return normalizeAppState(JSON.parse(storedState));
        } catch (error) {
            return createDefaultAppState();
        }
    }

    return normalizeAppState(storedState);
}

async function writeAppStateToRedis(appState) {
    const redis = await getRedisClient();

    if (!redis) {
        return false;
    }

    await redis.set(getAppStateRedisKey(), appState);
    return true;
}

async function getRedisClient() {
    if (!isRedisStorageConfigured()) {
        return null;
    }

    if (!redisClientPromise) {
        redisClientPromise = import('@upstash/redis')
            .then((module) => {
                if (!module.Redis?.fromEnv) {
                    throw new Error('Redis.fromEnv is not available.');
                }

                const redisCredentials = getRedisCredentials();

                return new module.Redis({
                    url: redisCredentials.url,
                    token: redisCredentials.token
                });
            })
            .catch((error) => {
                redisClientPromise = null;
                throw createHttpError(
                    500,
                    `Upstash Redis is configured, but @upstash/redis could not be loaded: ${error.message}`
                );
            });
    }

    return redisClientPromise;
}

function isRedisStorageConfigured() {
    const redisCredentials = getRedisCredentials();
    return Boolean(redisCredentials.url && redisCredentials.token);
}

function getRedisCredentials() {
    return {
        url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
        token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ''
    };
}

function getAppStateRedisKey() {
    return process.env.APP_STATE_REDIS_KEY || DEFAULT_APP_STATE_REDIS_KEY;
}

function createDefaultAppState() {
    return {
        settings: {
            currency: DEFAULT_CURRENCY
        },
        personnel: []
    };
}

function normalizeAppState(payload) {
    const rawPersonnel = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.personnel)
            ? payload.personnel
            : [];

    return {
        settings: normalizeSettings(payload?.settings),
        personnel: rawPersonnel
            .map((person) => normalizePerson(person))
            .filter(Boolean)
    };
}

function normalizeSettings(settings) {
    const currency = String(settings?.currency || '').trim().toUpperCase();

    return {
        currency: SUPPORTED_CURRENCIES.has(currency) ? currency : DEFAULT_CURRENCY
    };
}

function normalizePerson(person) {
    const fullName = normalizeText(person?.fullName ?? person?.name, 120);
    const email = normalizeEmail(person?.email);
    const department = normalizeText(person?.department, 80) || 'General';
    const position = normalizeText(person?.position, 120);
    const status = STATUS_OPTIONS.has(person?.status) ? person.status : DEFAULT_STATUS;
    const startDate = normalizeDate(person?.startDate);
    const salary = decodeSalary(person?.salary);
    const notes = normalizeText(person?.notes, 2000);

    if (!fullName || !position || Number.isNaN(salary) || salary < 0) {
        return null;
    }

    const createdAt = normalizeTimestamp(person?.createdAt) || new Date().toISOString();
    const updatedAt = normalizeTimestamp(person?.updatedAt) || createdAt;

    return {
        id: normalizeId(person?.id),
        fullName,
        email,
        department,
        position,
        status,
        startDate,
        salary: encodeSalary(salary),
        notes,
        createdAt,
        updatedAt
    };
}

function normalizeText(value, maxLength) {
    return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeEmail(value) {
    const email = String(value ?? '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email) ? email : '';
}

function normalizeDate(value) {
    const date = String(value ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function normalizeTimestamp(value) {
    const timestamp = String(value ?? '').trim();
    return Number.isNaN(Date.parse(timestamp)) ? '' : new Date(timestamp).toISOString();
}

function normalizeId(value) {
    const id = String(value ?? '').trim();
    return id || crypto.randomUUID();
}

function decodeSalary(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const stringValue = String(value ?? '').trim();

    if (!stringValue) {
        return Number.NaN;
    }

    const numericValue = Number(stringValue);

    if (!Number.isNaN(numericValue)) {
        return numericValue;
    }

    try {
        const decodedValue = Buffer.from(stringValue, 'base64').toString('utf8');
        const pepper = 'v1-salary-pepper';

        if (!decodedValue.startsWith(pepper)) {
            return Number.NaN;
        }

        return Number(decodedValue.slice(pepper.length));
    } catch (error) {
        return Number.NaN;
    }
}

function encodeSalary(value) {
    const pepper = 'v1-salary-pepper';
    return Buffer.from(`${pepper}${String(value ?? '')}`, 'utf8').toString('base64');
}

async function createCheckoutSession(payload, config) {
    const planKey = String(payload?.planKey || '').trim().toLowerCase();
    const plan = PLAN_CATALOG[planKey];

    if (!plan) {
        throw createHttpError(400, 'Unsupported plan selected.');
    }

    if (!isValidStripeSecretKey(config.stripeSecretKey)) {
        throw createHttpError(503, 'Stripe secret key is not configured yet.');
    }

    const checkoutReference = sanitizeStripeReference(
        payload?.checkoutReference || createCheckoutReference(planKey)
    );

    const formData = new URLSearchParams();

    formData.set('mode', 'payment');
    formData.set('success_url', `${config.baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    formData.set('cancel_url', `${config.baseUrl}/?checkout=cancel&plan=${encodeURIComponent(planKey)}`);
    formData.set('client_reference_id', checkoutReference);
    formData.set('allow_promotion_codes', 'true');
    formData.set('submit_type', 'pay');
    formData.set('metadata[plan_key]', planKey);
    formData.set('metadata[checkout_reference]', checkoutReference);
    formData.set('line_items[0][price_data][currency]', plan.currency);
    formData.set('line_items[0][price_data][unit_amount]', String(plan.unitAmount));
    formData.set('line_items[0][price_data][product_data][name]', `Personnel Tracking System Pro - ${plan.name}`);
    formData.set('line_items[0][price_data][product_data][description]', plan.description);
    formData.set('line_items[0][quantity]', '1');

    const customerEmail = normalizeEmail(payload?.customerEmail);
    const companyName = normalizeText(payload?.companyName, 120);
    const teamSize = normalizeText(payload?.teamSize, 40);

    if (customerEmail) {
        formData.set('customer_email', customerEmail);
    }

    if (companyName) {
        formData.set('metadata[company_name]', companyName);
    }

    if (teamSize) {
        formData.set('metadata[team_size]', teamSize);
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Stripe-Version': '2026-02-25.clover'
        },
        body: formData
    });

    const stripePayload = await stripeResponse.json().catch(() => ({}));

    if (!stripeResponse.ok) {
        throw createHttpError(
            stripeResponse.status >= 500 ? 502 : 400,
            stripePayload?.error?.message || 'Stripe checkout session could not be created.'
        );
    }

    if (!stripePayload?.url) {
        throw createHttpError(502, 'Stripe did not return a checkout URL.');
    }

    return {
        checkoutUrl: stripePayload.url,
        sessionId: stripePayload.id,
        reference: checkoutReference,
        planKey
    };
}

function isValidStripeSecretKey(key) {
    return typeof key === 'string' && /^sk_(test|live)_[A-Za-z0-9]{10,}$/.test(key);
}

async function handleStripeWebhook(request, response, config) {
    if (!config.stripeWebhookSecret) {
        console.warn('Stripe webhook received but stripe.webhook.secret is not configured.');
        sendJson(response, 400, { message: 'Webhook secret is not configured.' });
        return;
    }

    const rawBody = await readRawBody(request);
    const signatureHeader = String(request.headers['stripe-signature'] || '');

    if (!verifyStripeSignature(rawBody, signatureHeader, config.stripeWebhookSecret)) {
        sendJson(response, 400, { message: 'Webhook signature verification failed.' });
        return;
    }

    let event;
    try {
        event = JSON.parse(rawBody.toString('utf8'));
    } catch (error) {
        sendJson(response, 400, { message: 'Invalid webhook payload.' });
        return;
    }

    const eventType = String(event?.type || '');

    if (eventType === 'checkout.session.completed') {
        const session = event.data?.object;
        console.log(
            `Stripe checkout completed: session=${session?.id} ` +
            `plan=${session?.metadata?.plan_key} ` +
            `reference=${session?.client_reference_id}`
        );
    }

    sendJson(response, 200, { received: true });
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
    try {
        const parts = String(signatureHeader).split(',');
        const timestampEntry = parts.find((p) => p.startsWith('t='));
        const signatureEntry = parts.find((p) => p.startsWith('v1='));

        if (!timestampEntry || !signatureEntry) return false;

        const timestamp = timestampEntry.slice(2);
        const providedSignature = signatureEntry.slice(3);

        if (!timestamp || !providedSignature) return false;

        const webhookTimestamp = Number(timestamp);
        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (Math.abs(currentTimestamp - webhookTimestamp) > 300) return false;

        const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
        const signedPayload = Buffer.concat([
            Buffer.from(timestamp, 'utf8'),
            Buffer.from('.', 'utf8'),
            bodyBuffer
        ]);

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(signedPayload);
        const computedSignature = hmac.digest('hex');

        const computedBuffer = Buffer.from(computedSignature, 'hex');
        let providedBuffer;

        try {
            providedBuffer = Buffer.from(providedSignature, 'hex');
        } catch (error) {
            return false;
        }

        if (computedBuffer.length !== providedBuffer.length) return false;

        return crypto.timingSafeEqual(computedBuffer, providedBuffer);
    } catch (error) {
        return false;
    }
}

async function readRawBody(request) {
    if (request.body !== undefined) {
        return normalizeRawBody(request.body);
    }

    const chunks = [];
    let totalLength = 0;

    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalLength += buffer.length;

        if (totalLength > 1_000_000) {
            throw createHttpError(413, 'Request body is too large.');
        }

        chunks.push(buffer);
    }

    return Buffer.concat(chunks);
}

function createCheckoutReference(planKey) {
    return sanitizeStripeReference(`pts_${planKey}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`);
}

function sanitizeStripeReference(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 150);
}

async function readJsonBody(request) {
    if (request.body !== undefined) {
        return normalizeJsonBody(request.body);
    }

    let body = '';

    for await (const chunk of request) {
        body += chunk;

        if (body.length > 1_000_000) {
            throw createHttpError(413, 'Request body is too large.');
        }
    }

    if (!body) {
        return {};
    }

    try {
        return JSON.parse(body);
    } catch (error) {
        throw createHttpError(400, 'Request body must be valid JSON.');
    }
}

function normalizeRawBody(body) {
    if (Buffer.isBuffer(body)) {
        return body;
    }

    if (typeof body === 'string') {
        return Buffer.from(body, 'utf8');
    }

    if (body && typeof body === 'object') {
        return Buffer.from(JSON.stringify(body), 'utf8');
    }

    return Buffer.alloc(0);
}

function normalizeJsonBody(body) {
    if (Buffer.isBuffer(body)) {
        return normalizeJsonBody(body.toString('utf8'));
    }

    if (typeof body === 'string') {
        if (!body) {
            return {};
        }

        try {
            return JSON.parse(body);
        } catch (error) {
            throw createHttpError(400, 'Request body must be valid JSON.');
        }
    }

    if (body && typeof body === 'object') {
        return body;
    }

    return {};
}

function sendJson(response, statusCode, payload, { cors = false } = {}) {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8'
    };

    if (cors) {
        applyCorsHeaders(headers);
    }

    response.writeHead(statusCode, headers);
    response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message, { cors = false } = {}) {
    const headers = {
        'Content-Type': 'text/plain; charset=utf-8'
    };

    if (cors) {
        applyCorsHeaders(headers);
    }

    response.writeHead(statusCode, headers);
    response.end(message);
}

function sendEmpty(response, statusCode, { cors = false } = {}) {
    const headers = {};

    if (cors) {
        applyCorsHeaders(headers);
    }

    response.writeHead(statusCode, headers);
    response.end();
}

function applyCorsHeaders(headers) {
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,OPTIONS';
    headers['Access-Control-Allow-Origin'] = '*';
}

function createHttpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isApiRequest(requestUrl) {
    return String(requestUrl || '').startsWith('/api/');
}

module.exports = {
    handleRequest,
    loadConfig,
    startServer
};
