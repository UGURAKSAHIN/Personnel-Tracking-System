(function attachAppStateSync(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.PersonnelStateSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAppStateSyncApi() {
    const DEFAULT_CURRENCY = 'USD';

    function toTimestamp(value) {
        const timestamp = Date.parse(String(value ?? ''));
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    function summarizeAppState(appState) {
        const personnel = Array.isArray(appState?.personnel) ? appState.personnel : [];
        const currency = String(appState?.settings?.currency || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;

        const latestTimestamp = personnel.reduce((maxTimestamp, person) => {
            const candidateTimestamp = toTimestamp(person?.updatedAt || person?.createdAt || '');
            return Math.max(maxTimestamp, candidateTimestamp);
        }, 0);

        return {
            hasPersonnel: personnel.length > 0,
            hasCustomSettings: currency !== DEFAULT_CURRENCY,
            latestTimestamp,
            personnelCount: personnel.length
        };
    }

    function resolveAppStateSource(localState, remoteState) {
        const localSummary = summarizeAppState(localState);
        const remoteSummary = summarizeAppState(remoteState);
        const localHasSignal = localSummary.hasPersonnel || localSummary.hasCustomSettings;
        const remoteHasSignal = remoteSummary.hasPersonnel || remoteSummary.hasCustomSettings;

        if (localHasSignal && !remoteHasSignal) {
            return {
                reason: 'local-only',
                shouldSyncLocalToRemote: true,
                source: 'local'
            };
        }

        if (!localHasSignal && remoteHasSignal) {
            return {
                reason: 'remote-only',
                shouldSyncLocalToRemote: false,
                source: 'remote'
            };
        }

        if (localSummary.latestTimestamp > remoteSummary.latestTimestamp) {
            return {
                reason: 'local-newer',
                shouldSyncLocalToRemote: true,
                source: 'local'
            };
        }

        if (remoteSummary.latestTimestamp > localSummary.latestTimestamp) {
            return {
                reason: 'remote-newer',
                shouldSyncLocalToRemote: false,
                source: 'remote'
            };
        }

        if (localSummary.personnelCount > remoteSummary.personnelCount) {
            return {
                reason: 'local-has-more-records',
                shouldSyncLocalToRemote: true,
                source: 'local'
            };
        }

        if (remoteSummary.personnelCount > localSummary.personnelCount) {
            return {
                reason: 'remote-has-more-records',
                shouldSyncLocalToRemote: false,
                source: 'remote'
            };
        }

        if (localSummary.hasCustomSettings && !remoteSummary.hasCustomSettings) {
            return {
                reason: 'local-settings-customized',
                shouldSyncLocalToRemote: true,
                source: 'local'
            };
        }

        return {
            reason: remoteSummary.hasCustomSettings ? 'remote-settings-customized' : 'states-equivalent',
            shouldSyncLocalToRemote: false,
            source: 'remote'
        };
    }

    return {
        resolveAppStateSource,
        summarizeAppState
    };
});
