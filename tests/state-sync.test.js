const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveAppStateSource } = require('../app-state-sync.js');

function createState({ currency = 'USD', personnel = [] } = {}) {
    return {
        settings: { currency },
        personnel
    };
}

function createPerson(updatedAt) {
    return {
        id: `person-${updatedAt}`,
        fullName: 'Test User',
        department: 'QA',
        position: 'Engineer',
        salary: 5000,
        updatedAt
    };
}

test('prefers local state when the backend is still empty', () => {
    const resolution = resolveAppStateSource(
        createState({
            personnel: [createPerson('2026-04-15T09:00:00.000Z')]
        }),
        createState()
    );

    assert.deepEqual(resolution, {
        reason: 'local-only',
        shouldSyncLocalToRemote: true,
        source: 'local'
    });
});

test('prefers the newer remote dataset when timestamps are newer on the server', () => {
    const resolution = resolveAppStateSource(
        createState({
            personnel: [createPerson('2026-04-14T09:00:00.000Z')]
        }),
        createState({
            personnel: [createPerson('2026-04-15T09:00:00.000Z')]
        })
    );

    assert.deepEqual(resolution, {
        reason: 'remote-newer',
        shouldSyncLocalToRemote: false,
        source: 'remote'
    });
});

test('prefers local custom settings when both datasets are otherwise empty', () => {
    const resolution = resolveAppStateSource(
        createState({ currency: 'TRY' }),
        createState()
    );

    assert.deepEqual(resolution, {
        reason: 'local-only',
        shouldSyncLocalToRemote: true,
        source: 'local'
    });
});
