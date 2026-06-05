(function () {
  const nokFormatter = new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0
  });

  const numberFormatter = new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: 1
  });

  const helpers = window.Hverdagsokonomi || {};

  function formatNok(value) {
    return nokFormatter.format(Math.round(value || 0));
  }

  function formatPercent(value) {
    return `${numberFormatter.format(value || 0)} %`;
  }

  function field(form, name) {
    return form.querySelector(`[name="${name}"]`);
  }

  function readNumber(form, name, label, options) {
    const input = field(form, name);
    return helpers.getRequiredNumber(input, label, options);
  }

  function resultBox(form) {
    return form.querySelector("[data-result]");
  }

  function setResult(form, html, state) {
    const box = resultBox(form);
    if (!box) return;
    box.classList.remove("is-success", "is-warning", "is-error");
    if (state) box.classList.add(`is-${state}`);
    box.innerHTML = html;
    box.setAttribute("tabindex", "-1");
    box.focus({ preventScroll: true });
  }

  function clearFieldErrors(form) {
    Array.from(form.querySelectorAll("input, select")).forEach((input) => {
      if (helpers.setFieldError) helpers.setFieldError(input, "");
    });
  }

  function clearResult(form) {
    const box = resultBox(form);
    if (!box) return;
    box.classList.remove("is-success", "is-warning", "is-error");
    box.innerHTML = "<p>Fyll ut feltene og trykk beregn for å se resultatet.</p>";
  }

  function valuesValid(values) {
    return values.every((value) => value !== null && !Number.isNaN(value));
  }

  function resultList(items) {
    return `<ul class="result-list">${items.map((item) => `<li><span>${item.label}</span><strong>${item.value}</strong></li>`).join("")}</ul>`;
  }

  function bindForm(id, calculate) {
    const form = document.getElementById(id);
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      calculate(form);
    });

    const reset = form.querySelector("[data-reset]");
    if (reset) {
      reset.addEventListener("click", () => {
        form.reset();
        clearFieldErrors(form);
        clearResult(form);
        if (id === "subscription-form") resetSubscriptionRows(form);
      });
    }

    const copy = form.querySelector("[data-copy-result]");
    if (copy) {
      copy.addEventListener("click", async () => {
        const box = resultBox(form);
        const text = box ? box.innerText.trim() : "";
        const original = copy.textContent;
        const ok = helpers.copyText ? await helpers.copyText(text) : false;
        copy.textContent = ok ? "Kopiert" : "Kunne ikke kopiere";
        window.setTimeout(() => {
          copy.textContent = original;
        }, 1800);
      });
    }
  }

  function calculateBudget(form) {
    const income = readNumber(form, "income", "Nettoinntekt", { min: 0, allowZero: false });
    const costs = [
      ["housing", "Boligkostnader"],
      ["food", "Mat og dagligvarer"],
      ["transport", "Transport"],
      ["insurance", "Forsikringer"],
      ["electricity", "Strøm"],
      ["phone", "Telefon og internett"],
      ["subscriptions", "Abonnementer"],
      ["loans", "Lån og kreditt"],
      ["saving", "Sparing"],
      ["other", "Annet"]
    ].map(([name, label]) => readNumber(form, name, label, { min: 0 }));

    if (!valuesValid([income].concat(costs))) return;

    const totalCosts = costs.reduce((sum, value) => sum + value, 0);
    const saving = readNumber(form, "saving", "Sparing", { min: 0 });
    const disposable = income - totalCosts;
    const savingsRate = income > 0 ? (saving / income) * 100 : 0;
    let assessment = "Balansert";
    let state = "success";

    if (disposable < 0) {
      assessment = "Stramt budsjett";
      state = "warning";
    } else if (disposable > income * 0.15 && savingsRate >= 10) {
      assessment = "God buffer";
    }

    setResult(form, `
      ${resultList([
        { label: "Totale utgifter", value: formatNok(totalCosts) },
        { label: "Disponibelt beløp", value: formatNok(disposable) },
        { label: "Sparingsgrad", value: formatPercent(savingsRate) },
        { label: "Enkel vurdering", value: assessment }
      ])}
      <p class="formula">Disponibelt beløp = inntekt minus utgifter. Sparingsgrad = sparing delt på inntekt.</p>
    `, state);
  }

  function calculateBuffer(form) {
    const fixed = readNumber(form, "fixed", "Månedlige faste utgifter", { min: 0, allowZero: false });
    const months = readNumber(form, "months", "Antall måneder", { min: 1, max: 36, allowZero: false });
    const existing = readNumber(form, "existing", "Eksisterende buffer", { min: 0 });
    if (!valuesValid([fixed, months, existing])) return;

    const recommended = fixed * months;
    const gap = recommended - existing;
    const surplus = gap < 0 ? Math.abs(gap) : 0;

    setResult(form, `
      ${resultList([
        { label: "Anbefalt buffer", value: formatNok(recommended) },
        { label: gap > 0 ? "Du mangler" : "Mangler til målet", value: gap > 0 ? formatNok(gap) : formatNok(0) },
        { label: "Eventuelt overskudd", value: formatNok(surplus) }
      ])}
      <p class="formula">Anbefalt buffer = faste utgifter ganger ønsket antall måneder.</p>
    `, gap > 0 ? "warning" : "success");
  }

  function calculateElectricity(form) {
    const kwh = readNumber(form, "kwh", "Forbruk i kWh", { min: 0 });
    const price = readNumber(form, "price", "Strømpris i øre/kWh", { min: 0 });
    const grid = readNumber(form, "grid", "Nettleie", { min: 0 });
    const fixed = readNumber(form, "fixedFee", "Fastbeløp", { min: 0 });
    if (!valuesValid([kwh, price, grid, fixed])) return;

    const monthly = kwh * price / 100 + grid + fixed;
    setResult(form, `
      ${resultList([
        { label: "Estimert månedspris", value: formatNok(monthly) },
        { label: "Estimert årspris", value: formatNok(monthly * 12) }
      ])}
      <p class="formula">Månedspris = kWh ganger strømpris delt på 100, pluss nettleie og fastbeløp.</p>
    `, "success");
  }

  function calculateInterest(form) {
    const principal = readNumber(form, "principal", "Lånebeløp", { min: 0, allowZero: false });
    const rate = readNumber(form, "rate", "Nominell rente", { min: 0, max: 100 });
    const years = readNumber(form, "years", "Nedbetalingstid", { min: 1, max: 50, allowZero: false });
    const fee = readNumber(form, "fee", "Termingebyr", { min: 0 });
    if (!valuesValid([principal, rate, years, fee])) return;

    const months = Math.round(years * 12);
    const monthlyRate = rate / 100 / 12;
    let paymentWithoutFee;

    if (monthlyRate === 0) {
      paymentWithoutFee = principal / months;
    } else {
      const factor = Math.pow(1 + monthlyRate, months);
      paymentWithoutFee = principal * monthlyRate * factor / (factor - 1);
    }

    const monthlyPayment = paymentWithoutFee + fee;
    const totalInterest = paymentWithoutFee * months - principal;
    const totalCost = monthlyPayment * months;

    setResult(form, `
      ${resultList([
        { label: "Estimert månedlig betaling", value: formatNok(monthlyPayment) },
        { label: "Total rentekostnad", value: formatNok(totalInterest) },
        { label: "Total kostnad inkl. termingebyr", value: formatNok(totalCost) }
      ])}
      <p class="formula">Annuitetsformelen brukes når renten er over 0. Ved 0 % rente deles lånebeløpet på antall måneder.</p>
    `, "success");
  }

  function subscriptionContainer(form) {
    return form.querySelector("[data-subscription-rows]");
  }

  function createSubscriptionRow(index) {
    const row = document.createElement("div");
    row.className = "subscription-row";
    row.setAttribute("data-subscription-row", "");
    row.innerHTML = `
      <div class="field">
        <label for="subscription-name-${index}">Navn på abonnement</label>
        <input id="subscription-name-${index}" name="subscriptionName" type="text" autocomplete="off">
      </div>
      <div class="field">
        <label for="subscription-price-${index}">Pris per måned</label>
        <input id="subscription-price-${index}" name="subscriptionPrice" type="number" inputmode="decimal" min="0" step="1" aria-describedby="subscription-price-error-${index}">
        <span class="field-error" id="subscription-price-error-${index}" aria-live="polite"></span>
      </div>
      <button class="secondary-button remove-row" type="button" data-remove-subscription>Fjern</button>
    `;
    return row;
  }

  function resetSubscriptionRows(form) {
    const container = subscriptionContainer(form);
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 3; i += 1) {
      container.appendChild(createSubscriptionRow(i));
    }
    updateSubscriptionButtons(form);
  }

  function updateSubscriptionButtons(form) {
    const rows = Array.from(form.querySelectorAll("[data-subscription-row]"));
    rows.forEach((row) => {
      const button = row.querySelector("[data-remove-subscription]");
      if (button) button.disabled = rows.length <= 1;
    });
    const addButton = form.querySelector("[data-add-subscription]");
    if (addButton) addButton.disabled = rows.length >= 15;
  }

  function bindSubscriptions() {
    const form = document.getElementById("subscription-form");
    if (!form) return;
    const addButton = form.querySelector("[data-add-subscription]");
    if (addButton) {
      addButton.addEventListener("click", () => {
        const rows = form.querySelectorAll("[data-subscription-row]");
        if (rows.length >= 15) return;
        subscriptionContainer(form).appendChild(createSubscriptionRow(rows.length + 1));
        updateSubscriptionButtons(form);
      });
    }

    form.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-subscription]");
      if (!button) return;
      const rows = form.querySelectorAll("[data-subscription-row]");
      if (rows.length <= 1) return;
      button.closest("[data-subscription-row]").remove();
      updateSubscriptionButtons(form);
    });

    updateSubscriptionButtons(form);
  }

  function calculateSubscriptions(form) {
    const rows = Array.from(form.querySelectorAll("[data-subscription-row]"));
    const entries = [];
    let valid = true;

    rows.forEach((row, index) => {
      const nameInput = row.querySelector('[name="subscriptionName"]');
      const priceInput = row.querySelector('[name="subscriptionPrice"]');
      const name = nameInput.value.trim() || `Abonnement ${index + 1}`;
      const hasAnyValue = nameInput.value.trim() !== "" || priceInput.value.trim() !== "";

      if (!hasAnyValue) {
        if (helpers.setFieldError) helpers.setFieldError(priceInput, "");
        return;
      }

      const price = helpers.getRequiredNumber(priceInput, "Pris per måned", { min: 0 });
      if (price === null) {
        valid = false;
        return;
      }

      entries.push({ name, price });
    });

    if (!valid) return;

    if (!entries.length) {
      setResult(form, "<p>Legg inn minst ett abonnement med pris for å se resultatet.</p>", "warning");
      return;
    }

    const monthly = entries.reduce((sum, item) => sum + item.price, 0);
    const mostExpensive = entries.reduce((highest, item) => item.price > highest.price ? item : highest, entries[0]);

    setResult(form, `
      ${resultList([
        { label: "Total månedskostnad", value: formatNok(monthly) },
        { label: "Total årskostnad", value: formatNok(monthly * 12) },
        { label: "Dyreste abonnement", value: `${mostExpensive.name} (${formatNok(mostExpensive.price)})` }
      ])}
      <p class="formula">Vurder om alle abonnementene brukes aktivt.</p>
    `, "success");
  }

  function selectValue(form, name) {
    const input = field(form, name);
    return input ? input.value : "nei";
  }

  function calculateInsuranceNeeds(form) {
    const age = readNumber(form, "age", "Alder", { min: 0, max: 120 });
    if (age === null) return;

    const relevant = new Set(["Innboforsikring"]);
    if (selectValue(form, "home") === "ja" && selectValue(form, "housingType") === "eier") relevant.add("Husforsikring");
    if (selectValue(form, "travel") === "ja") relevant.add("Reiseforsikring");
    if (selectValue(form, "car") === "ja") relevant.add("Bilforsikring");
    if (selectValue(form, "children") === "ja") relevant.add("Barneforsikring");
    if (selectValue(form, "partner") === "ja" || selectValue(form, "highDebt") === "ja" || selectValue(form, "children") === "ja") relevant.add("Livsforsikring");
    if (age >= 18) relevant.add("Uføreforsikring");
    if (selectValue(form, "pet") === "ja") relevant.add("Dyreforsikring");

    setResult(form, `
      <p><strong>Forsikringer som kan være relevante å undersøke:</strong></p>
      <ul>${Array.from(relevant).map((item) => `<li>${item}</li>`).join("")}</ul>
      <p class="formula">Dette er ikke en anbefaling, men en generell oversikt basert på svarene dine. Behov og vilkår varierer.</p>
    `, "success");
  }

  function calculateDeductible(form) {
    const damage = readNumber(form, "damage", "Skadebeløp", { min: 0 });
    const deductible = readNumber(form, "deductible", "Egenandel", { min: 0 });
    const bonusLoss = readNumber(form, "bonusLoss", "Mulig bonustap eller økt premie", { min: 0 });
    if (!valuesValid([damage, deductible, bonusLoss])) return;

    const coverage = damage - deductible;
    if (coverage <= 0) {
      setResult(form, `
        ${resultList([
          { label: "Du betaler selv", value: formatNok(Math.min(damage, deductible)) },
          { label: "Potensiell dekning", value: formatNok(0) },
          { label: "Netto mulig nytte", value: formatNok(0 - bonusLoss) }
        ])}
        <p class="formula">Skaden ser ikke ut til å overstige egenandelen. Det kan bety at forsikringen ikke dekker noe i dette forenklede eksempelet.</p>
      `, "warning");
      return;
    }

    const net = coverage - bonusLoss;
    const assessment = net > 0
      ? "Det kan være verdt å undersøke om skaden bør meldes."
      : "Bonustap eller økt premie kan gjøre nytten lav. Sjekk vilkårene før du melder skade.";

    setResult(form, `
      ${resultList([
        { label: "Du betaler selv", value: formatNok(deductible + bonusLoss) },
        { label: "Forsikringen dekker potensielt", value: formatNok(coverage) },
        { label: "Netto mulig nytte", value: formatNok(net) },
        { label: "Enkel vurdering", value: assessment }
      ])}
      <p class="formula">Dekning = skadebeløp minus egenandel. Netto mulig nytte = dekning minus mulig bonustap eller økt premie.</p>
    `, net > 0 ? "success" : "warning");
  }

  function calculateCar(form) {
    const labels = [
      ["loan", "Lån eller leasing"],
      ["fuel", "Drivstoff eller strøm"],
      ["insurance", "Forsikring"],
      ["service", "Service og vedlikehold"],
      ["toll", "Bom og parkering"],
      ["tires", "Dekk og utstyr"],
      ["depreciation", "Verdifall"],
      ["other", "Andre kostnader"]
    ];
    const values = labels.map(([name, label]) => readNumber(form, name, label, { min: 0 }));
    if (!valuesValid(values)) return;

    const monthly = values.reduce((sum, value) => sum + value, 0);
    setResult(form, `
      ${resultList([
        { label: "Total månedskostnad", value: formatNok(monthly) },
        { label: "Total årskostnad", value: formatNok(monthly * 12) },
        { label: "Kostnad per dag", value: formatNok(monthly * 12 / 365) }
      ])}
      <p class="formula">Verdifall er ofte en skjult bilkostnad fordi den først blir tydelig når bilen selges eller byttes.</p>
    `, "success");
  }

  function calculateFood(form) {
    const adults = readNumber(form, "adults", "Antall voksne", { min: 0, max: 20 });
    const children = readNumber(form, "children", "Antall barn", { min: 0, max: 20 });
    const adultCost = readNumber(form, "adultCost", "Matkostnad per voksen", { min: 0 });
    const childCost = readNumber(form, "childCost", "Matkostnad per barn", { min: 0 });
    const takeaway = readNumber(form, "takeaway", "Restaurant og takeaway", { min: 0 });
    if (!valuesValid([adults, children, adultCost, childCost, takeaway])) return;

    const monthly = adults * adultCost + children * childCost + takeaway;
    setResult(form, `
      ${resultList([
        { label: "Estimert matbudsjett per måned", value: formatNok(monthly) },
        { label: "Estimert matbudsjett per år", value: formatNok(monthly * 12) }
      ])}
      <p class="formula">Matbudsjettet beregnes fra antall personer, estimert månedskostnad og restaurant/takeaway.</p>
    `, "success");
  }

  function calculateHoliday(form) {
    const transport = readNumber(form, "transport", "Transport", { min: 0 });
    const lodging = readNumber(form, "lodging", "Overnatting", { min: 0 });
    const food = readNumber(form, "food", "Mat", { min: 0 });
    const activities = readNumber(form, "activities", "Aktiviteter", { min: 0 });
    const insurance = readNumber(form, "insurance", "Reiseforsikring eller ekstra forsikring", { min: 0 });
    const shopping = readNumber(form, "shopping", "Shopping og annet", { min: 0 });
    const people = readNumber(form, "people", "Antall personer", { min: 1, max: 50, allowZero: false });
    const months = readNumber(form, "months", "Måneder til reisen", { min: 1, max: 120, allowZero: false });
    if (!valuesValid([transport, lodging, food, activities, insurance, shopping, people, months])) return;

    const total = transport + lodging + food + activities + insurance + shopping;
    setResult(form, `
      ${resultList([
        { label: "Total feriekostnad", value: formatNok(total) },
        { label: "Kostnad per person", value: formatNok(total / people) },
        { label: "Sparebeløp per måned", value: formatNok(total / months) }
      ])}
      <p class="formula">Sparebeløpet er total feriekostnad delt på antall måneder til reisen.</p>
    `, "success");
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindForm("budget-form", calculateBudget);
    bindForm("buffer-form", calculateBuffer);
    bindForm("electricity-form", calculateElectricity);
    bindForm("interest-form", calculateInterest);
    bindForm("subscription-form", calculateSubscriptions);
    bindForm("insurance-needs-form", calculateInsuranceNeeds);
    bindForm("deductible-form", calculateDeductible);
    bindForm("car-form", calculateCar);
    bindForm("food-form", calculateFood);
    bindForm("holiday-form", calculateHoliday);
    bindSubscriptions();
  });
})();
