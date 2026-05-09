/* ================================================
   LA PIAZZA – app.js
   Fetches recipes from DummyJSON API & powers UI
   ================================================ */

/* ---------- CONFIG ---------- */
const API_BASE   = 'https://dummyjson.com';
const BATCH_SIZE = 9;   // cards per load
const LIMIT_MAX  = 50;  // total to fetch

/* ---------- STATE ---------- */
let allRecipes   = [];   // full fetched list
let displayed    = 0;    // how many currently shown

/* ---------- DOM REFS ---------- */
const cardsGrid    = document.getElementById('cardsGrid');
const loadingState = document.getElementById('loadingState');
const errorState   = document.getElementById('errorState');
const loadMoreBtn  = document.getElementById('loadMoreBtn');
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const yearSpan     = document.getElementById('year');
const navbar       = document.getElementById('navbar');
const hamburger    = document.getElementById('hamburger');
const navLinks     = document.getElementById('navLinks');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const modalBody    = document.getElementById('modalBody');

/* ---------- YEAR ---------- */
yearSpan.textContent = new Date().getFullYear();

/* ---------- NAVBAR SCROLL ---------- */
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

/* ---------- HAMBURGER ---------- */
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

/* ---------- FETCH RECIPES ---------- */
async function loadRecipes() {
  showLoading(true);
  hideError();
  cardsGrid.innerHTML = '';
  displayed = 0;
  allRecipes = [];

  try {
    // Fetch a broad set of recipes (no pizza-specific API filter,
    // we'll supplement with a Margherita/pizza search)
    const [generalRes, pizzaRes] = await Promise.all([
      fetch(`${API_BASE}/recipes?limit=${LIMIT_MAX}&skip=0`),
      fetch(`${API_BASE}/recipes/search?q=pizza`)
    ]);

    const generalData = await generalRes.json();
    const pizzaData   = await pizzaRes.json();

    // Merge, deduplicate by id, pizza results first
    const pizzaRecipes   = pizzaData.recipes   || [];
    const generalRecipes = generalData.recipes || [];

    const seen = new Set(pizzaRecipes.map(r => r.id));
    const merged = [
      ...pizzaRecipes,
      ...generalRecipes.filter(r => !seen.has(r.id))
    ];

    allRecipes = merged;
    showLoading(false);
    renderBatch();

  } catch (err) {
    console.error('API error:', err);
    showLoading(false);
    showError();
  }
}

/* ---------- RENDER CARDS ---------- */
function renderBatch() {
  const batch = allRecipes.slice(displayed, displayed + BATCH_SIZE);

  batch.forEach((recipe, idx) => {
    const card = buildCard(recipe, displayed + idx);
    cardsGrid.appendChild(card);
  });

  displayed += batch.length;

  // Show/hide Load More
  loadMoreBtn.style.display = displayed < allRecipes.length ? 'inline-block' : 'none';
}

function buildCard(recipe, animIdx) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${(animIdx % BATCH_SIZE) * 0.07}s`;

  const ingredients = recipe.ingredients
    ? recipe.ingredients.slice(0, 5).join(', ') + (recipe.ingredients.length > 5 ? '…' : '')
    : 'Fresh Italian ingredients';

  const rating  = recipe.rating  ? recipe.rating.toFixed(1)  : '5.0';
  const cuisine = recipe.cuisine || 'Italian';
  const prepTime = recipe.prepTimeMinutes || '–';
  const servings = recipe.servings || '–';
  const difficulty = recipe.difficulty || 'Easy';

  card.innerHTML = `
    <div class="card-img-wrap">
      <img
        src="${recipe.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=70'}"
        alt="${recipe.name}"
        loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=70'"
      />
      <span class="card-badge">${difficulty}</span>
      <span class="card-rating">⭐ ${rating}</span>
    </div>
    <div class="card-body">
      <p class="card-cuisine">${cuisine}</p>
      <h3 class="card-title">${recipe.name}</h3>
      <p class="card-ingredients"><strong>Ingredients:</strong> ${ingredients}</p>
      <div class="card-meta">
        <span class="meta-item">⏱ ${prepTime} min</span>
        <span class="meta-item">🍽 ${servings} servings</span>
        <span class="card-cta">View Recipe →</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openModal(recipe));
  return card;
}

/* ---------- LOAD MORE ---------- */
function loadMore() {
  renderBatch();
}

/* ---------- SEARCH ---------- */
async function searchRecipes(query) {
  if (!query.trim()) {
    // Reset to full list
    cardsGrid.innerHTML = '';
    displayed = 0;
    renderBatch();
    return;
  }

  showLoading(true);
  cardsGrid.innerHTML = '';
  displayed = 0;
  loadMoreBtn.style.display = 'none';

  try {
    const res  = await fetch(`${API_BASE}/recipes/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    allRecipes = data.recipes || [];
    showLoading(false);

    if (allRecipes.length === 0) {
      cardsGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)">
          <p style="font-size:2rem">🍕</p>
          <p style="margin-top:.5rem">No recipes found for "<strong>${query}</strong>". Try another search!</p>
        </div>`;
      return;
    }

    renderBatch();
  } catch (err) {
    console.error('Search error:', err);
    showLoading(false);
    showError();
  }
}

searchBtn.addEventListener('click', () => searchRecipes(searchInput.value));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchRecipes(searchInput.value);
});

/* ---------- MODAL ---------- */
function openModal(recipe) {
  const ingredients = (recipe.ingredients || []);
  const instructions = (recipe.instructions || []);
  const cuisine  = recipe.cuisine  || 'Italian';
  const calories = recipe.caloriesPerServing || '–';
  const prepTime = recipe.prepTimeMinutes  || '–';
  const cookTime = recipe.cookTimeMinutes  || '–';
  const servings = recipe.servings || '–';
  const rating   = recipe.rating  ? recipe.rating.toFixed(1) : '5.0';
  const tags     = (recipe.tags   || []).join(', ') || 'Pizza, Italian';

  modalBody.innerHTML = `
    <img class="modal-img"
      src="${recipe.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80'}"
      alt="${recipe.name}"
      onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80'"
    />
    <div class="modal-content">
      <p class="modal-cuisine">${cuisine} · ⭐ ${rating}</p>
      <h2 class="modal-title">${recipe.name}</h2>
      <div class="modal-stats">
        <div class="modal-stat"><strong>⏱ ${prepTime} min</strong><span>Prep</span></div>
        <div class="modal-stat"><strong>🔥 ${cookTime} min</strong><span>Cook</span></div>
        <div class="modal-stat"><strong>🍽 ${servings}</strong><span>Servings</span></div>
        <div class="modal-stat"><strong>🔋 ${calories}</strong><span>Calories</span></div>
      </div>

      ${ingredients.length ? `
      <div class="modal-section">
        <h4>🧀 Ingredients</h4>
        <ul>${ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>` : ''}

      ${instructions.length ? `
      <div class="modal-section modal-instructions">
        <h4>👨‍🍳 Instructions</h4>
        <ol>${instructions.map(step => `<li>${step}</li>`).join('')}</ol>
      </div>` : ''}

      ${tags ? `
      <div class="modal-section">
        <h4>🏷️ Tags</h4>
        <ul>${tags.split(',').map(t => `<li>${t.trim()}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
  `;

  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ---------- UI HELPERS ---------- */
function showLoading(show) {
  loadingState.style.display = show ? 'block' : 'none';
}
function showError() {
  errorState.classList.remove('hidden');
}
function hideError() {
  errorState.classList.add('hidden');
}

/* ---------- SCROLL ANIMATIONS ---------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.about-container, .contact-container').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity .7s ease, transform .7s ease';
  observer.observe(el);
});

/* ---------- INIT ---------- */
loadRecipes();
