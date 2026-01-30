const API_BASE = '/api';

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
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Initial active state
    updateNavState();
}

function switchTab(tab) {
    state.currentTab = tab;
    updateNavState();
    render();
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

function setupModal() {
    const modal = document.getElementById('add-modal');
    const saveBtn = document.getElementById('modal-save');
    const cancelBtn = document.getElementById('modal-cancel');

    // FAB Logic (Add Button)
    // Create FAB dynamically if not exists
    let fab = document.getElementById('fab');
    if (!fab) {
        fab = document.createElement('button');
        fab.id = 'fab';
        fab.className = 'fab';
        fab.innerHTML = '<span class="mdi mdi-plus"></span>';
        document.body.appendChild(fab); // Append to body, not main
        fab.addEventListener('click', () => {
            modal.classList.remove('hidden');
            // Force reflow
            void modal.offsetWidth;
            modal.classList.add('visible');
        });
    }

    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('modal-name').value;
        const amount = document.getElementById('modal-amount').value;
        const unit = document.getElementById('modal-unit').value;

        if (name && amount) {
            await addItem(name, amount, unit);
            closeModal();
            // Clear inputs
            document.getElementById('modal-name').value = '';
            document.getElementById('modal-amount').value = '';
        }
    });
}

function closeModal() {
    const modal = document.getElementById('add-modal');
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function render() {
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
        main.innerHTML = ''; // Clear loading

        if (data.length === 0) {
            main.innerHTML = '<div style="text-align: center; color: #999; margin-top: 50px;">Keine Einträge</div>';
            return;
        }

        if (state.currentTab === 'recipes') {
            renderRecipes(data, main);
        } else {
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
            moveBtn.innerHTML = '<span class="mdi mdi-fridge-outline"></span>'; // Move to fridge
            moveBtn.onclick = () => moveItem(item.id, '/move'); // /shopping/{id}/move -> to inventory
            actions.appendChild(moveBtn);
        } else if (state.currentTab === 'inventory') {
            const moveBtn = document.createElement('button');
            moveBtn.className = 'btn-move';
            moveBtn.innerHTML = '<span class="mdi mdi-cart-outline"></span>'; // Move to shopping
            moveBtn.onclick = () => moveItem(item.id, '/move'); // /inventory/{id}/move -> to shopping
            actions.appendChild(moveBtn);
        } else if (state.currentTab === 'templates') {
            const useBtn = document.createElement('button');
            useBtn.className = 'btn-move';
            useBtn.innerHTML = '<span class="mdi mdi-plus-circle-outline"></span>'; // Add to shopping list
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

        // Need to attach event listener properly for function reference to work
        const btn = card.querySelector('.btn-move');
        btn.onclick = () => cookRecipe(recipe.id);

        container.appendChild(card);
    });
}

// --- Actions ---
async function addItem(name, amount, unit) {
    let endpoint = '';
    switch (state.currentTab) {
        case 'shopping': endpoint = '/shopping'; break;
        case 'inventory': endpoint = '/inventory'; break;
        case 'templates': endpoint = '/templates'; break;
        case 'recipes': alert('Rezepte hinzufügen noch nicht implementiert'); return;
    }

    await api.post(endpoint, { name, amount: parseFloat(amount), unit });
    render();
}

async function deleteItem(id) {
    let endpoint = '';
    switch (state.currentTab) {
        case 'shopping': endpoint = `/shopping/${id}`; break;
        case 'inventory': endpoint = `/inventory/${id}`; break;
        case 'templates': endpoint = `/templates/${id}`; break;
    }
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
