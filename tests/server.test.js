const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { once } = require('node:events');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

test('server persists app state and protects checkout until Stripe is configured', async (t) => {
    const fixture = await startServerFixture();
    t.after(async () => {
        await fixture.close();
    });

    const healthResponse = await requestJson(`${fixture.baseUrl}/api/health`);
    assert.equal(healthResponse.statusCode, 200);
    assert.equal(healthResponse.payload.ok, true);

    const defaultStateResponse = await requestJson(`${fixture.baseUrl}/api/app-state`);
    assert.equal(defaultStateResponse.statusCode, 200);
    assert.deepEqual(defaultStateResponse.payload, {
        settings: { currency: 'USD' },
        personnel: []
    });

    const saveResponse = await requestJson(`${fixture.baseUrl}/api/app-state`, {
        body: {
            settings: { currency: 'TRY' },
            personnel: [
                {
                    fullName: 'Smoke Test User',
                    department: 'QA',
                    position: 'Engineer',
                    status: 'Active',
                    startDate: '2026-04-15',
                    salary: 5000,
                    notes: 'saved from test'
                }
            ]
        },
        method: 'PUT'
    });

    assert.equal(saveResponse.statusCode, 200);
    assert.equal(saveResponse.payload.settings.currency, 'TRY');
    assert.equal(saveResponse.payload.personnel.length, 1);
    assert.match(saveResponse.payload.personnel[0].salary, /^[A-Za-z0-9+/=]+$/);

    const roundtripResponse = await requestJson(`${fixture.baseUrl}/api/app-state`);
    assert.equal(roundtripResponse.statusCode, 200);
    assert.equal(roundtripResponse.payload.personnel.length, 1);
    assert.equal(roundtripResponse.payload.personnel[0].fullName, 'Smoke Test User');

    const checkoutResponse = await requestJson(`${fixture.baseUrl}/api/checkout/session`, {
        body: { planKey: 'starter' },
        method: 'POST'
    });

    assert.equal(checkoutResponse.statusCode, 503);
    assert.match(checkoutResponse.payload.message, /not configured/i);
});

async function startServerFixture() {
    const port = await getAvailablePort();
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'pts-server-test-'));

    await fs.copyFile(path.join(PROJECT_ROOT, 'server.js'), path.join(tempDirectory, 'server.js'));
    await fs.writeFile(
        path.join(tempDirectory, 'application.properties'),
        [
            `server.port=${port}`,
            'stripe.secret.key=sk_test_SENIN_TEST_KEYIN',
            `app.base-url=http://127.0.0.1:${port}`
        ].join('\n'),
        'utf8'
    );

    const child = spawn(process.execPath, ['server.js'], {
        cwd: tempDirectory,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const output = [];
    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));

    await waitForServer(`http://127.0.0.1:${port}/api/health`, child, output);

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        async close() {
            await stopChildProcess(child);
            await fs.rm(tempDirectory, { force: true, recursive: true });
        }
    };
}

async function getAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;

            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(port);
            });
        });

        server.on('error', reject);
    });
}

async function waitForServer(url, child, output) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 15_000) {
        if (child.exitCode !== null) {
            throw new Error(`Server exited early.\n${output.join('')}`);
        }

        try {
            const response = await requestJson(url);

            if (response.statusCode === 200) {
                return;
            }
        } catch (error) {
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(`Server did not start in time.\n${output.join('')}`);
}

async function stopChildProcess(child) {
    if (child.exitCode !== null) {
        return;
    }

    child.kill();

    try {
        await Promise.race([
            once(child, 'exit'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('exit timeout')), 5_000))
        ]);
    } catch (error) {
        child.kill('SIGKILL');
        await once(child, 'exit').catch(() => undefined);
    }
}

function requestJson(url, { body, method = 'GET' } = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request(url, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            method
        }, (response) => {
            let rawBody = '';

            response.setEncoding('utf8');
            response.on('data', (chunk) => {
                rawBody += chunk;
            });

            response.on('end', () => {
                let payload = null;

                try {
                    payload = rawBody ? JSON.parse(rawBody) : null;
                } catch (error) {
                    reject(error);
                    return;
                }

                resolve({
                    payload,
                    statusCode: response.statusCode || 0
                });
            });
        });

        request.on('error', reject);

        if (body !== undefined) {
            request.write(JSON.stringify(body));
        }

        request.end();
    });
}
