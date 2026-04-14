/* ---------- DOM references ---------- */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectedBtn = document.getElementById("clearSelectedBtn");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const rtlToggle = document.getElementById("rtlToggle");
const webSearchToggle = document.getElementById("webSearchToggle");

/* ---------- App config ---------- */
const WORKER_URL = window.APP_CONFIG?.WORKER_URL || "";
const SELECTED_PRODUCTS_STORAGE_KEY = "loreal-selected-products";
const DIRECTION_STORAGE_KEY = "loreal-layout-direction";

/* ---------- App state ---------- */
let allProducts = [];
let filteredProducts = [];
let selectedProductIds = new Set();
let conversationHistory = [];
let routineGenerated = false;

/* ---------- Initial UI ---------- */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Loading products...
  </div>
`;

chatWindow.innerHTML = `
  <div class="message assistant-message">
    Select products, then click <strong>Generate Routine</strong> to start your personalized consultation.
  </div>
`;

/* ---------- Utility helpers ---------- */
function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveSelectedProducts() {
  localStorage.setItem(
    SELECTED_PRODUCTS_STORAGE_KEY,
    JSON.stringify(Array.from(selectedProductIds)),
  );
}

function loadSelectedProducts() {
  const rawData = localStorage.getItem(SELECTED_PRODUCTS_STORAGE_KEY);
  if (!rawData) return;

  try {
    const parsedIds = JSON.parse(rawData);
    if (Array.isArray(parsedIds)) {
      selectedProductIds = new Set(parsedIds);
    }
  } catch (error) {
    console.error("Could not parse saved selected products:", error);
  }
}

function saveDirectionPreference(isRtlEnabled) {
  localStorage.setItem(DIRECTION_STORAGE_KEY, isRtlEnabled ? "rtl" : "ltr");
}

function loadDirectionPreference() {
  const savedDirection = localStorage.getItem(DIRECTION_STORAGE_KEY);
  if (savedDirection === "rtl") {
    document.documentElement.setAttribute("dir", "rtl");
    rtlToggle.checked = true;
  } else {
    document.documentElement.setAttribute("dir", "ltr");
    rtlToggle.checked = false;
  }
}

/* ---------- Product loading + filtering ---------- */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

function applyFilters() {
  const selectedCategory = categoryFilter.value;
  const query = productSearch.value.trim().toLowerCase();

  filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;
    const searchableText =
      `${product.name} ${product.brand} ${product.description}`.toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);

    return matchesCategory && matchesSearch;
  });

  renderProducts();
}

function renderProducts() {
  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your filters yet.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = filteredProducts
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      const selectedClass = isSelected ? "selected" : "";
      const selectedState = isSelected ? "true" : "false";
      const buttonLabel = isSelected ? "Unselect product" : "Select product";

      return `
        <article
          class="product-card ${selectedClass}"
          data-product-id="${product.id}"
          role="button"
          tabindex="0"
          aria-pressed="${selectedState}"
          aria-label="${buttonLabel}: ${escapeHtml(product.name)}"
        >
          <img src="${product.image}" alt="${escapeHtml(product.name)}" />
          <div class="product-info">
            <h3>${escapeHtml(product.name)}</h3>
            <p class="product-brand">${escapeHtml(product.brand)}</p>
            <p class="product-category">${escapeHtml(product.category)}</p>

            <button class="description-btn" type="button" data-description-toggle>
              Show description
            </button>
            <p class="product-description" hidden>
              ${escapeHtml(product.description)}
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}

/* ---------- Selected products UI ---------- */
function renderSelectedProducts() {
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.has(product.id),
  );

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selected-message">
        No products selected yet. Click a product card to add it.
      </p>
    `;
    clearSelectedBtn.disabled = true;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-item">
        <span>${escapeHtml(product.brand)} - ${escapeHtml(product.name)}</span>
        <button
          type="button"
          class="remove-selected-btn"
          data-remove-id="${product.id}"
          aria-label="Remove ${escapeHtml(product.name)}"
        >
          Remove
        </button>
      </div>
    `,
    )
    .join("");

  clearSelectedBtn.disabled = false;
}

function toggleProductSelection(productId) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
  } else {
    selectedProductIds.add(productId);
  }

  saveSelectedProducts();
  renderProducts();
  renderSelectedProducts();
}

/* ---------- Chat helpers ---------- */
function appendMessage(role, content, citations = []) {
  const roleClass = role === "user" ? "user-message" : "assistant-message";

  const citationsHtml =
    citations.length > 0
      ? `<div class="citation-block"><strong>Sources:</strong><ul>${citations
          .map(
            (citation) =>
              `<li><a href="${escapeHtml(citation.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                citation.title || citation.url,
              )}</a></li>`,
          )
          .join("")}</ul></div>`
      : "";

  const messageHtml = `
    <div class="message ${roleClass}">
      ${escapeHtml(content).replaceAll("\n", "<br>")}
      ${citationsHtml}
    </div>
  `;

  chatWindow.insertAdjacentHTML("beforeend", messageHtml);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function topicIsAllowed(text) {
  const lowercaseText = text.toLowerCase();
  const allowedTopics = [
    "routine",
    "skincare",
    "haircare",
    "makeup",
    "fragrance",
    "cleanser",
    "moisturizer",
    "serum",
    "sunscreen",
    "hair",
    "skin",
    "beauty",
  ];

  return allowedTopics.some((topic) => lowercaseText.includes(topic));
}

async function sendMessagesToWorker(messages, webSearchEnabled) {
  if (!WORKER_URL) {
    throw new Error(
      "Missing Worker URL. Add window.APP_CONFIG.WORKER_URL in config.js or inject it through GitHub Actions secrets.",
    );
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      webSearch: webSearchEnabled,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "The Worker returned an error.");
  }

  if (data.reply) {
    return {
      content: data.reply,
      citations: data.citations || [],
    };
  }

  if (data.choices?.[0]?.message?.content) {
    return {
      content: data.choices[0].message.content,
      citations: [],
    };
  }

  throw new Error("No valid assistant message was returned.");
}

/* ---------- Event listeners ---------- */
categoryFilter.addEventListener("change", applyFilters);
productSearch.addEventListener("input", applyFilters);

productsContainer.addEventListener("click", (event) => {
  const descriptionButton = event.target.closest("[data-description-toggle]");
  if (descriptionButton) {
    event.stopPropagation();
    const card = descriptionButton.closest(".product-card");
    const description = card.querySelector(".product-description");

    if (description.hasAttribute("hidden")) {
      description.removeAttribute("hidden");
      descriptionButton.textContent = "Hide description";
    } else {
      description.setAttribute("hidden", "");
      descriptionButton.textContent = "Show description";
    }
    return;
  }

  const productCard = event.target.closest(".product-card");
  if (!productCard) return;

  const productId = Number(productCard.dataset.productId);
  toggleProductSelection(productId);
});

productsContainer.addEventListener("keydown", (event) => {
  const card = event.target.closest(".product-card");
  if (!card) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const productId = Number(card.dataset.productId);
    toggleProductSelection(productId);
  }
});

selectedProductsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-id]");
  if (!removeButton) return;

  const productId = Number(removeButton.dataset.removeId);
  selectedProductIds.delete(productId);
  saveSelectedProducts();
  renderProducts();
  renderSelectedProducts();
});

clearSelectedBtn.addEventListener("click", () => {
  selectedProductIds.clear();
  saveSelectedProducts();
  renderProducts();
  renderSelectedProducts();
});

generateRoutineBtn.addEventListener("click", async () => {
  try {
    const selectedProducts = allProducts.filter((product) =>
      selectedProductIds.has(product.id),
    );

    if (selectedProducts.length === 0) {
      appendMessage(
        "assistant",
        "Please select at least one product before generating your routine.",
      );
      return;
    }

    const selectedPayload = selectedProducts.map((product) => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    }));

    conversationHistory = [
      {
        role: "system",
        content:
          "You are a helpful L'Oreal beauty advisor. Only answer routine-related questions or topics about skincare, haircare, makeup, fragrance, and beauty. If asked unrelated questions, politely redirect to those topics.",
      },
      {
        role: "user",
        content: `Build a personalized routine using ONLY these selected products: ${JSON.stringify(
          selectedPayload,
          null,
          2,
        )}. Explain when to use each item and suggest order (morning/evening if relevant).`,
      },
    ];

    appendMessage("assistant", "Creating your personalized routine now...");

    const result = await sendMessagesToWorker(
      conversationHistory,
      webSearchToggle.checked,
    );

    appendMessage("assistant", result.content, result.citations);
    conversationHistory.push({ role: "assistant", content: result.content });
    routineGenerated = true;
  } catch (error) {
    console.error(error);
    appendMessage(
      "assistant",
      `I could not generate a routine right now. ${error.message}`,
    );
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  if (!routineGenerated) {
    appendMessage(
      "assistant",
      "Generate a routine first, then ask follow-up questions so I can guide you better.",
    );
    userInput.value = "";
    return;
  }

  if (!topicIsAllowed(message)) {
    appendMessage(
      "assistant",
      "Please keep follow-up questions focused on your routine, skincare, haircare, makeup, fragrance, or beauty topics.",
    );
    userInput.value = "";
    return;
  }

  try {
    appendMessage("user", message);
    conversationHistory.push({ role: "user", content: message });

    const result = await sendMessagesToWorker(
      conversationHistory,
      webSearchToggle.checked,
    );

    appendMessage("assistant", result.content, result.citations);
    conversationHistory.push({ role: "assistant", content: result.content });
  } catch (error) {
    console.error(error);
    appendMessage("assistant", `I could not reply right now. ${error.message}`);
  }

  userInput.value = "";
});

rtlToggle.addEventListener("change", () => {
  const enableRtl = rtlToggle.checked;
  document.documentElement.setAttribute("dir", enableRtl ? "rtl" : "ltr");
  saveDirectionPreference(enableRtl);
});

/* ---------- App bootstrap ---------- */
async function init() {
  try {
    loadDirectionPreference();
    loadSelectedProducts();
    allProducts = await loadProducts();
    filteredProducts = [...allProducts];

    renderProducts();
    renderSelectedProducts();
  } catch (error) {
    console.error(error);
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Could not load products. Please refresh and try again.
      </div>
    `;
  }
}

init();
