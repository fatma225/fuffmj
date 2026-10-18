const API_URL = "https://dummyjson.com/recipes";

const RECIPES_PER_PAGE = 6;

let allRecipes = [];
let filteredRecipes = [];
let currentPage = 1;
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, function (char) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}


// Capitalize the first letter.
function capitalize(value = "") {
  const text = String(value);

  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}


// Show loading or error messages.
function showMessage(container, message, isError = false) {
  if (!container) return;

  container.innerHTML = `
    <p class="status-message ${isError ? "error-message" : ""}">
      ${escapeHTML(message)}
    </p>
  `;
}

async function fetchRecipes(searchTerm = "") {
  const query = searchTerm.trim();

  const endpoint = query
    ? `${API_URL}/search?q=${encodeURIComponent(query)}`
    : `${API_URL}?limit=0`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error("Could not load recipes from the API.");
  }

  const data = await response.json();

  return data.recipes || [];
}

function createRecipeCard(recipe) {
  const id = Number(recipe.id);

  const title = escapeHTML(recipe.name);
  const image = escapeHTML(recipe.image);
  const cuisine = escapeHTML(recipe.cuisine || "Recipe");

  const mealTypes = Array.isArray(recipe.mealType)
    ? recipe.mealType
    : [];

  const tags = [cuisine, ...mealTypes]
    .slice(0, 3)
    .map(function (tag) {
      return `<span class="recipe-tag">${escapeHTML(tag)}</span>`;
    })
    .join("");

  const rating = Number(recipe.rating);
  const safeRating = Number.isFinite(rating)
    ? rating.toFixed(1)
    : "N/A";

  const cookTime = Number(recipe.cookTimeMinutes) || 0;
  const prepTime = Number(recipe.prepTimeMinutes) || 0;
  const totalTime = cookTime + prepTime;

  const timeText = totalTime
    ? `${totalTime} min total`
    : "Time unavailable";

  return `
    <article class="recipe-card">
      <img
        class="recipe-card-image"
        src="${image}"
        alt="${title}"
        loading="lazy">

      <div class="recipe-card-content">
        <div class="recipe-tags">
          ${tags}
        </div>

        <h3>${title}</h3>

        <div class="recipe-meta">
          <span class="recipe-rating">
            <span>★</span> ${safeRating}
          </span>

          <span class="recipe-time">
            ${timeText}
          </span>
        </div>

        <a
          class="btn btn-secondary"
          href="recipe-details.html?id=${encodeURIComponent(id)}">
          View Recipe
        </a>
      </div>
    </article>
  `;
}

async function initHomePage() {
  const container = document.getElementById("popular-recipes");

  if (!container) return;

  try {
    const recipes = await fetchRecipes();

    if (!recipes.length) {
      showMessage(container, "No recipes found.");
      return;
    }

    const popularRecipes = [...recipes]
      .sort(function (a, b) {
        return Number(b.rating || 0) - Number(a.rating || 0);
      })
      .slice(0, 4);

    container.innerHTML = popularRecipes
      .map(createRecipeCard)
      .join("");

  } catch (error) {
    console.error(error);

    showMessage(
      container,
      "Unable to load recipes. Check your internet connection and try again.",
      true
    );
  }
}

function fillFilterOptions() {
  const cuisineSelect = document.getElementById("cuisine-filter");
  const mealSelect = document.getElementById("meal-filter");

  if (!cuisineSelect || !mealSelect) return;

  const cuisines = [
    ...new Set(
      allRecipes
        .map(recipe => recipe.cuisine)
        .filter(Boolean)
    )
  ].sort();

  const mealTypes = [
    ...new Set(
      allRecipes.flatMap(recipe =>
        Array.isArray(recipe.mealType) ? recipe.mealType : []
      )
    )
  ].sort();

  cuisineSelect.innerHTML =
    '<option value="">All cuisines</option>' +
    cuisines.map(cuisine => `
      <option value="${escapeHTML(cuisine)}">
        ${escapeHTML(cuisine)}
      </option>
    `).join("");

  mealSelect.innerHTML =
    '<option value="">All meal types</option>' +
    mealTypes.map(meal => `
      <option value="${escapeHTML(meal)}">
        ${escapeHTML(capitalize(meal))}
      </option>
    `).join("");
}

function applyFilters() {
  const searchInput = document.getElementById("search-input");
  const cuisineSelect = document.getElementById("cuisine-filter");
  const mealSelect = document.getElementById("meal-filter");
  const sortSelect = document.getElementById("sort-filter");

  if (!searchInput || !cuisineSelect || !mealSelect || !sortSelect) {
    return;
  }

  const searchText = searchInput.value.trim().toLowerCase();
  const selectedCuisine = cuisineSelect.value;
  const selectedMeal = mealSelect.value;
  const selectedSort = sortSelect.value;

  filteredRecipes = allRecipes.filter(function (recipe) {
    const name = String(recipe.name || "").toLowerCase();

    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.join(" ").toLowerCase()
      : "";

    const matchesSearch =
      !searchText ||
      name.includes(searchText) ||
      ingredients.includes(searchText);

    const matchesCuisine =
      !selectedCuisine ||
      recipe.cuisine === selectedCuisine;

    const mealTypes = Array.isArray(recipe.mealType)
      ? recipe.mealType
      : [];

    const matchesMeal =
      !selectedMeal ||
      mealTypes.includes(selectedMeal);

    return matchesSearch && matchesCuisine && matchesMeal;
  });

  if (selectedSort === "rating-desc") {
    filteredRecipes.sort((a, b) =>
      Number(b.rating || 0) - Number(a.rating || 0)
    );
  } else if (selectedSort === "name-asc") {
    filteredRecipes.sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  } else if (selectedSort === "time-asc") {
    filteredRecipes.sort((a, b) =>
      (Number(a.prepTimeMinutes || 0) +
        Number(a.cookTimeMinutes || 0)) -
      (Number(b.prepTimeMinutes || 0) +
        Number(b.cookTimeMinutes || 0))
    );
  }

  currentPage = 1;

  renderRecipesPage();
}

function renderRecipesPage() {
  const container = document.getElementById("recipes-list");
  const countElement = document.getElementById("results-count");

  if (!container) return;

  const total = filteredRecipes.length;
  const totalPages = Math.ceil(total / RECIPES_PER_PAGE);

  if (countElement) {
    countElement.textContent =
      `${total} recipe${total === 1 ? "" : "s"} found`;
  }

  if (total === 0) {
    showMessage(container, "No recipes match your search. Try other filters.");
    renderPagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * RECIPES_PER_PAGE;

  const currentRecipes = filteredRecipes.slice(
    startIndex,
    startIndex + RECIPES_PER_PAGE
  );

  container.innerHTML = currentRecipes
    .map(createRecipeCard)
    .join("");

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById("pagination");

  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let buttons = `
    <button
      type="button"
      class="page-btn"
      data-page="${currentPage - 1}"
      ${currentPage === 1 ? "disabled" : ""}>
      Previous
    </button>
  `;

  for (let page = 1; page <= totalPages; page++) {
    buttons += `
      <button
        type="button"
        class="page-btn ${page === currentPage ? "active" : ""}"
        data-page="${page}"
        ${page === currentPage ? 'aria-current="page"' : ""}>
        ${page}
      </button>
    `;
  }

  buttons += `
    <button
      type="button"
      class="page-btn"
      data-page="${currentPage + 1}"
      ${currentPage === totalPages ? "disabled" : ""}>
      Next
    </button>
  `;

  container.innerHTML = buttons;
}


function initPagination() {
  const container = document.getElementById("pagination");

  if (!container) return;

  container.addEventListener("click", function (event) {
    const button = event.target.closest("[data-page]");

    if (!button || button.disabled) return;

    const nextPage = Number(button.dataset.page);

    const totalPages = Math.ceil(
      filteredRecipes.length / RECIPES_PER_PAGE
    );

    if (nextPage < 1 || nextPage > totalPages) return;

    currentPage = nextPage;

    renderRecipesPage();

    document.getElementById("recipes-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
 async function initRecipesPage() {
  const container = document.getElementById("recipes-list");

  if (!container) return;

  try {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search") || "";

    const searchInput = document.getElementById("search-input");

    if (searchInput) {
      searchInput.value = initialSearch;
    }

    // Use the search endpoint when a term is supplied.
    allRecipes = await fetchRecipes(initialSearch);

    fillFilterOptions();

    // Read optional filters from the URL.
    const cuisineParam = params.get("cuisine") || "";
    const mealParam = params.get("meal") || "";

    const cuisineSelect = document.getElementById("cuisine-filter");
    const mealSelect = document.getElementById("meal-filter");

    if (cuisineSelect &&
        [...cuisineSelect.options].some(o => o.value === cuisineParam)) {
      cuisineSelect.value = cuisineParam;
    }

    if (mealSelect &&
        [...mealSelect.options].some(o => o.value === mealParam)) {
      mealSelect.value = mealParam;
    }

    initPagination();
    applyFilters();

    document.getElementById("search-form")
      ?.addEventListener("submit", function (event) {
        event.preventDefault();

        const searchValue = searchInput.value.trim();

        const url = new URL(window.location.href);

        if (searchValue) {
          url.searchParams.set("search", searchValue);
        } else {
          url.searchParams.delete("search");
        }

        url.searchParams.delete("cuisine");
        url.searchParams.delete("meal");

        history.replaceState({}, "", url);

        // Reload the matching results from the API.
        loadSearchResults(searchValue);
      });

    cuisineSelect?.addEventListener("change", function () {
      updateFilterURL();
      applyFilters();
    });

    mealSelect?.addEventListener("change", function () {
      updateFilterURL();
      applyFilters();
    });

    document.getElementById("sort-filter")
      ?.addEventListener("change", applyFilters);

    document.getElementById("reset-filters")
      ?.addEventListener("click", function () {
        searchInput.value = "";
        cuisineSelect.value = "";
        mealSelect.value = "";
        document.getElementById("sort-filter").value = "default";

        history.replaceState(
          {},
          "",
          window.location.pathname
        );

        loadSearchResults("");
      });

  } catch (error) {
    console.error(error);

    showMessage(
      container,
      "Could not load recipes. Please check your internet connection and try again.",
      true
    );
  }
}


function updateFilterURL() {
  const url = new URL(window.location.href);

  const cuisine = document.getElementById("cuisine-filter")?.value || "";
  const meal = document.getElementById("meal-filter")?.value || "";

  if (cuisine) {
    url.searchParams.set("cuisine", cuisine);
  } else {
    url.searchParams.delete("cuisine");
  }

  if (meal) {
    url.searchParams.set("meal", meal);
  } else {
    url.searchParams.delete("meal");
  }

  history.replaceState({}, "", url);
}


async function loadSearchResults(searchTerm) {
  const container = document.getElementById("recipes-list");

  showMessage(container, "Searching recipes...");

  try {
    allRecipes = await fetchRecipes(searchTerm);

    fillFilterOptions();

    document.getElementById("cuisine-filter").value = "";
    document.getElementById("meal-filter").value = "";

    applyFilters();
  } catch (error) {
    console.error(error);

    showMessage(
      container,
      "Search failed. Please check your connection and try again.",
      true
    );
  }
}

async function initRecipeDetailsPage() {
  const container = document.getElementById("recipe-details");

  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id || !/^\d+$/.test(id)) {
    showMessage(container, "Recipe ID is missing or invalid.", true);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      throw new Error("Recipe not found.");
    }

    const recipe = await response.json();

    const image = escapeHTML(recipe.image);
    const name = escapeHTML(recipe.name);
    const cuisine = escapeHTML(recipe.cuisine || "Recipe");

    const rating = Number(recipe.rating);
    const safeRating = Number.isFinite(rating)
      ? rating.toFixed(1)
      : "N/A";

    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];

    const instructions = Array.isArray(recipe.instructions)
      ? recipe.instructions
      : [];

    const mealTypes = Array.isArray(recipe.mealType)
      ? recipe.mealType
      : [];

    const totalTime =
      Number(recipe.prepTimeMinutes || 0) +
      Number(recipe.cookTimeMinutes || 0);

    const tags = [cuisine, ...mealTypes]
      .map(tag => `
        <span class="recipe-tag">${escapeHTML(tag)}</span>
      `)
      .join("");

    const ingredientHTML = ingredients.length
      ? ingredients.map(item =>
          `<li>${escapeHTML(item)}</li>`
        ).join("")
      : "<li>Ingredients are not available.</li>";

    const instructionHTML = instructions.length
      ? instructions.map(step =>
          `<li>${escapeHTML(step)}</li>`
        ).join("")
      : "<li>Instructions are not available.</li>";

    container.innerHTML = `
      <div class="details-hero">
        <div>
          <div class="recipe-tags">${tags}</div>

          <h1 class="details-title">${name}</h1>

          <p class="details-description">
            Discover this delicious recipe and follow the steps below
            to prepare it.
          </p>

          <p class="recipe-rating">
            <span>★</span> ${safeRating} rating
          </p>

          <div class="details-stats">
            <div class="stat-box">
              <strong>${Number(recipe.prepTimeMinutes) || 0} min</strong>
              <span>Prep time</span>
            </div>

            <div class="stat-box">
              <strong>${Number(recipe.cookTimeMinutes) || 0} min</strong>
              <span>Cook time</span>
            </div>

            <div class="stat-box">
              <strong>${totalTime} min</strong>
              <span>Total time</span>
            </div>

            <div class="stat-box">
              <strong>${Number(recipe.servings) || 1}</strong>
              <span>Servings</span>
            </div>
          </div>

          <p>
            Difficulty: ${escapeHTML(recipe.difficulty || "Not specified")}
          </p>
        </div>

        <img
          class="details-image"
          src="${image}"
          alt="${name}">
      </div>

      <div class="details-info-grid">
        <section class="details-panel">
          <h2>Ingredients</h2>
          <ul class="ingredient-list">
            ${ingredientHTML}
          </ul>
        </section>

        <section class="details-panel">
          <h2>Cooking Instructions</h2>
          <ol class="instruction-list">
            ${instructionHTML}
          </ol>
        </section>
      </div>
    `;

    document.title = `${recipe.name} | TastyBite`;

  } catch (error) {
    console.error(error);

    showMessage(
      container,
      "Could not load this recipe. Please check the recipe link or your connection.",
      true
    );
  }
}


 function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    const isOpen = nav.classList.toggle("open");

    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "✕" : "☰";
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "☰";
    });
  });
}

 document.addEventListener("DOMContentLoaded", function () {
  initMobileMenu();
  initHomePage();
  initRecipesPage();
  initRecipeDetailsPage();
});
