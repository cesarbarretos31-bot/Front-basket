<script setup>
import { computed, ref, watch } from 'vue';
import { api } from './api';

const userNameSearch = ref('');
const currentBasket = ref(null);
const message = ref('');
const isError = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const currentPage = ref(1);
const pageSize = 5;

const form = ref({
  userName: '',
  items: [
    { productId: '', productName: '', quantity: 1, price: 0, color: 'Black' }
  ]
});

const totalItems = computed(() => currentBasket.value?.items?.length || 0);
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize)));
const paginatedItems = computed(() => {
  const items = currentBasket.value?.items || [];
  const start = (currentPage.value - 1) * pageSize;
  return items.slice(start, start + pageSize);
});

const formatCurrency = (value) => {
  const numericValue = Number(value || 0);
  return numericValue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
};

const resetForm = () => {
  form.value = {
    userName: '',
    items: [{ productId: '', productName: '', quantity: 1, price: 0, color: 'Black' }]
  };
};

watch(currentBasket, () => {
  currentPage.value = 1;
});

const fetchBasket = async () => {
  const trimmedName = userNameSearch.value.trim();

  if (!trimmedName) {
    showNotification('⚠️ Ingresa un nombre de usuario para buscar.', true);
    return;
  }

  isLoading.value = true;

  try {
    const response = await api.get(`/basket/${trimmedName}`);
    currentBasket.value = response.data.cart || response.data;
    showNotification(`✅ Cesta encontrada para: ${trimmedName}`, false);
  } catch (error) {
    console.error('Error al obtener la cesta:', error);
    currentBasket.value = null;
    showNotification(`❌ No se encontró cesta para el usuario "${trimmedName}"`, true);
  } finally {
    isLoading.value = false;
  }
};

const addItemField = () => {
  form.value.items.push({ productId: '', productName: '', quantity: 1, price: 0, color: 'Black' });
};

const removeItemField = (index) => {
  form.value.items.splice(index, 1);
};

const saveBasket = async () => {
  const userName = form.value.userName.trim();
  const items = form.value.items.filter((item) => item.productId || item.productName || item.color);

  if (!userName) {
    showNotification('⚠️ El nombre de usuario es obligatorio.', true);
    return;
  }

  if (items.length === 0) {
    showNotification('⚠️ Agrega al menos un producto para guardar.', true);
    return;
  }

  const invalidItems = items.some((item) => !item.productId || !item.productName || !item.color || Number(item.quantity) < 1 || Number(item.price) < 0);
  if (invalidItems) {
    showNotification('⚠️ Revisa que todos los campos estén completos y válidos.', true);
    return;
  }

  isSaving.value = true;

  try {
    const payload = {
      cart: {
        userName,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: parseInt(item.quantity, 10),
          price: parseFloat(item.price),
          color: item.color
        }))
      }
    };

    await api.post('/basket', payload);
    showNotification(`🎉 Cesta guardada exitosamente para ${userName}.`, false);
    userNameSearch.value = userName;
    resetForm();
    await fetchBasket();
  } catch (error) {
    console.error('Error al guardar la cesta:', error);
    showNotification('❌ Error al guardar la cesta. Revisa los datos o intenta de nuevo.', true);
  } finally {
    isSaving.value = false;
  }
};

const deleteBasket = async (userName) => {
  if (confirm(`⚠️ ¿Estás seguro de eliminar toda la cesta de "${userName}"?`)) {
    try {
      await api.delete(`/basket/${userName}`);
      showNotification(`🗑️ Cesta de "${userName}" eliminada correctamente.`, false);
      if (currentBasket.value && currentBasket.value.userName === userName) {
        currentBasket.value = null;
      }
    } catch (error) {
      console.error('Error al eliminar la cesta:', error);
      showNotification('❌ No se pudo eliminar la cesta.', true);
    }
  }
};

const showNotification = (msg, errorState) => {
  message.value = msg;
  isError.value = errorState;
  window.clearTimeout(showNotification.timeoutId);
  showNotification.timeoutId = window.setTimeout(() => {
    message.value = '';
  }, 4000);
};

const calculateTotal = (items) => {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0).toFixed(2);
};

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
</script>

<template>
  <div class="app-wrapper">
    <div class="container">
      <header class="header">
        <div class="hero-badge">⚡ Panel premium de gestión de cesta</div>
        <h1 class="title">Gestión de cesta con experiencia de alto nivel</h1>
        <p class="subtitle">Consulta, organiza y sincroniza carritos con una interfaz limpia, rápida y profesional.</p>
      </header>

      <div v-if="message" :class="['notification', isError ? 'notification-error' : 'notification-success']">
        {{ message }}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Usuario consultado</span>
          <strong>{{ currentBasket?.userName || '—' }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">Productos activos</span>
          <strong>{{ totalItems }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">Valor total</span>
          <strong>{{ formatCurrency(calculateTotal(currentBasket?.items)) }}</strong>
        </div>
      </div>

      <div class="card premium-shadow">
        <div class="card-header">
          <h3>🔍 Consultar cesta por usuario</h3>
        </div>
        <div class="search-controls">
          <div class="input-group">
            <input v-model="userNameSearch" type="text" placeholder="Ej. swn" @keyup.enter="fetchBasket" />
          </div>
          <button class="btn btn-primary" @click="fetchBasket" :disabled="isLoading">
            {{ isLoading ? 'Buscando...' : 'Buscar cesta' }}
          </button>
        </div>
      </div>

      <div class="card premium-shadow" v-if="currentBasket">
        <div class="card-header flex-between">
          <h3>🛍️ Cesta de <span class="highlight-user">{{ currentBasket.userName }}</span></h3>
          <button class="btn-icon btn-delete" @click="deleteBasket(currentBasket.userName)" title="Eliminar cesta completa">🗑️</button>
        </div>

        <div class="table-responsive">
          <table class="product-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Color</th>
                <th>Cantidad</th>
                <th>Precio unit.</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedItems" :key="`${item.productId}-${item.productName}`" class="table-row">
                <td>
                  <div class="product-info">
                    <strong class="product-name">{{ item.productName }}</strong>
                    <span class="product-id">ID: {{ item.productId }}</span>
                  </div>
                </td>
                <td><span class="category-badge">{{ item.color }}</span></td>
                <td><span class="quantity-tag">{{ item.quantity }}</span></td>
                <td>{{ formatCurrency(item.price) }}</td>
                <td class="text-right price-tag">{{ formatCurrency(item.price * item.quantity) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-bar" v-if="totalItems > pageSize">
          <button class="btn btn-outline" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">Anterior</button>
          <div class="page-dots">
            <button v-for="page in totalPages" :key="page" class="page-btn" :class="{ active: page === currentPage }" @click="changePage(page)">
              {{ page }}
            </button>
          </div>
          <button class="btn btn-outline" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">Siguiente</button>
        </div>

        <div class="basket-total-footer">
          <span>Mostrando {{ paginatedItems.length }} de {{ totalItems }} productos</span>
          <span class="grand-total">Total: {{ formatCurrency(calculateTotal(currentBasket.items)) }}</span>
        </div>
      </div>

      <div class="card premium-shadow highlight-card" v-else>
        <div class="card-header">
          <h3>✨ Crear o actualizar cesta</h3>
        </div>
        <form @submit.prevent="saveBasket" class="grid-form-basket">
          <div class="input-group full-width">
            <label>Nombre de usuario</label>
            <input v-model="form.userName" type="text" placeholder="Ej. swn" required />
          </div>

          <div class="items-section full-width">
            <h4>Artículos de la cesta</h4>

            <div v-for="(item, index) in form.items" :key="index" class="item-row">
              <div class="input-group">
                <input v-model="item.productId" type="text" placeholder="Product ID" required />
              </div>
              <div class="input-group">
                <input v-model="item.productName" type="text" placeholder="Nombre producto" required />
              </div>
              <div class="input-group">
                <input v-model="item.quantity" type="number" min="1" placeholder="Cantidad" required />
              </div>
              <div class="input-group">
                <input v-model="item.price" type="number" step="0.01" min="0" placeholder="Precio" required />
              </div>
              <div class="input-group">
                <input v-model="item.color" type="text" placeholder="Color" required />
              </div>
              <button type="button" class="btn-icon btn-delete" @click="removeItemField(index)" v-if="form.items.length > 1" title="Quitar ítem">✖</button>
            </div>

            <button type="button" class="btn btn-outline btn-add-item" @click="addItemField">+ Agregar producto</button>
          </div>

          <div class="form-actions full-width">
            <button type="submit" class="btn btn-action" :disabled="isSaving">
              {{ isSaving ? 'Guardando...' : 'Guardar / sincronizar cesta' }}
            </button>
          </div>
        </form>
      </div>

      <div class="card premium-shadow" v-if="!currentBasket">
        <div class="card-header">
          <h3>🧩 Estado de la experiencia</h3>
        </div>
        <p class="empty-state">Busca un usuario para ver el carrito, o crea uno nuevo desde el formulario premium.</p>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --primary: #4F46E5;
  --primary-strong: #312E81;
  --bg-color: #0f172a;
  --card-bg: rgba(15, 23, 42, 0.82);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --border-light: rgba(148, 163, 184, 0.22);
  --danger: #fb7185;
  --danger-bg: rgba(251, 113, 133, 0.18);
  --success: #34d399;
  --success-bg: rgba(52, 211, 153, 0.18);
  --accent: #8b5cf6;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(79, 70, 229, 0.35), transparent 28%),
    linear-gradient(135deg, #020617 0%, #111827 100%);
  font-family: 'Inter', sans-serif;
  color: var(--text-main);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.app-wrapper {
  min-height: 100vh;
  padding: 40px 20px;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.hero-badge {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.2);
  border: 1px solid rgba(129, 140, 248, 0.35);
  color: #c7d2fe;
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.title {
  font-size: 2.3rem;
  font-weight: 800;
  margin: 0 0 8px;
  color: white;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-muted);
  margin: 0;
}

.notification {
  padding: 12px 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-weight: 600;
  text-align: center;
  animation: fadeIn 0.25s ease;
}

.notification-success {
  background: var(--success-bg);
  color: #bbf7d0;
}

.notification-error {
  background: var(--danger-bg);
  color: #fecdd3;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-card strong {
  font-size: 1.05rem;
  color: white;
}

.card {
  background: var(--card-bg);
  border-radius: 18px;
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
}

.premium-shadow {
  box-shadow: 0 18px 45px rgba(2, 6, 23, 0.28);
}

.highlight-card {
  position: relative;
  overflow: hidden;
}

.highlight-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
}

.card-header {
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.highlight-user {
  color: #c7d2fe;
  text-transform: uppercase;
}

.grid-form-basket {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.full-width {
  width: 100%;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 0.82rem;
  color: var(--text-muted);
}

input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.06);
  color: white;
  font-size: 0.95rem;
}

input:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.85);
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.18);
}

.search-controls {
  display: flex;
  gap: 12px;
}

.search-controls .input-group {
  flex-grow: 1;
}

.items-section {
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border-light);
}

.items-section h4 {
  margin: 0 0 12px;
  font-size: 0.95rem;
}

.item-row {
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 0.8fr 0.9fr 0.8fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.btn {
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
}

.btn-action {
  width: 100%;
  background: linear-gradient(135deg, var(--primary), #818cf8);
  color: white;
  font-size: 0.95rem;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-light);
  color: var(--text-main);
}

.btn-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-delete {
  background: var(--danger-bg);
  color: var(--danger);
}

.table-responsive {
  overflow-x: auto;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
}

.product-table th {
  padding: 12px;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.product-table td {
  padding: 14px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  vertical-align: middle;
}

.product-name {
  display: block;
  font-size: 0.95rem;
}

.product-id {
  display: block;
  font-size: 0.76rem;
  color: var(--text-muted);
  margin-top: 3px;
}

.category-badge {
  display: inline-block;
  background: rgba(129, 140, 248, 0.16);
  color: #c7d2fe;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.quantity-tag {
  display: inline-block;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 8px;
  border-radius: 8px;
}

.price-tag {
  font-weight: 700;
  color: #bbf7d0;
}

.text-right {
  text-align: right;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.page-dots {
  display: flex;
  gap: 8px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
}

.page-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-color: transparent;
  color: white;
}

.basket-total-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
  color: var(--text-muted);
}

.grand-total {
  font-size: 1.05rem;
  font-weight: 700;
  color: #bbf7d0;
}

.empty-state {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .search-controls {
    flex-direction: column;
  }

  .item-row {
    grid-template-columns: 1fr;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .page-dots {
    justify-content: center;
  }

  .basket-total-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>