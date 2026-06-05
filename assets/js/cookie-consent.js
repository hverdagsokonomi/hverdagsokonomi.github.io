(function () {
  const storageKey = "hverdagsokonomi_cookie_consent";
  const defaultConsent = {
    necessary: true,
    analytics: false,
    ads: false,
    savedAt: null
  };

  function readConsent() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved ? Object.assign({}, defaultConsent, JSON.parse(saved)) : null;
    } catch (error) {
      return null;
    }
  }

  function saveConsent(consent) {
    const payload = Object.assign({}, defaultConsent, consent, {
      necessary: true,
      savedAt: new Date().toISOString()
    });
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("hverdagsokonomi:consent", { detail: payload }));
    return payload;
  }

  function deleteConsent() {
    window.localStorage.removeItem(storageKey);
    showBanner();
  }

  function buildMarkup() {
    if (document.getElementById("cookie-banner")) return;

    const banner = document.createElement("section");
    banner.id = "cookie-banner";
    banner.className = "cookie-banner";
    banner.setAttribute("aria-label", "Cookie-samtykke");
    banner.innerHTML = `
      <h2>Informasjonskapsler</h2>
      <p>Vi bruker nødvendige lokale lagringsvalg for at siden skal fungere. Analyse og annonsering brukes bare hvis du samtykker. Kalkulatortallene dine sendes ikke til oss.</p>
      <div class="cookie-actions">
        <button class="button" type="button" data-cookie-accept>Godta alle</button>
        <button class="button" type="button" data-cookie-reject>Avvis ikke-nødvendige</button>
        <button class="secondary-button" type="button" data-cookie-customize>Tilpass</button>
      </div>
    `;

    const modal = document.createElement("div");
    modal.id = "cookie-modal";
    modal.className = "cookie-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "cookie-modal-title");
    modal.innerHTML = `
      <div class="cookie-dialog">
        <h2 id="cookie-modal-title">Tilpass cookie-valg</h2>
        <p>Du kan endre valgene når som helst. Nødvendige valg er alltid på fordi de lagrer selve samtykket.</p>
        <div class="cookie-choice">
          <div>
            <strong>Nødvendige</strong>
            <p>Nødvendig lokal lagring for samtykke og grunnleggende funksjon.</p>
          </div>
          <label><input type="checkbox" checked disabled> Alltid på</label>
        </div>
        <div class="cookie-choice">
          <div>
            <strong>Analyse</strong>
            <p>Plassholder for anonym statistikk. Ingen analyseverktøy er aktivert nå.</p>
          </div>
          <label><input type="checkbox" data-cookie-analytics> Tillat</label>
        </div>
        <div class="cookie-choice">
          <div>
            <strong>Annonsering</strong>
            <p>Plassholder for annonseteknologi, for eksempel AdSense etter gyldig samtykke.</p>
          </div>
          <label><input type="checkbox" data-cookie-ads> Tillat</label>
        </div>
        <div class="cookie-actions">
          <button class="button" type="button" data-cookie-save>Lagre valg</button>
          <button class="button" type="button" data-cookie-modal-reject>Avvis ikke-nødvendige</button>
          <button class="secondary-button" type="button" data-cookie-close>Lukk</button>
          <button class="secondary-button" type="button" data-cookie-delete>Slett lagret samtykke</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    document.body.appendChild(modal);
  }

  function banner() {
    return document.getElementById("cookie-banner");
  }

  function modal() {
    return document.getElementById("cookie-modal");
  }

  function showBanner() {
    const node = banner();
    if (node) node.classList.add("is-visible");
  }

  function hideBanner() {
    const node = banner();
    if (node) node.classList.remove("is-visible");
  }

  function openSettings() {
    const saved = readConsent();
    const dialog = modal();
    if (!dialog) return;

    const analytics = dialog.querySelector("[data-cookie-analytics]");
    const ads = dialog.querySelector("[data-cookie-ads]");
    analytics.checked = saved ? Boolean(saved.analytics) : false;
    ads.checked = saved ? Boolean(saved.ads) : false;
    dialog.classList.add("is-visible");
    const firstButton = dialog.querySelector("button");
    if (firstButton) firstButton.focus();
  }

  function closeSettings() {
    const dialog = modal();
    if (dialog) dialog.classList.remove("is-visible");
  }

  function applyConsent(consent) {
    saveConsent(consent);
    hideBanner();
    closeSettings();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.matches("[data-cookie-accept]")) {
        applyConsent({ analytics: true, ads: true });
      }

      if (target.matches("[data-cookie-reject], [data-cookie-modal-reject]")) {
        applyConsent({ analytics: false, ads: false });
      }

      if (target.matches("[data-cookie-customize]")) {
        openSettings();
      }

      if (target.matches("[data-cookie-save]")) {
        const dialog = modal();
        applyConsent({
          analytics: Boolean(dialog.querySelector("[data-cookie-analytics]").checked),
          ads: Boolean(dialog.querySelector("[data-cookie-ads]").checked)
        });
      }

      if (target.matches("[data-cookie-close]")) {
        closeSettings();
      }

      if (target.matches("[data-cookie-delete]")) {
        deleteConsent();
        closeSettings();
      }

      if (target.id === "cookie-modal") {
        closeSettings();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildMarkup();
    bindEvents();
    if (!readConsent()) {
      showBanner();
    }
  });

  window.openCookieSettings = openSettings;
  window.deleteCookieConsent = deleteConsent;
  window.getCookieConsent = readConsent;
})();
