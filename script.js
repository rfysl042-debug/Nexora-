const products = [
  { id: "pubg", name: "شدات PUBG Mobile", category: "games", categoryLabel: "ألعاب", emoji: "🎯", description: "اشحن شدات PUBG لحسابك باستخدام Player ID.", accountLabel: "Player ID", placeholder: "أدخل Player ID", bundles: [{ label: "60 شدة", price: 4.99 }, { label: "325 شدة", price: 19.99 }, { label: "660 شدة", price: 37.99 }] },
  { id: "freefire", name: "جواهر Free Fire", category: "games", categoryLabel: "ألعاب", emoji: "💎", description: "اختر باقة الجواهر وأدخل معرّف اللاعب.", accountLabel: "معرّف اللاعب", placeholder: "أدخل معرّف اللاعب", bundles: [{ label: "100 جوهرة", price: 4.99 }, { label: "310 جواهر", price: 13.99 }, { label: "520 جوهرة", price: 21.99 }] },
  { id: "roblox", name: "Roblox Gift Card", category: "games", categoryLabel: "ألعاب", emoji: "🧱", description: "بطاقة رقمية لإضافة رصيد إلى Roblox.", accountLabel: "اسم المستخدم", placeholder: "اسم Roblox (اختياري)", bundles: [{ label: "400 Robux", price: 19.99 }, { label: "800 Robux", price: 37.99 }, { label: "1700 Robux", price: 74.99 }] },
  { id: "tiktok", name: "عملات TikTok", category: "social", categoryLabel: "تواصل اجتماعي", emoji: "🎵", description: "باقات عملات TikTok لحسابك.", accountLabel: "اسم المستخدم", placeholder: "أدخل اسم المستخدم", bundles: [{ label: "70 عملة", price: 4.99 }, { label: "350 عملة", price: 22.99 }, { label: "700 عملة", price: 44.99 }] },
  { id: "instagram", name: "باقة Instagram", category: "social", categoryLabel: "تواصل اجتماعي", emoji: "📸", description: "خدمات وباقات ترويج للحساب — حسب توفر الخدمة.", accountLabel: "رابط الحساب", placeholder: "أدخل رابط الحساب", bundles: [{ label: "باقة أساسية", price: 9.99 }, { label: "باقة متوسطة", price: 24.99 }, { label: "باقة مميزة", price: 49.99 }] },
  { id: "pubguc", name: "بطاقة Google Play", category: "balance", categoryLabel: "بطاقات وأرصدة", emoji: "▶️", description: "رصيد رقمي لمتجر Google Play. تحقق من المنطقة.", accountLabel: "البريد الإلكتروني (اختياري)", placeholder: "لإرسال تفاصيل الطلب", bundles: [{ label: "رصيد 10 ر.س", price: 10 }, { label: "رصيد 25 ر.س", price: 25 }, { label: "رصيد 50 ر.س", price: 50 }] },
  { id: "apple", name: "بطاقة App Store", category: "balance", categoryLabel: "بطاقات وأرصدة", emoji: "🍎", description: "بطاقة رصيد رقمية لمتجر Apple. تحقق من المنطقة.", accountLabel: "البريد الإلكتروني (اختياري)", placeholder: "لإرسال تفاصيل الطلب", bundles: [{ label: "رصيد 10 ر.س", price: 10 }, { label: "رصيد 25 ر.س", price: 25 }, { label: "رصيد 50 ر.س", price: 50 }] },
  { id: "mobile", name: "رصيد جوال", category: "balance", categoryLabel: "بطاقات وأرصدة", emoji: "📶", description: "اختر مبلغ الرصيد وأدخل رقم الجوال المراد شحنه.", accountLabel: "رقم الجوال", placeholder: "05xxxxxxxx", bundles: [{ label: "شحن 10 ر.س", price: 10 }, { label: "شحن 20 ر.س", price: 20 }, { label: "شحن 50 ر.س", price: 50 }] },
  { id: "discord", name: "اشتراك Discord Nitro", category: "social", categoryLabel: "تواصل اجتماعي", emoji: "🎧", description: "اختر مدة الاشتراك وأدخل اسم المستخدم للتواصل.", accountLabel: "اسم المستخدم", placeholder: "أدخل اسم المستخدم", bundles: [{ label: "شهر واحد", price: 39.99 }, { label: "3 أشهر", price: 109.99 }, { label: "سنة", price: 399.99 }] }
];

const grid = document.querySelector("#productGrid");
const cartPanel = document.querySelector("#cartPanel");
const cartOverlay = document.querySelector("#cartOverlay");
const cartItemsElement = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const totalElement = document.querySelector("#total");
const searchInput = document.querySelector("#searchInput");
const emptyState = document.querySelector("#emptyState");
const toast = document.querySelector("#toast");
let selectedCategory = "all";
let cart = loadCart();
let toastTimer;

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("nexora-cart") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function formatPrice(price) {
  return `${Number(price).toFixed(2)} ر.س`;
}

function renderProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase("ar");
  const visible = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesQuery = `${product.name} ${product.description} ${product.categoryLabel}`.toLocaleLowerCase("ar").includes(query);
    return matchesCategory && matchesQuery;
  });

  grid.innerHTML = visible.map((product) => `
    <article class="product-card" data-product="${product.id}">
      <div class="product-cover ${product.category === "social" ? "social-cover" : product.category === "balance" ? "balance-cover" : ""}">
        <span class="product-emoji" aria-hidden="true">${product.emoji}</span>
        <span class="product-badge">${product.categoryLabel}</span>
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-fields">
          <select class="bundle-select" aria-label="اختر الباقة لـ ${product.name}">
            ${product.bundles.map((bundle, index) => `<option value="${index}">${bundle.label} — ${formatPrice(bundle.price)}</option>`).join("")}
          </select>
          <input class="account-input" type="text" maxlength="100" placeholder="${product.placeholder}" aria-label="${product.accountLabel}" />
        </div>
        <div class="product-buy"><strong class="price">${formatPrice(product.bundles[0].price)}</strong><button class="add-button" type="button" data-add="${product.id}">أضف للسلة +</button></div>
      </div>
    </article>
  `).join("");
  emptyState.hidden = visible.length > 0;
}

function saveCart() {
  localStorage.setItem("nexora-cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartCount.textContent = count;
  totalElement.textContent = formatPrice(total);

  if (!cart.length) {
    cartItemsElement.innerHTML = '<p class="empty-cart">سلتك فارغة حاليًا. تصفح المنتجات وأضف ما يناسبك.</p>';
    return;
  }

  cartItemsElement.innerHTML = cart.map((item, index) => `
    <article class="cart-item">
      <div><h4>${escapeHtml(item.name)} — ${escapeHtml(item.bundle)}</h4><p>بيانات الحساب: ${escapeHtml(item.account || "لم تُدخل")}</p><p>الكمية: ${item.quantity}</p></div>
      <div><strong>${formatPrice(item.price * item.quantity)}</strong><br /><button class="remove-item" type="button" data-remove="${index}">إزالة</button></div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function openCart() {
  cartPanel.classList.add("open");
  cartOverlay.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
}

function closeCart() {
  cartPanel.classList.remove("open");
  cartOverlay.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

document.querySelector(".category-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = button.dataset.category;
  document.querySelectorAll(".category-card").forEach((item) => item.classList.toggle("active", item === button));
  document.querySelector("#filterLabel").textContent = button.querySelector("strong")?.textContent || "كل المنتجات";
  renderProducts();
  document.querySelector("#products").scrollIntoView({ behavior: "smooth", block: "start" });
});

searchInput.addEventListener("input", renderProducts);
grid.addEventListener("change", (event) => {
  if (!event.target.matches(".bundle-select")) return;
  const card = event.target.closest(".product-card");
  const product = products.find((item) => item.id === card.dataset.product);
  const bundle = product.bundles[Number(event.target.value)];
  card.querySelector(".price").textContent = formatPrice(bundle.price);
});

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const card = button.closest(".product-card");
  const product = products.find((item) => item.id === button.dataset.add);
  const bundle = product.bundles[Number(card.querySelector(".bundle-select").value)];
  const account = card.querySelector(".account-input").value.trim();
  const required = !product.placeholder.includes("اختياري");
  if (required && !account) {
    card.querySelector(".account-input").focus();
    showToast(`أدخل ${product.accountLabel} أولًا`);
    return;
  }
  const existing = cart.find((item) => item.id === product.id && item.bundle === bundle.label && item.account === account);
  if (existing) existing.quantity += 1;
  else cart.push({ id: product.id, name: product.name, bundle: bundle.label, price: bundle.price, account, quantity: 1 });
  saveCart();
  showToast("تمت إضافة المنتج إلى سلة الشراء");
});

cartItemsElement.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  cart.splice(Number(button.dataset.remove), 1);
  saveCart();
});

document.querySelector("#cartToggle").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeCart(); });

document.querySelector("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!cart.length) {
    showToast("أضف منتجًا إلى السلة قبل إرسال الطلب");
    return;
  }
  const formData = new FormData(event.currentTarget);
  const phone = String(formData.get("phone") || "").trim();
  if (phone.length < 8) {
    event.currentTarget.elements.phone.focus();
    showToast("يرجى إدخال رقم تواصل صحيح");
    return;
  }
  const orderLines = cart.map((item) => `• ${item.name} — ${item.bundle} | الحساب: ${item.account || "غير محدد"} | الكمية: ${item.quantity}`).join("\n");
  const message = `طلب Nexora تجريبي\nرقم التواصل: ${phone}\n\n${orderLines}\n\nالإجمالي: ${formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}\nملاحظات: ${String(formData.get("notes") || "لا يوجد").trim() || "لا يوجد"}`;
  window.alert(`تم تجهيز تفاصيل طلبك (عرض تجريبي):\n\n${message}\n\nلم يتم تحصيل أي مبلغ. اربط الموقع بخدمة دفع ومعالجة طلبات قبل استقبال طلبات حقيقية.`);
  cart = [];
  saveCart();
  event.currentTarget.reset();
  closeCart();
});

document.querySelector("#year").textContent = new Date().getFullYear();
renderProducts();
renderCart();
