const { handleRequest, loadConfig } = require('../server');

let configPromise;

module.exports = async function handler(request, response) {
    if (!configPromise) {
        configPromise = loadConfig();
    }

    const config = await configPromise;

    await handleRequest(request, response, {
        ...config,
        baseUrl: resolveRequestBaseUrl(request, config.baseUrl)
    });
};

function resolveRequestBaseUrl(request, fallbackBaseUrl) {
    const host = request.headers['x-forwarded-host'] || request.headers.host;

    if (!host) {
        return fallbackBaseUrl;
    }

    const proto = request.headers['x-forwarded-proto'] || 'https';

    return `${proto}://${host}`;
}
