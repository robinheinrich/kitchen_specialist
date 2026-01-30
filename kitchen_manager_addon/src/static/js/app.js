const API_BASE = 'api';

const state = {
    currentTab: 'shopping',
    items: [],
};

// --- API Client ---
const api = {
    get: async (endpoint) => (await fetch(`${API_BASE}${endpoint}`)).json(),
    post: async (endpoint, data) => (await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })).json(),
    put: async (endpoint, data) => (await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })).json(),
    delete: async (endpoint) => (await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' })).json()
};

// --- UI Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    // Load Settings to get default tab
    const settings = await api.get('/settings');
    state.currentTab = settings.default_tab || 'shopping';

    setupNav();
    render();
    setupModal();
});

function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Find closest button in case icon is clicked
            const btnEl = e.target.closest('.nav-btn');
            if (btnEl) {
                const tab = btnEl.dataset.tab;
                switchTab(tab);
            }
        });
    });
    updateNavState();
}

function switchTab(tab) {
    state.currentTab = tab;
    updateNavState();
    render();

    // Manage FAB visibility: Hide in recipes for now if not implemented
    const fab = document.getElementById('fab');
    if (fab) {
        fab.style.display = tab === 'recipes' ? 'none' : 'flex';
    }
}

function updateNavState() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.tab === state.currentTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function openModal(item = null) {
    const modal = document.getElementById('add-modal');
    const title = document.getElementById('modal-title');
    const idInput = document.getElementById('modal-id');
    const nameInput = document.getElementById('modal-name');
    const amountInput = document.getElementById('modal-amount');
    const unitInput = document.getElementById('modal-unit');

    if (item) {
        title.textContent = 'Item bearbeiten';
        idInput.value = item.id;
        nameInput.value = item.name;
        amountInput.value = item.amount;
        unitInput.value = item.unit;
    } else {
        title.textContent = 'Neues Item';
        idInput.value = '';
        nameInput.value = '';
        amountInput.value = '';
        unitInput.value = 'st'; // Default
    }

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.add('visible');
}

function closeModal(modalId = 'add-modal') {
    const modal = document.getElementById(modalId);
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function setupModal() {
    // Add Item Modal
    const addModal = document.getElementById('add-modal');
    const saveBtn = document.getElementById('modal-save');
    const cancelBtn = document.getElementById('modal-cancel');

    // Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsSave = document.getElementById('settings-save');
    const settingsCancel = document.getElementById('settings-cancel');

    // FAB Logic
    let fab = document.getElementById('fab');
    if (!fab) {
        fab = document.createElement('button');
        fab.id = 'fab';
        fab.className = 'fab';
        fab.innerHTML = '<span class="mdi mdi-plus"></span>';
        document.body.appendChild(fab);
        fab.addEventListener('click', () => openModal());
    }

    // Bind Add/Edit Modal
    cancelBtn.addEventListener('click', () => closeModal('add-modal'));
    saveBtn.addEventListener('click', async () => {
        const id = document.getElementById('modal-id').value;
        const name = document.getElementById('modal-name').value;
        const amount = document.getElementById('modal-amount').value;
        const unit = document.getElementById('modal-unit').value;

        if (name && amount) {
            await saveItem(id, name, amount, unit);
            closeModal('add-modal');
        }
    });

    // Bind Settings Modal
    settingsBtn.addEventListener('click', async () => {
        // Load current settings
        const settings = await api.get('/settings');
        document.getElementById('default-tab-select').value = settings.default_tab || 'shopping';

        settingsModal.classList.remove('hidden');
        void settingsModal.offsetWidth;
        settingsModal.classList.add('visible');
    });

    settingsCancel.addEventListener('click', () => closeModal('settings-modal'));

    settingsSave.addEventListener('click', async () => {
        const defaultTab = document.getElementById('default-tab-select').value;
        await api.post('/settings', { default_tab: defaultTab });
        closeModal('settings-modal');
        // No alert requested
    });
}

function updateTitle() {
    const subtitles = {
        'shopping': '- Einkauf',
        'inventory': '- Bestand',
        'recipes': '- Rezepte',
        'templates': '- Vorlagen'
    };
    const subtitleEl = document.getElementById('header-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = subtitles[state.currentTab] || '';
    }
}

async function render() {
    updateTitle(); // Update title on render/switch
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="text-align: center; padding: 20px;">Laden...</div>';

    let data = [];
    let endpoint = '';

    switch (state.currentTab) {
        case 'shopping': endpoint = '/shopping'; break;
        case 'inventory': endpoint = '/inventory'; break;
        case 'templates': endpoint = '/templates'; break;
        case 'recipes': endpoint = '/recipes'; break;
    }

    try {
        data = await api.get(endpoint);
        main.innerHTML = '';

        if (data.length === 0) {
            main.innerHTML = '<div style="text-align: center; color: #999; margin-top: 50px;">Keine Einträge</div>';
            return;
        }

        if (state.currentTab === 'recipes') {
            renderRecipes(data, main);
        } else {
            state.items = data; // Cache for edit
            renderList(data, main);
        }

    } catch (e) {
        main.innerHTML = `<div style="color: red; text-align: center;">Fehler: ${e.message}</div>`;
    }
}

function renderList(items, container) {
    const template = document.getElementById('list-item-template');

    items.forEach(item => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.card');
        card.dataset.id = item.id;

        clone.querySelector('.item-name').textContent = item.name;
        clone.querySelector('.item-amount').textContent = `${item.amount} ${item.unit}`;

        const actions = clone.querySelector('.item-actions');

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<span class="mdi mdi-pencil-outline"></span>';
        editBtn.onclick = () => openModal(item);
        actions.appendChild(editBtn);

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete';
        delBtn.innerHTML = '<span class="mdi mdi-trash-can-outline"></span>';
        delBtn.onclick = () => deleteItem(item.id);
        actions.appendChild(delBtn);

        // Move Button Logic
        if (state.currentTab === 'shopping') {
            const moveBtn = document.createElement('button');
            moveBtn.className = 'btn-move';
            moveBtn.innerHTML = '<span class="mdi mdi-fridge-outline"></span>';
            moveBtn.onclick = () => moveItem(item.id, '/move');
            actions.appendChild(moveBtn);
        } else if (state.currentTab === 'inventory') {
            const moveBtn = document.createElement('button');
            moveBtn.className = 'btn-move';
            moveBtn.innerHTML = '<span class="mdi mdi-cart-outline"></span>';
            moveBtn.onclick = () => moveItem(item.id, '/move');
            actions.appendChild(moveBtn);
        } else if (state.currentTab === 'templates') {
            const useBtn = document.createElement('button');
            useBtn.className = 'btn-move';
            useBtn.innerHTML = '<span class="mdi mdi-plus-circle-outline"></span>';
            useBtn.onclick = () => useTemplate(item.id);
            actions.appendChild(useBtn);
        }

        container.appendChild(clone);
    });
}

function renderRecipes(recipes, container) {
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'card item-card';
        card.innerHTML = `
            <div class="item-info">
                <div class="item-name">${recipe.title}</div>
                <div class="item-amount">${recipe.servings} Portionen</div>
                <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
                     ${recipe.ingredients.map(i => i.name).join(', ')}
                </div>
            </div>
            <div class="item-actions">
                 <button class="btn-move" onclick="cookRecipe(${recipe.id})">
                    <span class="mdi mdi-pot-steam-outline"></span>
                 </button>
            </div>
        `;
        // Attach click handler for cook button since innerHTML string breaks onclick scope
        card.querySelector('.btn-move').onclick = () => cookRecipe(recipe.id);

        container.appendChild(card);
    });
}

// --- Actions ---
async function saveItem(id, name, amount, unit) {
    let endpoint = '';
    switch (state.currentTab) {
        case 'shopping': endpoint = '/shopping'; break;
        case 'inventory': endpoint = '/inventory'; break;
        case 'templates': endpoint = '/templates'; break;
        case 'recipes': return;
    }

    const payload = { name, amount: parseFloat(amount), unit };

    if (id) {
        // Update
        await api.put(`${endpoint}/${id}`, payload);
    } else {
        // Create
        await api.post(endpoint, payload);
    }
    render();
}

async function deleteItem(id) {
    let endpoint = '';
    switch (state.currentTab) {
        case 'shopping': endpoint = `/shopping/${id}`; break;
        case 'inventory': endpoint = `/inventory/${id}`; break;
        case 'templates': endpoint = `/templates/${id}`; break;
    }
    // No confirm for quicker action, or maybe soft confirm? User asked for edit, not delete workflow change.
    // Keeping confirm from before to be safe.
    if (confirm('Wirklich löschen?')) {
        await api.delete(endpoint);
        render();
    }
}

async function moveItem(id, actionPath) {
    let base = state.currentTab === 'shopping' ? '/shopping' : '/inventory';
    await api.post(`${base}/${id}${actionPath}`, {});
    render();
}

async function useTemplate(id) {
    await api.post(`/templates/${id}/use`, {});
    alert('Zur Einkaufsliste hinzugefügt');
}

async function cookRecipe(id) {
    if (confirm('Rezept kochen? Zutaten werden vom Bestand abgezogen.')) {
        await api.post(`/recipes/${id}/cook`, {});
        alert('Guten Appetit! Bestand aktualisiert.');
    }
}
