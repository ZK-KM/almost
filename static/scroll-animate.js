// ===== Full Script.js =====
document.addEventListener("DOMContentLoaded", () => {
  // ===== Loader Overlay =====
  const loader = document.getElementById("loader-overlay");
  window.addEventListener("load", () => {
    loader.classList.add("hidden");
  });

  // ===== Animate .child-view & .service-box letters =====
  const views = document.querySelectorAll(".child-view, .service-box");
  views.forEach(view => {
    const textElements = view.querySelectorAll("h3, p");
    textElements.forEach(el => {
      const words = el.textContent.split(" ");
      el.textContent = "";
      words.forEach(word => {
        const span = document.createElement("span");
        span.textContent = word + " ";
        span.classList.add("letter");
        el.appendChild(span);
      });
    });
  });

  // ===== Intersection Observer for fade/slide in =====
  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.2 };
  const fadeElements = document.querySelectorAll(".child-box, .location-box, .contact-box, .service-box");
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-up-show", "slide-in-show");
      }
    });
  }, observerOptions);
  fadeElements.forEach(el => fadeObserver.observe(el));

  // ===== Animate letters when in viewport =====
  const letters = document.querySelectorAll(".child-view .letter , .service-box .letter");
  const letterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        letters.forEach((letter, idx) => {
          setTimeout(() => letter.classList.add("show"), idx * 50);
        });
        letterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  views.forEach(view => letterObserver.observe(view));

  // ===== Animate service boxes separately =====
  const serviceBoxes = document.querySelectorAll(".service-box");
  const serviceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  }, { threshold: 0.3 });
  serviceBoxes.forEach(box => serviceObserver.observe(box));

  // ===== ===== PRODUCTS RENDERING ===== =====
  const productsSection = document.getElementById("products-section");

  // Paste your JSON here or fetch it from a JSON file
  const products = {
    "brands": [
      // ... your JSON from the question ...
    ]
  };

  products.brands.forEach(brand => {
    brand.categories.forEach(category => {
      // Wrapper for this brand/category
      const wrapper = document.createElement("div");
      wrapper.classList.add("brand-products");
      wrapper.dataset.brand = brand.id;

      // Category Title
      const title = document.createElement("h3");
      title.classList.add("category-title");
      title.textContent = category.name;
      wrapper.appendChild(title);

      // Products Grid
      const grid = document.createElement("div");
      grid.classList.add("products-grid");

      category.products.forEach((product, index) => {
        const card = document.createElement("div");
        card.classList.add("product-card");
        card.style.setProperty("--delay", `${index * 50}ms`);

        const img = document.createElement("img");
        img.src = product.image;
        img.alt = product.title;

        const name = document.createElement("h3");
        name.textContent = product.title;

        const desc = document.createElement("p");
        desc.textContent = product.description;

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(desc);
        grid.appendChild(card);
      });

      wrapper.appendChild(grid);
      productsSection.appendChild(wrapper);
    });
  });

  // ===== Brand click toggle =====
  document.querySelectorAll(".brand").forEach(brandEl => {
    brandEl.addEventListener("click", () => {
      const brandId = brandEl.dataset.brand;

      // Show only this brand's products
      document.querySelectorAll(".brand-products").forEach(bp => {
        bp.classList.toggle("active", bp.dataset.brand === brandId);
      });

      // Highlight active brand
      document.querySelectorAll(".brand").forEach(b => b.classList.remove("active"));
      brandEl.classList.add("active");
    });
  });

  // ===== Optional: Show first brand by default =====
  const firstBrand = document.querySelector(".brand");
  if (firstBrand) firstBrand.click();

// ===== CONTACT BOX CLICKABLE =====
const contactBoxes = document.querySelectorAll(".contact-box");
contactBoxes.forEach(box => {
  box.addEventListener("click", () => {
    const icon = box.querySelector("i");
    const text = box.querySelector(".contact-text").textContent.trim();

    if (icon.classList.contains("bx-phone")) {
      // Phone: initiate call
      window.location.href = `tel:${text.replace(/\s+/g,'')}`;
    } else if (icon.classList.contains("bxl-telegram")) {
      window.open(`https://t.me/${text}`, "_blank");
    } else if (icon.classList.contains("bxl-instagram")) {
      window.open(`https://instagram.com/${text}`, "_blank");
    } else if (icon.classList.contains("bxl-facebook")) {
      // Open the specific Facebook link
      window.open("https://www.facebook.com/share/1KjgpqcPxR/?mibextid=wwXIfr", "_blank");
    }
  });
});
  });

