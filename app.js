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
const SECTION_IDS = ['top', 'features', 'workflow', 'plans', 'faq', 'demo', 'workspace', 'checkout'];
const SALES_CONTACT_EMAIL = 'sales@example.com';
const CHECKOUT_INTENTS_STORAGE_KEY = 'personnel-tracking-system-pro:checkout-intents';
const DEFAULT_API_BASE_URL = 'http://localhost:8080';
const API_ROUTES = {
    appState: '/api/app-state',
    checkout: '/api/checkout/session'
};
const STRIPE_ALLOWED_HOSTS = ['buy.stripe.com', 'pay.stripe.com'];
const appStateSync = window.PersonnelStateSync || {
    resolveAppStateSource: () => ({
        reason: 'sync-helper-missing',
        shouldSyncLocalToRemote: false,
        source: 'remote'
    })
};

const PAYMENT_PLANS = {
    starter: {
        name: 'Starter',
        price: '$29',
        badge: 'Starter License',
        description: 'A compact one-time purchase for solo operators and lightweight internal teams.',
        features: [
            'Single dashboard delivery',
            'CSV and JSON export tools',
            'Static hosting ready'
        ],
        provider: 'stripe-checkout-session',
        checkoutUrl: 'https://buy.stripe.com/REPLACE_WITH_STARTER_PAYMENT_LINK',
        submitLabel: 'Continue to Secure Checkout'
    },
    growth: {
        name: 'Growth',
        price: '$90',
        badge: 'Growth Package',
        description: 'Hosted checkout for agencies, HR consultants, and polished client deliveries.',
        features: [
            'Landing page plus live demo',
            'Buyer-ready delivery flow',
            'White-label friendly structure'
        ],
        provider: 'stripe-checkout-session',
        checkoutUrl: 'https://buy.stripe.com/REPLACE_WITH_GROWTH_PAYMENT_LINK',
        submitLabel: 'Continue to Secure Checkout'
    },
    'white-label': {
        name: 'White Label',
        price: 'Custom',
        badge: 'Custom Quote',
        description: 'Collect buyer details first, then continue through a direct sales conversation.',
        features: [
            'Custom branding scope',
            'Flexible delivery options',
            'License and rollout discussion'
        ],
        checkoutUrl: '',
        submitLabel: 'Send White Label Request',
        mode: 'contact'
    }
};

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

const SORTERS = {
    recent: (a, b) => compareDates(b.updatedAt, a.updatedAt),
    'name-asc': (a, b) => a.fullName.localeCompare(b.fullName),
    'salary-desc': (a, b) => b.salary - a.salary,
    'salary-asc': (a, b) => a.salary - b.salary,
    'start-desc': (a, b) => compareDates(b.startDate, a.startDate),
    'department-asc': (a, b) => a.department.localeCompare(b.department)
};

const formatterCache = {
    integer: new Intl.NumberFormat(),
    date: new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }),
    currency: new Map()
};

function qs(id) {
    return document.getElementById(id);
}

const elements = {
    personForm: qs('personForm'),
    formTitle: qs('formTitle'),
    fullNameInput: qs('fullName'),
    emailInput: qs('email'),
    departmentInput: qs('department'),
    positionInput: qs('position'),
    statusInput: qs('status'),
    startDateInput: qs('startDate'),
    salaryInput: qs('salary'),
    notesInput: qs('notes'),
    searchInput: qs('search'),
    statusFilter: qs('statusFilter'),
    departmentFilter: qs('departmentFilter'),
    sortSelect: qs('sortSelect'),
    currencySelect: qs('currencySelect'),
    personList: qs('personList'),
    resultsMeta: qs('resultsMeta'),
    submitButton: qs('submitButton'),
    cancelEditButton: qs('cancelEditButton'),
    loadDemoButton: qs('loadDemoButton'),
    exportJsonButton: qs('exportJsonButton'),
    exportCsvButton: qs('exportCsvButton'),
    importButton: qs('importButton'),
    importFile: qs('importFile'),
    clearDataButton: qs('clearDataButton'),
    totalPersonnelStat: qs('totalPersonnelStat'),
    activePersonnelStat: qs('activePersonnelStat'),
    departmentCountStat: qs('departmentCountStat'),
    payrollTotalStat: qs('payrollTotalStat'),
    payrollCaption: qs('payrollCaption'),
    toast: qs('toast'),
    yearStamp: qs('yearStamp'),
    demoNotice: qs('demoNotice')
};

const sectionElements = SECTION_IDS
    .map((sectionId) => qs(sectionId))
    .filter((section) => section instanceof HTMLElement);

const sectionNavLinks = [...document.querySelectorAll('.site-nav [data-section-link]')];

const storage = {
    get(key, fallback = null) {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn(`Storage read failed for key: ${key}`, error);
            return fallback;
        }
    },
    set(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`Storage write failed for key: ${key}`, error);
            return false;
        }
    }
};

const state = {
    activeSectionId: '',
    editingId: null,
    personnel: [],
    renderFrame: null,
    searchTerm: '',
    sectionObserver: null,
    statusFilter: 'all',
    departmentFilter: 'all',
    sortValue: DEFAULTS.sort,
    settings: { currency: DEFAULTS.currency },
    backendAvailable: false,
    toastTimer: null
};

void bootstrap();

async function bootstrap() {
    state.personnel = loadPersonnel();
    state.settings = loadSettings();

    bindEvents();
    initializeUiDefaults();
    await hydrateRemoteState();
    initializeSectionIntegration();
    initializeCheckoutExperience();
    await initializeDemoExperience();
    renderApp();
    registerServiceWorker();
}

function bindEvents() {
    elements.personForm?.addEventListener('submit', handleFormSubmit);
    elements.cancelEditButton?.addEventListener('click', resetFormState);
    elements.searchInput?.addEventListener('input', handleSearchInput);
    elements.statusFilter?.addEventListener('change', handleStatusFilterChange);
    elements.departmentFilter?.addEventListener('change', handleDepartmentFilterChange);
    elements.sortSelect?.addEventListener('change', handleSortChange);
    elements.currencySelect?.addEventListener('change', handleCurrencyChange);
    elements.personList?.addEventListener('click', handleTableClick);
    elements.loadDemoButton?.addEventListener('click', loadDemoData);
    elements.exportJsonButton?.addEventListener('click', exportJson);
    elements.exportCsvButton?.addEventListener('click', exportCsv);
    elements.importButton?.addEventListener('click', () => elements.importFile?.click());
    elements.importFile?.addEventListener('change', handleImportFile);
    elements.clearDataButton?.addEventListener('click', clearAllData);
}

function initializeUiDefaults() {
    if (elements.yearStamp) {
        elements.yearStamp.textContent = String(new Date().getFullYear());
    }

    if (elements.currencySelect) {
        elements.currencySelect.value = state.settings.currency;
    }

    if (elements.statusInput) {
        elements.statusInput.value = DEFAULTS.status;
    }

    if (elements.sortSelect) {
        elements.sortSelect.value = state.sortValue;
    }
}

function initializeSectionIntegration() {
    document.addEventListener('click', handleSectionLinkClick);
    window.addEventListener('hashchange', syncSectionNavigationFromLocation);
    window.addEventListener('popstate', syncSectionNavigationFromLocation);

    if ('IntersectionObserver' in window && sectionElements.length > 0) {
        state.sectionObserver = new IntersectionObserver(handleSectionIntersection, {
            rootMargin: '-22% 0px -56% 0px',
            threshold: [0.2, 0.35, 0.55]
        });

        sectionElements
            .filter((section) => section.id !== 'top')
            .forEach((section) => state.sectionObserver.observe(section));
    }

    syncSectionNavigationFromLocation();
}

async function initializeDemoExperience() {
    const environment = getEnvironmentState();

    if (elements.demoNotice) {
        elements.demoNotice.hidden = !environment.isPublicDemo;
    }

    if (environment.shouldSeedDemoData) {
        state.personnel = createDemoPersonnel();
        await persistAll();
        showToast('Demo data loaded for the live preview.');
    }
}

function initializeCheckoutExperience() {
    document.addEventListener('click', handlePayPlanClick);
    handleCheckoutReturn();
}

function handleCheckoutReturn() {
    const query = new URLSearchParams(window.location.search);
    const checkoutStatus = query.get('checkout');

    if (!checkoutStatus) return;

    try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('checkout');
        cleanUrl.searchParams.delete('session_id');
        cleanUrl.searchParams.delete('plan');
        const search = cleanUrl.searchParams.toString();
        window.history.replaceState(null, '', cleanUrl.pathname + (search ? `?${search}` : '') + cleanUrl.hash);
    } catch (error) {
        // ignore history replace failures
    }

    if (checkoutStatus === 'success') {
        showToast('Payment successful! Your purchase is confirmed.', 'success');
        navigateToSection('checkout');
    } else if (checkoutStatus === 'cancel') {
        showToast('Checkout cancelled. You can try again whenever you are ready.', 'error');
        navigateToSection('checkout');
    }
}

function handleSectionLinkClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const sectionLink = event.target instanceof Element
        ? event.target.closest('a[href^="#"]')
        : null;

    if (!(sectionLink instanceof HTMLAnchorElement)) return;

    const sectionId = getSectionIdFromHash(sectionLink.getAttribute('href'));
    const section = getSectionElement(sectionId);

    if (!section) return;

    event.preventDefault();
    navigateToSection(sectionId);
}

function handleSectionIntersection(entries) {
    const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => {
            if (right.intersectionRatio !== left.intersectionRatio) {
                return right.intersectionRatio - left.intersectionRatio;
            }

            return Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top);
        });

    if (visibleEntries.length === 0) return;
    syncSectionNavigation(visibleEntries[0].target.id);
}

function syncSectionNavigationFromLocation() {
    const sectionId = getSectionIdFromHash(window.location.hash);
    syncSectionNavigation(sectionId || '');
}

function syncSectionNavigation(sectionId) {
    if (state.activeSectionId === sectionId) return;

    state.activeSectionId = sectionId;

    sectionNavLinks.forEach((link) => {
        const isActive = link.dataset.sectionLink === sectionId;
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });

    sectionElements.forEach((section) => {
        section.classList.toggle('section-current', section.id === sectionId);
    });
}

function navigateToSection(sectionId, { behavior = 'smooth', updateHistory = true } = {}) {
    const section = getSectionElement(sectionId);
    if (!section) return;

    if (updateHistory && window.location.hash !== `#${sectionId}`) {
        try {
            window.history.pushState(null, '', `#${sectionId}`);
        } catch (error) {
            window.location.hash = sectionId;
        }
    }

    syncSectionNavigation(sectionId);

    const finalBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : behavior;

    section.scrollIntoView({ behavior: finalBehavior, block: 'start' });
}

function getSectionElement(sectionId) {
    if (!sectionId) return null;
    return qs(sectionId);
}

function getSectionIdFromHash(hashValue) {
    const normalizedValue = String(hashValue ?? '').trim().replace(/^#/, '');
    return SECTION_IDS.includes(normalizedValue) ? normalizedValue : '';
}

async function handlePayPlanClick(event) {
    const triggerButton = event.target instanceof Element
        ? event.target.closest('.pay-plan-button')
        : null;

    if (!triggerButton) return;

    event.preventDefault();
    navigateToSection('checkout', { updateHistory: window.location.hash !== '#checkout' });
    await startPlanCheckout(triggerButton.dataset.plan);
}

async function startPlanCheckout(planKey) {
    const plan = PAYMENT_PLANS[planKey];

    if (!plan) {
        showToast('Selected plan could not be found.', 'error');
        return;
    }

    if (plan.mode === 'contact') {
        if (!hasConfiguredSalesContactEmail()) {
            showToast('Set a real sales contact email in app.js to enable white-label requests.', 'error');
            return;
        }

        window.location.href = buildWhiteLabelMailto();
        showToast('White-label request prepared in your email app.');
        return;
    }

    if (plan.provider === 'stripe-checkout-session') {
        showToast('Preparing secure checkout...');

        const checkoutSession = await createBackendCheckoutSession(planKey);

        if (checkoutSession) {
            persistCheckoutIntent({
                reference: checkoutSession.reference || createCheckoutReference(planKey),
                planKey,
                sessionId: checkoutSession.sessionId || '',
                createdAt: new Date().toISOString()
            });

            showToast(`${plan.name} checkout is opening in Stripe.`);
            window.location.assign(checkoutSession.checkoutUrl);
            return;
        }
    } else if (plan.provider !== 'stripe-payment-link') {
        showToast('The selected payment provider is not supported in this build.', 'error');
        return;
    }

    if (!isConfiguredStripePaymentLink(plan.checkoutUrl)) {
        showToast('Start `npm start` and configure Stripe in `application.properties` to enable checkout.', 'error');
        return;
    }

    const checkoutReference = createCheckoutReference(planKey);
    const stripeCheckoutUrl = buildStripePaymentLink(plan.checkoutUrl, {
        checkoutReference,
        planKey
    });

    if (!stripeCheckoutUrl) {
        showToast('Stripe Payment Link is invalid. Please verify the URL in app.js.', 'error');
        return;
    }

    persistCheckoutIntent({
        reference: checkoutReference,
        planKey,
        createdAt: new Date().toISOString()
    });

    showToast(`${plan.name} checkout is opening in Stripe.`);
    window.location.assign(stripeCheckoutUrl);
}

function buildWhiteLabelMailto() {
    const subject = encodeURIComponent('White Label request for Personnel Tracking System Pro');
    const lines = [
        'Plan: White Label',
        'Product: Personnel Tracking System Pro',
        'Message: I would like pricing and delivery details for the white-label package.'
    ];
    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:${SALES_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function hasConfiguredSalesContactEmail() {
    const email = String(SALES_CONTACT_EMAIL || '').trim().toLowerCase();
    return EMAIL_PATTERN.test(email) && !email.endsWith('@example.com');
}

function persistCheckoutIntent(intent) {
    try {
        const intents = storage.get(CHECKOUT_INTENTS_STORAGE_KEY, []);
        const safeIntents = Array.isArray(intents) ? intents : [];
        safeIntents.unshift(intent);
        storage.set(CHECKOUT_INTENTS_STORAGE_KEY, safeIntents.slice(0, 20));
    } catch (error) {
        console.warn('Checkout intent could not be saved locally.', error);
    }
}

function createCheckoutReference(planKey) {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).slice(2, 8);
    return sanitizeStripeReference(`pts_${planKey}_${timestamp}_${randomPart}`);
}

function buildStripePaymentLink(baseUrl, { customerEmail = '', checkoutReference, planKey, companyName = '', teamSize = '' }) {
    if (!isConfiguredStripePaymentLink(baseUrl)) return '';

    try {
        const url = new URL(baseUrl);
        url.searchParams.set('client_reference_id', sanitizeStripeReference(checkoutReference));
        url.searchParams.set('locale', 'auto');
        url.searchParams.set('utm_source', 'personnel_tracking_system_pro');
        url.searchParams.set('utm_medium', 'website');
        url.searchParams.set('utm_campaign', sanitizeStripeReference(`checkout_${planKey}`));

        if (customerEmail) {
            url.searchParams.set('prefilled_email', customerEmail);
        }

        if (companyName) {
            url.searchParams.set('utm_content', sanitizeStripeReference(companyName));
        } else if (teamSize) {
            url.searchParams.set('utm_content', sanitizeStripeReference(`team_${teamSize}`));
        }

        return url.toString();
    } catch (error) {
        return '';
    }
}

function sanitizeStripeReference(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 150);
}

function isConfiguredStripePaymentLink(value) {
    if (!value || String(value).includes('REPLACE_WITH_')) {
        return false;
    }

    try {
        const url = new URL(value);
        return url.protocol === 'https:' && STRIPE_ALLOWED_HOSTS.includes(url.hostname.toLowerCase());
    } catch (error) {
        return false;
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const personPayload = buildPersonPayload();
    if (!personPayload) return;

    if (state.editingId) {
        updatePersonnel(state.editingId, personPayload);
        showToast('Personnel record updated.');
    } else {
        state.personnel.unshift(createPerson(personPayload));
        showToast('Personnel record added.');
    }

    await persistAll();
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

async function handleCurrencyChange(event) {
    const nextCurrency = sanitizeCurrency(event.target.value);

    if (state.settings.currency === nextCurrency) return;

    state.settings.currency = nextCurrency;
    await persistAll();
    scheduleRender();
    showToast(`Currency switched to ${nextCurrency}.`);
}

async function handleTableClick(event) {
    const button = event.target instanceof Element
        ? event.target.closest('button[data-id]')
        : null;

    if (!button) return;

    const { action, id } = button.dataset;

    if (action === 'delete') {
        await deletePersonnel(id);
        return;
    }

    startEditing(id);
}

async function handleImportFile(event) {
    const [file] = event.target.files ?? [];
    if (!file) return;

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

        if (elements.currencySelect) {
            elements.currencySelect.value = state.settings.currency;
        }

        await persistAll();
        resetFormState();
        scheduleRender();
        navigateToSection('workspace');
        showToast(`${importedPayload.personnel.length} records imported.`);
    } catch (error) {
        console.warn('Import failed.', error);
        showToast('Import failed. Please use a valid JSON backup.', 'error');
    } finally {
        event.target.value = '';
    }
}

function buildPersonPayload() {
    const payload = {
        fullName: elements.fullNameInput.value.trim(),
        email: elements.emailInput.value.trim().toLowerCase(),
        department: elements.departmentInput.value.trim(),
        position: elements.positionInput.value.trim(),
        status: STATUS_OPTIONS.includes(elements.statusInput.value)
            ? elements.statusInput.value
            : DEFAULTS.status,
        startDate: sanitizeDateValue(elements.startDateInput.value),
        salary: elements.salaryInput.valueAsNumber,
        notes: elements.notesInput.value.trim()
    };

    if (!payload.fullName || !payload.department || !payload.position || Number.isNaN(payload.salary)) {
        showToast('Full name, department, position, and salary are required.', 'error');
        return null;
    }

    if (payload.salary < 0) {
        showToast('Salary must be zero or higher.', 'error');
        return null;
    }

    if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
        showToast('Enter a valid work email or leave the field blank.', 'error');
        return null;
    }

    return payload;
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

async function deletePersonnel(id) {
    const person = state.personnel.find((entry) => entry.id === id);
    if (!person) return;

    if (!window.confirm(`Delete ${person.fullName} from the directory?`)) return;

    state.personnel = state.personnel.filter((entry) => entry.id !== id);

    if (state.editingId === id) {
        resetFormState();
    }

    await persistAll();
    scheduleRender();
    showToast('Personnel record deleted.');
}

function startEditing(id) {
    const selectedPerson = state.personnel.find((person) => person.id === id);
    if (!selectedPerson) return;

    elements.fullNameInput.value = selectedPerson.fullName;
    elements.emailInput.value = selectedPerson.email;
    elements.departmentInput.value = selectedPerson.department;
    elements.positionInput.value = selectedPerson.position;
    elements.statusInput.value = selectedPerson.status;
    elements.startDateInput.value = selectedPerson.startDate;
    elements.salaryInput.value = String(selectedPerson.salary);
    elements.notesInput.value = selectedPerson.notes;

    state.editingId = id;
    syncFormUi();
    navigateToSection('workspace', { updateHistory: window.location.hash !== '#workspace' });
    elements.fullNameInput.focus();
}

function resetFormState() {
    elements.personForm?.reset();
    state.editingId = null;

    if (elements.statusInput) {
        elements.statusInput.value = DEFAULTS.status;
    }

    syncFormUi();
    elements.fullNameInput?.focus();
}

function syncFormUi() {
    const isEditing = state.editingId !== null;

    elements.submitButton.textContent = isEditing ? EDIT_BUTTON_LABEL : DEFAULT_BUTTON_LABEL;
    elements.formTitle.textContent = isEditing ? EDIT_FORM_TITLE : DEFAULT_FORM_TITLE;
    elements.cancelEditButton.hidden = !isEditing;
}

function scheduleRender() {
    if (state.renderFrame !== null) return;

    const queueRender = window.requestAnimationFrame ?? ((callback) => window.setTimeout(callback, 16));

    state.renderFrame = queueRender(() => {
        state.renderFrame = null;
        renderApp();
    });
}

function renderApp() {
    syncFormUi();
    syncFilterUi();

    const departments = getDepartments();
    const visiblePersonnel = getVisiblePersonnel();

    syncDepartmentFilterOptions(departments);
    renderStats(departments);
    renderPersonnelTable(visiblePersonnel);
    updateResultsMeta(visiblePersonnel.length);
}

function syncFilterUi() {
    if (elements.statusFilter) {
        elements.statusFilter.value = state.statusFilter;
    }

    if (elements.sortSelect) {
        elements.sortSelect.value = state.sortValue;
    }

    if (elements.currencySelect) {
        elements.currencySelect.value = state.settings.currency;
    }
}

function getDepartments() {
    return [...new Set(
        state.personnel
            .map((person) => person.department)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
}

function syncDepartmentFilterOptions(departments) {
    if (!elements.departmentFilter) return;

    if (state.departmentFilter !== 'all' && !departments.includes(state.departmentFilter)) {
        state.departmentFilter = 'all';
    }

    const fragment = document.createDocumentFragment();
    fragment.appendChild(new Option('All departments', 'all'));

    for (const department of departments) {
        fragment.appendChild(new Option(department, department));
    }

    elements.departmentFilter.replaceChildren(fragment);
    elements.departmentFilter.value = state.departmentFilter;
}

function renderStats(departments) {
    const totalCount = state.personnel.length;
    const activeCount = state.personnel.filter((person) => person.status === 'Active').length;
    const payrollTotal = state.personnel.reduce((sum, person) => sum + person.salary, 0);
    const averageSalary = totalCount > 0 ? payrollTotal / totalCount : 0;

    elements.totalPersonnelStat.textContent = formatInteger(totalCount);
    elements.activePersonnelStat.textContent = formatInteger(activeCount);
    elements.departmentCountStat.textContent = formatInteger(departments.length);
    elements.payrollTotalStat.textContent = formatCurrency(payrollTotal);
    elements.payrollCaption.textContent = totalCount > 0
        ? `Average salary ${formatCurrency(averageSalary)}`
        : 'Add your first record to build payroll insights.';
}

function renderPersonnelTable(visiblePersonnel) {
    const fragment = document.createDocumentFragment();

    if (visiblePersonnel.length === 0) {
        fragment.appendChild(createEmptyRow());
    } else {
        for (const person of visiblePersonnel) {
            fragment.appendChild(createRow(person));
        }
    }

    elements.personList.replaceChildren(fragment);
}

function matchesFilters(person) {
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
}

function getVisiblePersonnel() {
    return sortPersonnel(state.personnel.filter(matchesFilters));
}

function sortPersonnel(personnel) {
    const sorter = SORTERS[state.sortValue] || SORTERS.recent;
    return [...personnel].sort(sorter);
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
    actionsCell.append(
        createActionButton('edit', 'Edit', person.id),
        createActionButton('delete', 'Delete', person.id)
    );
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
    const hasFilters = Boolean(
        state.searchTerm ||
        state.statusFilter !== 'all' ||
        state.departmentFilter !== 'all'
    );

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
    elements.resultsMeta.textContent = fragments.join(' | ');
}

async function loadDemoData() {
    if (
        state.personnel.length > 0 &&
        !window.confirm('Replace your current dataset with demo data?')
    ) {
        return;
    }

    state.personnel = createDemoPersonnel();
    await persistAll();
    resetFormState();
    scheduleRender();
    navigateToSection('workspace');
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

    downloadFile(
        'personnel-tracking-system-export.csv',
        csvContent,
        'text/csv;charset=utf-8'
    );

    showToast('CSV export prepared from the current view.');
}

async function clearAllData() {
    if (state.personnel.length === 0) {
        showToast('There is no data to clear.', 'error');
        return;
    }

    if (!window.confirm('Delete all personnel records and reset the directory?')) {
        return;
    }

    state.personnel = [];
    await persistAll();
    resetFormState();
    scheduleRender();
    navigateToSection('workspace');
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

async function persistAll() {
    persistPersonnel();
    persistSettings();
    await syncRemoteState();
}

function persistPersonnel() {
    const serializablePersonnel = state.personnel.map(stripDerivedFields);
    const saved = storage.set(STORAGE_KEYS.personnel, serializablePersonnel);

    if (!saved) {
        showToast('Local save failed. Browser storage may be unavailable.', 'error');
    }
}

function persistSettings() {
    storage.set(STORAGE_KEYS.settings, state.settings);
}

function loadPersonnel() {
    const currentData = storage.get(STORAGE_KEYS.personnel, null);
    const legacyData = currentData === null
        ? storage.get(STORAGE_KEYS.legacyPersonnel, [])
        : currentData;

    if (!Array.isArray(legacyData)) {
        return [];
    }

    return legacyData
        .map((person) => sanitizePerson(person))
        .filter(Boolean);
}

function loadSettings() {
    return sanitizeSettings(storage.get(STORAGE_KEYS.settings, { currency: DEFAULTS.currency }));
}

async function hydrateRemoteState() {
    const remoteState = await fetchRemoteState();

    if (!remoteState) {
        return;
    }

    state.backendAvailable = true;
    const localState = getCurrentAppState();
    const resolution = appStateSync.resolveAppStateSource(localState, remoteState);

    if (resolution.source === 'local') {
        await syncRemoteState({
            payload: localState,
            suppressErrorToast: true
        });
        return;
    }

    state.personnel = remoteState.personnel;
    state.settings = remoteState.settings;
    persistPersonnel();
    persistSettings();

    if (elements.currencySelect) {
        elements.currencySelect.value = state.settings.currency;
    }
}

async function fetchRemoteState() {
    try {
        const payload = await requestJson(API_ROUTES.appState);

        return {
            personnel: Array.isArray(payload?.personnel)
                ? payload.personnel.map((person) => sanitizePerson(person)).filter(Boolean)
                : [],
            settings: sanitizeSettings(payload?.settings)
        };
    } catch (error) {
        console.info('Backend state unavailable. Using local storage.', error);
        return null;
    }
}

async function syncRemoteState({ payload = null, suppressErrorToast = false } = {}) {
    if (!state.backendAvailable) {
        return false;
    }

    try {
        const appState = serializeAppState(payload || getCurrentAppState());

        await requestJson(API_ROUTES.appState, {
            method: 'PUT',
            body: JSON.stringify(appState)
        });

        return true;
    } catch (error) {
        console.warn('Backend sync failed. Falling back to local storage.', error);
        state.backendAvailable = false;

        if (!suppressErrorToast) {
            showToast('Backend sync failed. Changes are stored locally in this browser.', 'error');
        }

        return false;
    }
}

async function createBackendCheckoutSession(planKey) {
    try {
        const payload = await requestJson(API_ROUTES.checkout, {
            method: 'POST',
            body: JSON.stringify({ planKey })
        });

        state.backendAvailable = true;
        return payload;
    } catch (error) {
        const message = String(error?.message || '');
        console.warn('Secure checkout is unavailable.', error);

        if (message && !isNetworkError(message)) {
            showToast(message, 'error');
            return null;
        }

        return null;
    }
}

function isNetworkError(message) {
    return (
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('networkerror') ||
        message.toLowerCase().includes('network request failed') ||
        message.startsWith('Request failed with status')
    );
}

async function requestJson(route, options = {}) {
    const headers = new Headers(options.headers ?? {});

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    if (options.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(resolveApiUrl(route), {
        ...options,
        headers
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

    if (!response.ok) {
        const errorMessage = payload && typeof payload === 'object'
            ? payload.message
            : `Request failed with status ${response.status}.`;

        throw new Error(errorMessage);
    }

    return payload;
}

function resolveApiUrl(route) {
    const baseUrl = /^https?:$/i.test(window.location.protocol)
        ? window.location.origin
        : DEFAULT_API_BASE_URL;

    return new URL(route, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

function getCurrentAppState() {
    return {
        settings: sanitizeSettings(state.settings),
        personnel: Array.isArray(state.personnel) ? [...state.personnel] : []
    };
}

function serializeAppState(appState) {
    return {
        settings: sanitizeSettings(appState?.settings),
        personnel: Array.isArray(appState?.personnel)
            ? appState.personnel.map(stripDerivedFields)
            : []
    };
}

function sanitizePerson(person) {
    const fullName = String(person.fullName ?? person?.name ?? '').trim();
    const email = String(person.email ?? '').trim().toLowerCase();
    const department = String(person.department ?? DEFAULTS.department).trim() || DEFAULTS.department;
    const position = String(person.position ?? '').trim();
    const status = STATUS_OPTIONS.includes(person.status) ? person.status : DEFAULTS.status;
    const startDate = sanitizeDateValue(person.startDate ?? '');
    const salary = decodeSalary(person.salary);
    const notes = String(person.notes ?? '').trim();
    const id = typeof person.id === 'string' && person.id ? person.id : createId();
    const createdAt = sanitizeTimestamp(person.createdAt);
    const updatedAt = sanitizeTimestamp(person.updatedAt ?? createdAt);

    if (!fullName || !position || Number.isNaN(salary) || salary < 0) {
        return null;
    }

    return createPerson(
        {
            fullName,
            email: email && EMAIL_PATTERN.test(email) ? email : '',
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

function decodeSalary(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const stringValue = String(value ?? '').trim();
    if (!stringValue) return Number.NaN;

    const numericValue = Number(stringValue);
    if (!Number.isNaN(numericValue)) {
        return numericValue;
    }

    try {
        const decodedValue = atob(stringValue);
        const pepper = 'v1-salary-pepper';

        if (!decodedValue.startsWith(pepper)) {
            return Number.NaN;
        }

        return Number(decodedValue.slice(pepper.length));
    } catch (error) {
        return Number.NaN;
    }
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

function getCurrencyFormatter(currency) {
    if (!formatterCache.currency.has(currency)) {
        formatterCache.currency.set(
            currency,
            new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency,
                maximumFractionDigits: 0
            })
        );
    }

    return formatterCache.currency.get(currency);
}

function formatCurrency(value) {
    return getCurrencyFormatter(state.settings.currency).format(value || 0);
}

function formatInteger(value) {
    return formatterCache.integer.format(value);
}

function formatDate(value) {
    if (!value) return '—';

    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return '—';

    return formatterCache.date.format(parsedDate);
}

function encodeSalary(value) {
    const pepper = 'v1-salary-pepper';
    return btoa(pepper + String(value ?? ''));
}

function stripDerivedFields(person) {
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
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
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
    if (!elements.toast) return;

    elements.toast.textContent = message;
    elements.toast.dataset.tone = tone;
    elements.toast.hidden = false;

    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
        if (elements.toast) {
            elements.toast.hidden = true;
        }
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
    const isGitHubPages = hostname === 'github.io' || hostname.endsWith('.github.io');
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
