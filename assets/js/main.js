(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.from((scope || document).querySelectorAll(selector));
  }

  function parseNumber(value) {
    if (typeof value !== "string") {
      return Number(value) || 0;
    }

    let normalized = value.trim().replace(/\s/g, "");
    const hasComma = normalized.includes(",");
    const hasDot = normalized.includes(".");

    if (hasComma && hasDot) {
      const commaIndex = normalized.lastIndexOf(",");
      const dotIndex = normalized.lastIndexOf(".");
      normalized = commaIndex > dotIndex
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
    } else if (hasComma) {
      normalized = normalized.replace(",", ".");
    } else if ((normalized.match(/\./g) || []).length > 1) {
      normalized = normalized.replace(/\./g, "");
    }

    return Number(normalized);
  }

  function setFieldError(field, message) {
    if (!field) return;
    const describedBy = field.getAttribute("aria-describedby");
    const errorNode = describedBy ? document.getElementById(describedBy) : null;
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (errorNode) {
      errorNode.textContent = message || "";
    }
  }

  function getRequiredNumber(field, label, options) {
    const settings = Object.assign({ min: 0, max: Infinity, allowZero: true }, options || {});
    const value = parseNumber(field.value);

    if (field.value.trim() === "" || Number.isNaN(value)) {
      setFieldError(field, `${label} må fylles ut med et tall.`);
      return null;
    }

    if ((!settings.allowZero && value <= 0) || (settings.allowZero && value < settings.min) || value < settings.min) {
      setFieldError(field, `${label} må være ${settings.allowZero ? "minst" : "større enn"} ${settings.min}.`);
      return null;
    }

    if (value > settings.max) {
      setFieldError(field, `${label} er uvanlig høyt. Sjekk tallet.`);
      return null;
    }

    setFieldError(field, "");
    return value;
  }

  async function copyText(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      let ok = false;
      try {
        ok = typeof document.execCommand === "function" && document.execCommand("copy");
      } catch (fallbackError) {
        ok = false;
      } finally {
        temp.remove();
      }
      return ok;
    }
  }

  function initNavigation() {
    const toggle = qs("[data-nav-toggle]");
    const nav = qs("[data-site-nav]");

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });

      nav.addEventListener("click", (event) => {
        if (event.target.closest("a") && nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    const current = window.location.pathname.split("/").pop() || "index.html";
    qsa(".site-nav a").forEach((link) => {
      const href = link.getAttribute("href");
      if (href === current || (current === "" && href === "index.html")) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function initSmoothScroll() {
    qsa('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") return;
        const target = qs(targetId);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion.matches ? "auto" : "smooth",
          block: "start"
        });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  function initFaq() {
    qsa(".faq details").forEach((details) => {
      const summary = qs("summary", details);
      if (!summary) return;
      summary.setAttribute("role", "button");
    });
  }

  function initCopyButtons() {
    qsa("[data-copy-text], [data-copy-target]").forEach((button) => {
      button.addEventListener("click", async () => {
        const targetSelector = button.getAttribute("data-copy-target");
        const target = targetSelector ? qs(targetSelector) : null;
        const text = button.getAttribute("data-copy-text") || (target ? target.innerText : "");
        const original = button.textContent;
        const ok = await copyText(text.trim());
        button.textContent = ok ? "Kopiert" : "Kunne ikke kopiere";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1800);
      });
    });
  }

  function initResetConsentLinks() {
    qsa("[data-open-cookie-settings]").forEach((button) => {
      button.addEventListener("click", () => {
        if (typeof window.openCookieSettings === "function") {
          window.openCookieSettings();
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initSmoothScroll();
    initFaq();
    initCopyButtons();
    initResetConsentLinks();
  });

  window.Hverdagsokonomi = {
    copyText,
    getRequiredNumber,
    parseNumber,
    qsa,
    qs,
    setFieldError
  };
})();
