document.addEventListener("DOMContentLoaded", () => {
  // ===== Loader Overlay =====
  const loader = document.getElementById("loader-overlay");
  const productsSection = document.getElementById("products-section");
  const brands = document.querySelectorAll(".brand");

  let brandSections = [];

  // Fetch products.json and render sections
  fetch("products.json")
    .then(res => res.json())
    .then(data => {
      renderProducts(data.brands || []);
      brandSections = document.querySelectorAll(".brand-products");
      wireUpInteractions();

      // Restore last opened brand & category from localStorage
      const lastBrand = localStorage.getItem("activeBrand");
      const lastCategory = localStorage.getItem("activeCategory");

      if (lastBrand) {
        const brandEl = Array.from(brands).find(b => b.dataset.brand === lastBrand);
        if (brandEl) brandEl.click();

        if (lastCategory) {
          const categoryEl = document.querySelector(
            `.brand-products[data-brand="${lastBrand}"] .category-list li[data-category="${lastCategory}"]`
          );
          if (categoryEl) categoryEl.click();
        }
      } else if (brands.length > 0) {
        brands[0].click();
      }
    })
    .catch(err => {
      console.error("Failed to load products.json", err);
      productsSection.innerHTML =
        '<p class="error">⚠️ فشل تحميل المنتجات. حاول مرة أخرى لاحقًا.</p>';
    })
    .finally(() => {
      loader.classList.add("hidden");
    });

  function renderProducts(brandsData) {
    productsSection.innerHTML = "";

    brandsData.forEach(brand => {
      const brandHasActive = (brand.categories || []).some(cat =>
        (cat.products || []).some(p => p.active === true)
      );
      if (!brandHasActive) return;

      const brandEl = document.createElement("div");
      brandEl.className = "brand-products";
      brandEl.setAttribute("data-brand", brand.id);

      const desc = document.createElement("p");
desc.className = "brand-description";
desc.innerHTML = brand.description || "";
brandEl.appendChild(desc);


      const ul = document.createElement("ul");
      ul.className = "category-list";
      ul.style.display = "none";

      (brand.categories || []).forEach(cat => {
        const activeProducts = (cat.products || []).filter(p => p.active === true);
        if (activeProducts.length === 0) return;

        const li = document.createElement("li");
        li.setAttribute("data-category", cat.id);
        li.textContent = cat.name;
        ul.appendChild(li);
      });

      if (!ul.querySelector("li")) return;
      brandEl.appendChild(ul);

      (brand.categories || []).forEach(cat => {
        const activeProducts = (cat.products || []).filter(p => p.active === true);
        if (activeProducts.length === 0) return;

        const grid = document.createElement("div");
        grid.className = "products-grid hidden";
        grid.setAttribute("data-category", cat.id);

        activeProducts.forEach(prod => {
          const card = document.createElement("div");
          card.className = "product-card";

          const img = document.createElement("img");

          // If image path already contains /static/, use it as-is
          if (prod.image.startsWith("/static/") || prod.image.startsWith("http")) {
            img.src = prod.image;
          } else {
            // Otherwise, prepend /static/ folder path
            img.src = `/static/${prod.image}`;
          }

          img.alt = prod.title || "";
          img.onerror = function () {
            this.onerror = null;
            this.src = "/static/logos/HASAWI.webp";
          };
          card.appendChild(img);

          const h3 = document.createElement("h3");
          h3.textContent = prod.title || "";
          card.appendChild(h3);

          if (prod.description) {
            const p = document.createElement("p");
            p.textContent = prod.description;
            card.appendChild(p);
          }

          grid.appendChild(card);
        });

        brandEl.appendChild(grid);
      });

      productsSection.appendChild(brandEl);
    });
  }

  function wireUpInteractions() {
    // Handle brand clicks
    brands.forEach(brand => {
      brand.addEventListener("click", () => {
        brands.forEach(b => b.classList.remove("active"));
        brand.classList.add("active");

        // Save last active brand
        localStorage.setItem("activeBrand", brand.dataset.brand);

        brandSections.forEach(section => {
          section.classList.remove("active");
          const categories = section.querySelector(".category-list");
          if (categories) {
            categories.style.display = "none";
            categories.querySelectorAll("li").forEach(li => li.classList.remove("active"));
          }
          section.querySelectorAll(".product-card").forEach(p => {
            p.classList.remove("show");
            p.style.animation = "none";
          });
        });

        const selectedBrand = brand.dataset.brand;
        const activeSection = document.querySelector(`.brand-products[data-brand="${selectedBrand}"]`);
        if (activeSection) {
          activeSection.classList.add("active");
          const categories = activeSection.querySelector(".category-list");
          if (categories) categories.style.display = "flex";

          const firstCategory = categories?.querySelector("li");
          if (firstCategory) firstCategory.click();
        }
      });
    });

    // Handle category clicks with cascading animation
    document.querySelectorAll(".brand-products").forEach(section => {
      const categories = section.querySelectorAll(".category-list li");
      const productsGrids = section.querySelectorAll(".products-grid");

      categories.forEach(cat => {
        cat.addEventListener("click", () => {
          categories.forEach(c => c.classList.remove("active"));
          cat.classList.add("active");

          // Save last active category
          localStorage.setItem("activeCategory", cat.dataset.category);

          const selectedCategory = cat.dataset.category;

          productsGrids.forEach(grid => {
            const products = grid.querySelectorAll(".product-card");

            if (grid.dataset.category === selectedCategory) {
              // Hide other grids
              productsGrids.forEach(g => {
                if (g !== grid) {
                  g.querySelectorAll(".product-card").forEach(p => {
                    p.classList.remove("show");
                    p.style.animation = "none";
                  });
                  g.classList.add("hidden");
                }
              });

              grid.classList.remove("hidden");

              products.forEach((p, index) => {
                p.classList.remove("show");
                p.style.animation = "none";
                setTimeout(() => {
                  p.classList.add("show");
                  p.style.animation = "slideInLeft 0.6s ease forwards";
                }, index * 150);
              });
            } else {
              products.forEach(p => {
                p.classList.remove("show");
                p.style.animation = "none";
              });
            }
          });
        });
      });
    });
  }
});

