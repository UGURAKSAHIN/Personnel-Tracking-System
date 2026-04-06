const STORAGE_KEYS = {
    personnel: 'personnel-tracking-system-pro:personnel',
    settings: 'personnel-tracking-system-pro:settings',
    legacyPersonnel: 'personnel-tracking-system:personnel'
};

const DEFAULTS = {
    currency: 'USD',
    department: 'General',
    sort: 'recent',
    status: 'Active'
};

const DEFAULT_BUTTON_LABEL = 'Save Record';
const EDIT_BUTTON_LABEL = 'Update Record';
const DEFAULT_FORM_TITLE = 'Add Personnel Record';
const EDIT_FORM_TITLE = 'Edit Personnel Record';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const STATUS_OPTIONS = ['Active', 'Probation', 'On Leave', 'Inactive'];
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'TRY', 'GBP'];

const DEMO_PERSONNEL = [
    {
        fullName: 'Aylin Demir',
        email: 'aylin.demir@northpeak.co',
        department: 'Human Resources',
        position: 'HR Manager',
        status: 'Active',
        startDate: '2023-02-13',
        salary: 4800,
        notes: 'Leads recruitment and performance planning.'
    },
    {
        fullName: 'Burak Yilmaz',
        email: 'burak.yilmaz@northpeak.co',
        department: 'Operations',
        position: 'Operations Lead',
        status: 'Active',
        startDate: '2022-09-05',
        salary: 5200,
        notes: 'Owns weekly shift and logistics coordination.'
    },
    {
        fullName: 'Ceren Kaya',
        email: 'ceren.kaya@northpeak.co',
        department: 'Finance',
        position: 'Payroll Specialist',
        status: 'Probation',
        startDate: '2025-01-20',
        salary: 3900,
        notes: 'Recently onboarded to the finance team.'
    },
    {
        fullName: 'Deniz Arslan',
        email: 'deniz.arslan@northpeak.co',
        department: 'Customer Success',
        position: 'Customer Success Manager',
        status: 'On Leave',
        startDate: '2021-06-14',
        salary: 4300,
        notes: 'Handling enterprise retention accounts.'
    },
    {
        fullName: 'Ece Sahin',
        email: 'ece.sahin@northpeak.co',
        department: 'Product',
        position: 'Product Designer',
        status: 'Active',
        startDate: '2024-04-08',
        salary: 4600,
        notes: 'Supports onboarding flows and dashboard UX.'
    }
];

const personForm = document.getElementById('personForm');
const formTitle = document.getElementById('formTitle');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const departmentInput = document.getElementById('department');
const positionInput = document.getElementById('position');
const statusInput = document.getElementById('status');
const startDateInput = document.getElementById('startDate');
const salaryInput = document.getElementById('salary');
const notesInput = document.getElementById('notes');
const searchInput = document.getElementById('search');
const statusFilter = document.getElementById('statusFilter');
const departmentFilter = document.getElementById('departmentFilter');
const sortSelect = document.getElementById('sortSelect');
const currencySelect = document.getElementById('currencySelect');
const personList = document.getElementById('personList');
const resultsMeta = document.getElementById('resultsMeta');
const submitButton = document.getElementById('submitButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const loadDemoButton = document.getElementById('loadDemoButton');
const exportJsonButton = document.getElementById('exportJsonButton');
const exportCsvButton = document.getElementById('exportCsvButton');
const importButton = document.getElementById('importButton');
const importFile = document.getElementById('importFile');
const clearDataButton = document.getElementById('clearDataButton');
const totalPersonnelStat = document.getElementById('totalPersonnelStat');
const activePersonnelStat = document.getElementById('activePersonnelStat');
const departmentCountStat = document.getElementById('departmentCountStat');
const payrollTotalStat = document.getElementById('payrollTotalStat');
const payrollCaption = document.getElementById('payrollCaption');
const toast = document.getElementById('toast');
const yearStamp = document.getElementById('yearStamp');
const demoNotice = document.getElementById('demoNotice');

const state = {
    editingId: null,
    personnel: loadPersonnel(),
    renderFrame: null,
    searchTerm: '',
    statusFilter: 'all',
    departmentFilter: 'all',
    sortValue: DEFAULTS.sort,
    settings: loadSettings(),
    toastTimer: null
};

personForm.addEventListener('submit', handleFormSubmit);
cancelEditButton.addEventListener('click', resetFormState);
searchInput.addEventListener('input', handleSearchInput);
statusFilter.addEventListener('change', handleStatusFilterChange);
departmentFilter.addEventListener('change', handleDepartmentFilterChange);
sortSelect.addEventListener('change', handleSortChange);
currencySelect.addEventListener('change', handleCurrencyChange);
personList.addEventListener('click', handleTableClick);
loadDemoButton.addEventListener('click', loadDemoData);
exportJsonButton.addEventListener('click', exportJson);
exportCsvButton.addEventListener('click', exportCsv);
importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', handleImportFile);
clearDataButton.addEventListener('click', clearAllData);

if (yearStamp) {
    yearStamp.textContent = String(new Date().getFullYear());
}

currencySelect.value = state.settings.currency;
statusInput.value = DEFAULTS.status;
sortSelect.value = state.sortValue;

initializeDemoExperience();
renderApp();
registerServiceWorker();

function initializeDemoExperience() {
    const environment = getEnvironmentState();

    if (demoNotice) {
        demoNotice.hidden = !environment.isPublicDemo;
    }

    if (environment.shouldSeedDemoData) {
        state.personnel = createDemoPersonnel();
        persistAll();
        showToast('Demo data loaded for the live preview.');
    }
}

function handleFormSubmit(event) {
    event.preventDefault();

    const personPayload = buildPersonPayload();

    if (!personPayload) {
        return;
    }

    if (state.editingId) {
        updatePersonnel(state.editingId, personPayload);
        showToast('Personnel record updated.');
    } else {
        state.personnel.unshift(createPerson(personPayload));
        showToast('Personnel record added.');
    }

    persistAll();
    resetFormState();
    scheduleRender();
}

function handleSearchInput(event) {
    state.searchTerm = normalizeSearchTerm(event.target.value);
    scheduleRender();
}

function handleStatusFilterChange(event) {
    state.statusFilter = event.target.value;
    scheduleRender();
}

function handleDepartmentFilterChange(event) {
    state.departmentFilter = event.target.value;
    scheduleRender();
}

function handleSortChange(event) {
    state.sortValue = event.target.value;
    scheduleRender();
}

function handleCurrencyChange(event) {
    const nextCurrency = sanitizeCurrency(event.target.value);

    if (state.settings.currency === nextCurrency) {
        return;
    }

    state.settings.currency = nextCurrency;
    persistSettings();
    scheduleRender();
    showToast(`Currency switched to ${nextCurrency}.`);
}

function handleTableClick(event) {
    const button = event.target.closest('button[data-id]');

    if (!button) {
        return;
    }

    const { action, id } = button.dataset;

    if (action === 'delete') {
        deletePersonnel(id);
        return;
    }

    startEditing(id);
}

async function handleImportFile(event) {
    const [file] = event.target.files ?? [];

    if (!file) {
        return;
    }

    try {
        const rawText = await file.text();
        const parsedValue = JSON.parse(rawText);
        const importedPayload = normalizeImportedPayload(parsedValue);

        if (
            state.personnel.length > 0 &&
            !window.confirm('Importing will replace the current dataset. Continue?')
        ) {
            return;
        }

        state.personnel = importedPayload.personnel;
        state.settings = importedPayload.settings;
        currencySelect.value = state.settings.currency;
        persistAll();
        resetFormState();
        scheduleRender();
        showToast(`${importedPayload.personnel.length} records imported.`);
    } catch (error) {
        console.warn('Import failed.', error);
        showToast('Import failed. Please use a valid JSON backup.', 'error');
    } finally {
        importFile.value = '';
    }
}

function buildPersonPayload() {
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const department = departmentInput.value.trim();
    const position = positionInput.value.trim();
    const status = STATUS_OPTIONS.includes(statusInput.value) ? statusInput.value : DEFAULTS.status;
    const startDate = sanitizeDateValue(startDateInput.value);
    const salary = salaryInput.valueAsNumber;
    const notes = notesInput.value.trim();

    if (!fullName || !department || !position || Number.isNaN(salary)) {
        showToast('Full name, department, position, and salary are required.', 'error');
        return null;
    }

    if (salary < 0) {
        showToast('Salary must be zero or higher.', 'error');
        return null;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
        showToast('Enter a valid work email or leave the field blank.', 'error');
        return null;
    }

    return {
        fullName,
        email,
        department,
        position,
        status,
        startDate,
        salary,
        notes
    };
}

function createPerson(payload, id = createId(), createdAt = new Date().toISOString(), updatedAt = new Date().toISOString()) {
    return {
        id,
        fullName: payload.fullName,
        email: payload.email,
        department: payload.department,
        position: payload.position,
        status: payload.status,
        startDate: payload.startDate,
        salary: payload.salary,
        notes: payload.notes,
        createdAt,
        updatedAt,
        searchIndex: buildSearchIndex(payload)
    };
}

function createDemoPersonnel() {
    return DEMO_PERSONNEL.map((person, index) => {
        const timestamp = new Date(Date.now() - index * 86400000).toISOString();
        return createPerson(person, createId(), timestamp, timestamp);
    });
}

function updatePersonnel(id, payload) {
    const personIndex = state.personnel.findIndex((person) => person.id === id);

    if (personIndex === -1) {
        state.editingId = null;
        return;
    }

    const existingPerson = state.personnel[personIndex];

    state.personnel[personIndex] = createPerson(
        payload,
        id,
        existingPerson.createdAt,
        new Date().toISOString()
    );

    state.editingId = null;
}

function deletePersonnel(id) {
    const person = state.personnel.find((entry) => entry.id === id);

    if (!person) {
        return;
    }

    if (!window.confirm(`Delete ${person.fullName} from the directory?`)) {
        return;
    }

    state.personnel = state.personnel.filter((entry) => entry.id !== id);

    if (state.editingId === id) {
        resetFormState();
    }

    persistAll();
    scheduleRender();
    showToast('Personnel record deleted.');
}

function startEditing(id) {
    const selectedPerson = state.personnel.find((person) => person.id === id);

    if (!selectedPerson) {
        return;
    }

    fullNameInput.value = selectedPerson.fullName;
    emailInput.value = selectedPerson.email;
    departmentInput.value = selectedPerson.department;
    positionInput.value = selectedPerson.position;
    statusInput.value = selectedPerson.status;
    startDateInput.value = selectedPerson.startDate;
    salaryInput.value = String(selectedPerson.salary);
    notesInput.value = selectedPerson.notes;
    state.editingId = id;
    syncFormUi();
    fullNameInput.focus();
}

function resetFormState() {
    personForm.reset();
    state.editingId = null;
    statusInput.value = DEFAULTS.status;
    syncFormUi();
    fullNameInput.focus();
}

function syncFormUi() {
    const isEditing = state.editingId !== null;

    submitButton.textContent = isEditing ? EDIT_BUTTON_LABEL : DEFAULT_BUTTON_LABEL;
    formTitle.textContent = isEditing ? EDIT_FORM_TITLE : DEFAULT_FORM_TITLE;
    cancelEditButton.hidden = !isEditing;
}

function scheduleRender() {
    if (state.renderFrame !== null) {
        return;
    }

    const queueRender = window.requestAnimationFrame ?? ((callback) => window.setTimeout(callback, 16));

    state.renderFrame = queueRender(() => {
        state.renderFrame = null;
        renderApp();
    });
}

function renderApp() {
    syncFormUi();
    statusFilter.value = state.statusFilter;
    sortSelect.value = state.sortValue;
    currencySelect.value = state.settings.currency;

    const departments = syncDepartmentFilterOptions();
    const visiblePersonnel = getVisiblePersonnel();

    renderStats(departments);
    renderPersonnelTable(visiblePersonnel);
    updateResultsMeta(visiblePersonnel.length);
}

function syncDepartmentFilterOptions() {
    const departments = [...new Set(
        state.personnel
            .map((person) => person.department)
            .filter(Boolean)
    )].sort((left, right) => left.localeCompare(right));

    if (state.departmentFilter !== 'all' && !departments.includes(state.departmentFilter)) {
        state.departmentFilter = 'all';
    }

    const fragment = document.createDocumentFragment();
    fragment.appendChild(new Option('All departments', 'all'));

    departments.forEach((department) => {
        fragment.appendChild(new Option(department, department));
    });

    departmentFilter.replaceChildren(fragment);
    departmentFilter.value = state.departmentFilter;
    return departments;
}

function renderStats(departments) {
    const totalCount = state.personnel.length;
    const activeCount = state.personnel.filter((person) => person.status === 'Active').length;
    const payrollTotal = state.personnel.reduce((sum, person) => sum + person.salary, 0);
    const averageSalary = totalCount > 0 ? payrollTotal / totalCount : 0;

    totalPersonnelStat.textContent = formatInteger(totalCount);
    activePersonnelStat.textContent = formatInteger(activeCount);
    departmentCountStat.textContent = formatInteger(departments.length);
    payrollTotalStat.textContent = formatCurrency(payrollTotal);
    payrollCaption.textContent = totalCount > 0
        ? `Average salary ${formatCurrency(averageSalary)}`
        : 'Add your first record to build payroll insights.';
}

function renderPersonnelTable(visiblePersonnel) {
    const fragment = document.createDocumentFragment();

    if (visiblePersonnel.length === 0) {
        fragment.appendChild(createEmptyRow());
    } else {
        visiblePersonnel.forEach((person) => {
            fragment.appendChild(createRow(person));
        });
    }

    personList.replaceChildren(fragment);
}

function getVisiblePersonnel() {
    const filteredPersonnel = state.personnel.filter((person) => {
        if (state.searchTerm && !person.searchIndex.includes(state.searchTerm)) {
            return false;
        }

        if (state.statusFilter !== 'all' && person.status !== state.statusFilter) {
            return false;
        }

        if (state.departmentFilter !== 'all' && person.department !== state.departmentFilter) {
            return false;
        }

        return true;
    });

    return sortPersonnel(filteredPersonnel);
}

function sortPersonnel(personnel) {
    const sortedPersonnel = [...personnel];

    sortedPersonnel.sort((left, right) => {
        switch (state.sortValue) {
            case 'name-asc':
                return left.fullName.localeCompare(right.fullName);
            case 'salary-desc':
                return right.salary - left.salary;
            case 'salary-asc':
                return left.salary - right.salary;
            case 'start-desc':
                return compareDates(right.startDate, left.startDate);
            case 'department-asc':
                return left.department.localeCompare(right.department);
            case 'recent':
            default:
                return compareDates(right.updatedAt, left.updatedAt);
        }
    });

    return sortedPersonnel;
}

function createRow(person) {
    const row = document.createElement('tr');

    row.appendChild(createCell(person.fullName, 'person-name'));
    row.appendChild(createCell(person.department));
    row.appendChild(createCell(person.position));

    const statusCell = document.createElement('td');
    statusCell.appendChild(createStatusBadge(person.status));
    row.appendChild(statusCell);

    row.appendChild(createCell(formatDate(person.startDate), 'date-cell'));
    row.appendChild(createCell(person.email || '—'));
    row.appendChild(createCell(formatCurrency(person.salary), 'salary-cell'));

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    actionsCell.appendChild(createActionButton('edit', 'Edit', person.id));
    actionsCell.appendChild(createActionButton('delete', 'Delete', person.id));
    row.appendChild(actionsCell);

    return row;
}

function createCell(text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = text === 'â€”' ? '-' : text;

    if (className) {
        cell.className = className;
    }

    return cell;
}

function createStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = `status-badge status-${toSlug(status)}`;
    badge.textContent = status;
    return badge;
}

function createActionButton(action, label, id) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `table-action ${action}`;
    button.dataset.action = action;
    button.dataset.id = id;
    button.textContent = label;
    return button;
}

function createEmptyRow() {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    const hasFilters = Boolean(state.searchTerm || state.statusFilter !== 'all' || state.departmentFilter !== 'all');

    cell.colSpan = 8;
    cell.className = 'empty-state';
    cell.textContent = hasFilters
        ? 'No personnel match the current filters.'
        : 'No personnel added yet. Load demo data or create your first record.';

    row.appendChild(cell);
    return row;
}

function updateResultsMeta(visibleCount) {
    const totalCount = state.personnel.length;
    const fragments = [`Showing ${visibleCount} of ${totalCount} records`];

    if (state.statusFilter !== 'all') {
        fragments.push(`Status: ${state.statusFilter}`);
    }

    if (state.departmentFilter !== 'all') {
        fragments.push(`Department: ${state.departmentFilter}`);
    }

    fragments.push(`Currency: ${state.settings.currency}`);
    resultsMeta.textContent = fragments.join(' | ');
}

function loadDemoData() {
    if (
        state.personnel.length > 0 &&
        !window.confirm('Replace your current dataset with demo data?')
    ) {
        return;
    }

    state.personnel = createDemoPersonnel();

    persistAll();
    resetFormState();
    scheduleRender();
    showToast('Demo data loaded.');
}

function exportJson() {
    const payload = {
        product: 'Personnel Tracking System Pro',
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: { ...state.settings },
        personnel: state.personnel.map(stripDerivedFields)
    };

    downloadFile(
        'personnel-tracking-system-backup.json',
        JSON.stringify(payload, null, 2),
        'application/json'
    );

    showToast('JSON backup prepared.');
}

function exportCsv() {
    const visiblePersonnel = getVisiblePersonnel();

    if (visiblePersonnel.length === 0) {
        showToast('There are no visible records to export.', 'error');
        return;
    }

    const header = [
        'Full Name',
        'Email',
        'Department',
        'Position',
        'Status',
        'Start Date',
        'Salary',
        'Notes'
    ];

    const lines = visiblePersonnel.map((person) => [
        person.fullName,
        person.email,
        person.department,
        person.position,
        person.status,
        person.startDate,
        String(person.salary),
        person.notes
    ]);

    const csvContent = [header, ...lines]
        .map((line) => line.map(escapeCsvValue).join(','))
        .join('\n');

    downloadFile('personnel-tracking-system-export.csv', csvContent, 'text/csv;charset=utf-8');
    showToast('CSV export prepared from the current view.');
}

function clearAllData() {
    if (state.personnel.length === 0) {
        showToast('There is no data to clear.', 'error');
        return;
    }

    if (!window.confirm('Delete all personnel records and reset the directory?')) {
        return;
    }

    state.personnel = [];
    persistAll();
    resetFormState();
    scheduleRender();
    showToast('All personnel records cleared.');
}

function normalizeImportedPayload(parsedValue) {
    const rawPersonnel = Array.isArray(parsedValue)
        ? parsedValue
        : Array.isArray(parsedValue?.personnel)
            ? parsedValue.personnel
            : null;

    if (!rawPersonnel) {
        throw new Error('Import payload does not contain a personnel array.');
    }

    const personnel = rawPersonnel
        .map((person) => sanitizePerson(person))
        .filter(Boolean);

    if (personnel.length === 0) {
        throw new Error('Import payload does not include valid personnel records.');
    }

    return {
        personnel,
        settings: sanitizeSettings(parsedValue?.settings)
    };
}

function persistAll() {
    persistPersonnel();
    persistSettings();
}

function persistPersonnel() {
    try {
        const serializablePersonnel = state.personnel.map(stripDerivedFields);
        window.localStorage.setItem(STORAGE_KEYS.personnel, JSON.stringify(serializablePersonnel));
    } catch (error) {
        console.warn('Personnel data could not be saved.', error);
        showToast('Local save failed. Browser storage may be unavailable.', 'error');
    }
}

function persistSettings() {
    try {
        window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    } catch (error) {
        console.warn('Settings could not be saved.', error);
    }
}

function loadPersonnel() {
    try {
        const storedValue = window.localStorage.getItem(STORAGE_KEYS.personnel)
            ?? window.localStorage.getItem(STORAGE_KEYS.legacyPersonnel);

        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);

        if (!Array.isArray(parsedValue)) {
            return [];
        }

        return parsedValue
            .map((person) => sanitizePerson(person))
            .filter(Boolean);
    } catch (error) {
        console.warn('Stored personnel data could not be parsed.', error);
        return [];
    }
}

function loadSettings() {
    try {
        const storedValue = window.localStorage.getItem(STORAGE_KEYS.settings);

        if (!storedValue) {
            return { currency: DEFAULTS.currency };
        }

        return sanitizeSettings(JSON.parse(storedValue));
    } catch (error) {
        console.warn('Stored settings could not be parsed.', error);
        return { currency: DEFAULTS.currency };
    }
}

function sanitizePerson(person) {
    const fullName = String(person?.fullName ?? person?.name ?? '').trim();
    const email = String(person?.email ?? '').trim().toLowerCase();
    const department = String(person?.department ?? DEFAULTS.department).trim() || DEFAULTS.department;
    const position = String(person?.position ?? '').trim();
    const status = STATUS_OPTIONS.includes(person?.status) ? person.status : DEFAULTS.status;
    const startDate = sanitizeDateValue(person?.startDate ?? '');
    const salary = Number(person?.salary);
    const notes = String(person?.notes ?? '').trim();
    const id = typeof person?.id === 'string' && person.id ? person.id : createId();
    const createdAt = sanitizeTimestamp(person?.createdAt);
    const updatedAt = sanitizeTimestamp(person?.updatedAt ?? createdAt);

    if (!fullName || !position || Number.isNaN(salary) || salary < 0) {
        return null;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
        return createPerson(
            {
                fullName,
                email: '',
                department,
                position,
                status,
                startDate,
                salary,
                notes
            },
            id,
            createdAt,
            updatedAt
        );
    }

    return createPerson(
        {
            fullName,
            email,
            department,
            position,
            status,
            startDate,
            salary,
            notes
        },
        id,
        createdAt,
        updatedAt
    );
}

function sanitizeSettings(settings) {
    return {
        currency: sanitizeCurrency(settings?.currency)
    };
}

function sanitizeCurrency(currency) {
    return SUPPORTED_CURRENCIES.includes(currency) ? currency : DEFAULTS.currency;
}

function sanitizeDateValue(value) {
    const stringValue = String(value ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(stringValue) ? stringValue : '';
}

function sanitizeTimestamp(value) {
    const stringValue = String(value ?? '').trim();
    return Number.isNaN(Date.parse(stringValue))
        ? new Date().toISOString()
        : stringValue;
}

function normalizeSearchTerm(value) {
    return String(value ?? '').trim().toLowerCase();
}

function buildSearchIndex(payload) {
    return [
        payload.fullName,
        payload.email,
        payload.department,
        payload.position,
        payload.status,
        payload.notes
    ]
        .join(' ')
        .toLowerCase();
}

function compareDates(left, right) {
    return getTimestamp(left) - getTimestamp(right);
}

function formatCurrency(value) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: state.settings.currency,
        maximumFractionDigits: 0
    }).format(value || 0);
}

function formatInteger(value) {
    return new Intl.NumberFormat().format(value);
}

function formatDate(value) {
    if (!value) {
        return '—';
    }

    const parsedDate = new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(parsedDate);
}

function encodeSalary(value) {
    // Basic reversible encoding to avoid storing salary in clear text.
    // For stronger protection, replace this with proper encryption keyed from
    // user-specific or environment-specific data that is not stored alongside
    // the payload.
    const stringValue = String(value ?? '');
    const pepper = 'v1-salary-pepper';
    return btoa(pepper + stringValue);
}

function stripDerivedFields(person) {
    // The app is intentionally local-first, so payroll data needs to remain in persisted records.
    return {
        id: person.id,
        fullName: person.fullName,
        email: person.email,
        department: person.department,
        position: person.position,
        status: person.status,
        startDate: person.startDate,
        salary: encodeSalary(person.salary),
        notes: person.notes,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt
    };
}

function escapeCsvValue(value) {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadFile(fileName, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function showToast(message, tone = 'success') {
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.hidden = false;

    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
        toast.hidden = true;
    }, 2800);
}

function registerServiceWorker() {
    if (!window.isSecureContext || !('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.warn('Service worker registration failed.', error);
    });
}

function getEnvironmentState() {
    const hostname = String(window.location.hostname || '').toLowerCase();
    const query = new URLSearchParams(window.location.search);
    const githubPagesHosts = ['github.io'];
    const isGitHubPages = githubPagesHosts.includes(hostname);
    const isForcedDemo = query.get('demo') === '1';
    const isPublicDemo = isGitHubPages || isForcedDemo;

    return {
        isPublicDemo,
        shouldSeedDemoData: isPublicDemo && state.personnel.length === 0
    };
}

function toSlug(value) {
    return String(value).toLowerCase().replace(/\s+/g, '-');
}

function getTimestamp(value) {
    const parsedValue = Date.parse(String(value ?? ''));
    return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function createId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `person-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
