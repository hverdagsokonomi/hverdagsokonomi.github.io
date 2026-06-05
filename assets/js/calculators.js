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
  const comparisonDisclaimer = "Typiske nivåer er kun veiledende. Hva som er normalt for deg, avhenger av inntekt, bosted, familie, bolig, avtaler, forbruksmønster og livssituasjon.";

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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getRangeStatus(value, low, high) {
    if (value < low) return "low";
    if (value > high) return "high";
    return "normal";
  }

  function statusLabel(status) {
    if (status === "low") return "Under typisk nivå";
    if (status === "high") return "Over typisk nivå";
    return "Innenfor typisk nivå";
  }

  function formatRange(low, high) {
    return `${formatNok(low)}-${formatNok(high)}`;
  }

  function renderTips(tips) {
    if (!tips || !tips.length) return "";
    return `<ul class="comparison-tips">${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul>`;
  }

  function renderComparison(status, title, typicalLevel, message, tips) {
    return `
      <div class="comparison-box comparison-${status}">
        <h4>Sammenlignet med typiske nivåer</h4>
        <span class="comparison-status">${statusLabel(status)}</span>
        <p><strong>${escapeHtml(title)}</strong></p>
        <p><strong>Typisk nivå:</strong> ${typicalLevel}</p>
        <p>${message}</p>
        ${renderTips(tips)}
        <p class="comparison-note">${comparisonDisclaimer}</p>
      </div>
    `;
  }

  function readOptionalNumber(form, name, label, options) {
    const input = field(form, name);
    if (!input || input.value.trim() === "") {
      if (helpers.setFieldError) helpers.setFieldError(input, "");
      return { value: null, valid: true };
    }

    const value = helpers.getRequiredNumber(input, label, options);
    return { value, valid: value !== null };
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
    const saving = costs[8];
    const disposable = income - totalCosts;
    const savingsRate = income > 0 ? (saving / income) * 100 : 0;
    const expenseRate = income > 0 ? (totalCosts / income) * 100 : 0;
    let assessment = "Balansert";
    let state = "success";

    if (disposable < 0) {
      assessment = "Stramt budsjett";
      state = "warning";
    } else if (disposable > income * 0.15 && savingsRate >= 10) {
      assessment = "God buffer";
    }

    const savingsStatus = getRangeStatus(savingsRate, 5, 15);
    const expenseStatus = getRangeStatus(expenseRate, 70, 90);
    const budgetStatus = disposable < 0 || expenseRate > 90 ? "high" : expenseRate < 70 ? "low" : "normal";
    const budgetTips = [];
    if (savingsRate < 5) budgetTips.push("Se etter små faste kostnader eller abonnementer som kan reduseres.");
    if (expenseRate > 90) budgetTips.push("En høy andel faste utgifter gjør økonomien mer sårbar for renteøkning, prisøkning eller uventede utgifter.");
    if (disposable < 0) budgetTips.push("Utgiftene er høyere enn inntekten. Dette bør følges opp raskt.");
    if (!budgetTips.length) budgetTips.push("Følg med på faste kostnader og vurder en månedlig gjennomgang.");

    setResult(form, `
      ${resultList([
        { label: "Totale utgifter", value: formatNok(totalCosts) },
        { label: "Disponibelt beløp", value: formatNok(disposable) },
        { label: "Sparingsgrad", value: formatPercent(savingsRate) },
        { label: "Andel utgifter av inntekt", value: formatPercent(expenseRate) },
        { label: "Enkel vurdering", value: assessment }
      ])}
      <p class="formula">Disponibelt beløp = inntekt minus utgifter. Sparingsgrad = sparing delt på inntekt.</p>
      ${renderComparison(
        budgetStatus,
        "Budsjettbildet samlet",
        "Sparingsgrad 5-15 %, utgiftsgrad 70-90 %, og disponibelt beløp over 0 kr.",
        `Sparingsgraden din er ${formatPercent(savingsRate)} (${statusLabel(savingsStatus).toLowerCase()}). Utgiftsgraden er ${formatPercent(expenseRate)} (${statusLabel(expenseStatus).toLowerCase()}). Disponibelt beløp er ${formatNok(disposable)}.`,
        budgetTips
      )}
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
    const bufferStatus = months <= 1 ? "low" : months <= 3 ? "normal" : "high";
    const bufferMessage = gap > 0
      ? `Du mangler ${formatNok(gap)} for å nå valgt buffer. Målet ditt tilsvarer ${numberFormatter.format(months)} måned(er) med faste utgifter.`
      : `Du har nådd eller passert valgt buffermål. Målet ditt tilsvarer ${numberFormatter.format(months)} måned(er) med faste utgifter.`;

    setResult(form, `
      ${resultList([
        { label: "Anbefalt buffer", value: formatNok(recommended) },
        { label: gap > 0 ? "Du mangler" : "Mangler til målet", value: gap > 0 ? formatNok(gap) : formatNok(0) },
        { label: "Eventuelt overskudd", value: formatNok(surplus) }
      ])}
      <p class="formula">Anbefalt buffer = faste utgifter ganger ønsket antall måneder.</p>
      ${renderComparison(
        bufferStatus,
        "Valgt buffernivå",
        "1 måned faste utgifter er minimumsbuffer, 2-3 måneder er ofte vanlig, og 4-6 måneder er en ekstra trygg buffer.",
        bufferMessage,
        [
          "Start med ett konkret delmål.",
          "Sett av et fast månedlig beløp.",
          "Hold buffer adskilt fra brukskonto."
        ]
      )}
    `, gap > 0 ? "warning" : "success");
  }

  function calculateElectricity(form) {
    const homeType = selectValue(form, "homeType");
    const kwh = readNumber(form, "kwh", "Forbruk i kWh", { min: 0 });
    const price = readNumber(form, "price", "Strømpris i øre/kWh", { min: 0 });
    const grid = readNumber(form, "grid", "Nettleie", { min: 0 });
    const fixed = readNumber(form, "fixedFee", "Fastbeløp", { min: 0 });
    if (!valuesValid([kwh, price, grid, fixed])) return;

    const electricityRanges = {
      apartment: { label: "Leilighet", low: 500, high: 1000 },
      rowhouse: { label: "Rekkehus/tomannsbolig", low: 900, high: 1700 },
      house: { label: "Enebolig", low: 1200, high: 2500 },
      cabin: { label: "Hytte/fritidsbolig", low: 200, high: 800 }
    };
    const range = electricityRanges[homeType] || electricityRanges.apartment;
    const monthly = kwh * price / 100 + grid + fixed;
    const typicalLow = range.low * price / 100 + grid + fixed;
    const typicalHigh = range.high * price / 100 + grid + fixed;
    const electricityStatus = getRangeStatus(kwh, range.low, range.high);

    setResult(form, `
      ${resultList([
        { label: "Estimert månedspris", value: formatNok(monthly) },
        { label: "Estimert årspris", value: formatNok(monthly * 12) }
      ])}
      <p class="formula">Månedspris = kWh ganger strømpris delt på 100, pluss nettleie og fastbeløp.</p>
      ${renderComparison(
        electricityStatus,
        "Strømforbruk og estimert månedspris",
        `${range.label}: ${numberFormatter.format(range.low)}-${numberFormatter.format(range.high)} kWh per måned. Med dine prisfelt tilsvarer det omtrent ${formatRange(typicalLow, typicalHigh)} per måned.`,
        `Du har oppgitt ${numberFormatter.format(kwh)} kWh og en estimert månedspris på ${formatNok(monthly)}. Strømforbruk varierer mye med boligstørrelse, oppvarming, isolasjon, antall personer og årstid.`,
        [
          "Sjekk oppvarming.",
          "Se etter strømtyver.",
          "Sammenlign strømavtale.",
          "Følg med på nettleie og fastbeløp."
        ]
      )}
    `, "success");
  }

  function calculateInterest(form) {
    const principal = readNumber(form, "principal", "Lånebeløp", { min: 0, allowZero: false });
    const rate = readNumber(form, "rate", "Nominell rente", { min: 0, max: 100 });
    const years = readNumber(form, "years", "Nedbetalingstid", { min: 1, max: 50, allowZero: false });
    const fee = readNumber(form, "fee", "Termingebyr", { min: 0 });
    const incomeResult = readOptionalNumber(form, "income", "Nettoinntekt per måned", { min: 0, allowZero: false });
    if (!incomeResult.valid || !valuesValid([principal, rate, years, fee])) return;

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
    const paymentRate = incomeResult.value ? (monthlyPayment / incomeResult.value) * 100 : null;
    const interestShare = principal > 0 ? (totalInterest / principal) * 100 : 0;
    const paymentStatus = paymentRate === null ? null : getRangeStatus(paymentRate, 10, 25);
    const interestStatus = getRangeStatus(interestShare, 20, 50);
    const loanStatus = paymentStatus || interestStatus;
    const paymentText = paymentRate === null
      ? "Nettoinntekt er ikke fylt ut, så månedlig betaling sammenlignes ikke mot inntekt."
      : `Månedlig betaling utgjør ${formatPercent(paymentRate)} av oppgitt nettoinntekt (${statusLabel(paymentStatus).toLowerCase()}).`;

    setResult(form, `
      ${resultList([
        { label: "Estimert månedlig betaling", value: formatNok(monthlyPayment) },
        { label: "Total rentekostnad", value: formatNok(totalInterest) },
        { label: "Total kostnad inkl. termingebyr", value: formatNok(totalCost) },
        { label: "Rentekostnad av lånebeløp", value: formatPercent(interestShare) }
      ])}
      <p class="formula">Annuitetsformelen brukes når renten er over 0. Ved 0 % rente deles lånebeløpet på antall måneder.</p>
      ${renderComparison(
        loanStatus,
        "Lånebelastning og total rentekostnad",
        "Betalingsgrad under 10 % er lav belastning, 10-25 % moderat, og over 25 % høy. Rentekostnad under 20 % av lånebeløpet er lav/moderat, 20-50 % betydelig, og over 50 % høy.",
        `${paymentText} Total rentekostnad er ${formatPercent(interestShare)} av lånebeløpet (${statusLabel(interestStatus).toLowerCase()}). Lang nedbetalingstid kan gi lavere månedsbeløp, men høyere total rentekostnad.`,
        [
          "Sammenlign effektiv rente.",
          "Sjekk termingebyr.",
          "Vurder kortere nedbetalingstid hvis økonomien tåler det.",
          "Vær forsiktig med forbrukslån og dyr kreditt."
        ]
      )}
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
    const countStatus = entries.length <= 3 ? "low" : entries.length <= 7 ? "normal" : "high";
    const costStatus = getRangeStatus(monthly, 300, 1000);

    setResult(form, `
      ${resultList([
        { label: "Total månedskostnad", value: formatNok(monthly) },
        { label: "Total årskostnad", value: formatNok(monthly * 12) },
        { label: "Antall abonnementer", value: numberFormatter.format(entries.length) },
        { label: "Dyreste abonnement", value: `${escapeHtml(mostExpensive.name)} (${formatNok(mostExpensive.price)})` }
      ])}
      <p class="formula">Vurder om alle abonnementene brukes aktivt.</p>
      ${renderComparison(
        costStatus,
        "Abonnementskostnad og antall",
        "0-3 abonnementer er få, 4-7 er moderat antall, og 8 eller flere er mange. Under 300 kr per måned er lav kostnad, 300-1000 kr moderat, og over 1000 kr høy.",
        `Du har lagt inn ${numberFormatter.format(entries.length)} abonnement(er), som er ${statusLabel(countStatus).toLowerCase()} for antall. Total månedskostnad er ${formatNok(monthly)} (${statusLabel(costStatus).toLowerCase()}). Abonnementer virker ofte små hver for seg, men kan bli en stor årlig kostnad samlet.`,
        [
          "Slett abonnementer du ikke bruker.",
          "Sjekk prøveperioder.",
          "Samle familieabonnement der det passer.",
          "Gå gjennom kontoutskrift én gang i måneden."
        ]
      )}
    `, "success");
  }

  function selectValue(form, name) {
    const input = field(form, name);
    return input ? input.value : "nei";
  }

  function calculateInsuranceNeeds(form) {
    const age = readNumber(form, "age", "Alder", { min: 0, max: 120 });
    if (age === null) return;

    const insuranceProfiles = {
      "Innboforsikring": {
        relevance: "Kan være relevant for de fleste som eier ting i bolig.",
        check: "Dekningssum, egenandel, uhellsdekning og om reiseforsikring er inkludert eller ikke.",
        type: "Ofte grunnleggende"
      },
      "Husforsikring": {
        relevance: "Kan være relevant når du eier bolig eller fritidsbolig.",
        check: "Bygningsdekning, vannskade, brann, naturskade, råte, egenandel og sikkerhetskrav.",
        type: "Situasjonsavhengig"
      },
      "Reiseforsikring": {
        relevance: "Kan være relevant hvis du reiser flere ganger i året.",
        check: "Reiselengde, geografisk område, avbestilling, egenandel og dekning for sykdom.",
        type: "Situasjonsavhengig"
      },
      "Bilforsikring": {
        relevance: "Kan være relevant hvis du har bil. Ansvarsforsikring er lovpålagt for registrert bil.",
        check: "Ansvar, delkasko/kasko, egenandel, bonus, kjørelengde og leiebil.",
        type: "Ofte grunnleggende ved bil"
      },
      "Barneforsikring": {
        relevance: "Kan være relevant for noen familier med barn.",
        check: "Dekningssum, sykdom/ulykke, uføredekning, unntak og helseopplysninger.",
        type: "Situasjonsavhengig"
      },
      "Livsforsikring": {
        relevance: "Kan være relevant hvis andre er økonomisk avhengige av deg.",
        check: "Dekningssum, varighet, hvem som får utbetaling og unntak.",
        type: "Situasjonsavhengig"
      },
      "Uføreforsikring": {
        relevance: "Kan være relevant hvis inntekten din er viktig for økonomien over tid.",
        check: "Utbetalingsform, karenstid, definisjon av uførhet, pris og unntak.",
        type: "Situasjonsavhengig"
      },
      "Dyreforsikring": {
        relevance: "Kan være relevant hvis du har kjæledyr og vil redusere risiko for store veterinærutgifter.",
        check: "Maksbeløp per år, egenandel, alder, raseunntak og kjente sykdommer.",
        type: "Situasjonsavhengig"
      }
    };
    const relevant = new Set(["Innboforsikring"]);
    const hasChildren = selectValue(form, "children") === "ja";
    const hasPartner = selectValue(form, "partner") === "ja";
    const hasHighDebt = selectValue(form, "highDebt") === "ja";
    if (selectValue(form, "home") === "ja" && selectValue(form, "housingType") === "eier") relevant.add("Husforsikring");
    if (selectValue(form, "travel") === "ja") relevant.add("Reiseforsikring");
    if (selectValue(form, "car") === "ja") relevant.add("Bilforsikring");
    if (hasChildren) relevant.add("Barneforsikring");
    if (hasPartner || hasHighDebt || hasChildren) relevant.add("Livsforsikring");
    if (age >= 18) relevant.add("Uføreforsikring");
    if (selectValue(form, "pet") === "ja") relevant.add("Dyreforsikring");

    const relevantList = Array.from(relevant);
    const insuranceStatus = relevantList.length <= 2 ? "low" : relevantList.length <= 5 ? "normal" : "high";
    const dependencyText = hasChildren || hasPartner || hasHighDebt
      ? "<p>Du har svart at barn, partner eller høy gjeld kan være relevant. Det kan gjøre en gjennomgang av økonomisk avhengighet nyttig, uten at dette er en anbefaling om et bestemt produkt.</p>"
      : "";
    const overviewText = relevantList.length <= 2
      ? "Du har få markerte behov basert på svarene."
      : "Du har flere livssituasjoner som kan gjøre forsikringsgjennomgang nyttig.";
    const insuranceItems = relevantList.map((name) => {
      const profile = insuranceProfiles[name];
      return `
        <li>
          <strong>${name}</strong><br>
          Relevans: ${profile.relevance}<br>
          Sjekk: ${profile.check}<br>
          Type: ${profile.type}
        </li>
      `;
    }).join("");

    setResult(form, `
      <p><strong>Forsikringer som kan være relevante å undersøke:</strong></p>
      <ul>${insuranceItems}</ul>
      ${dependencyText}
      <p class="formula">Dette er ikke en anbefaling, men en generell oversikt basert på svarene dine. Behov og vilkår varierer.</p>
      ${renderComparison(
        insuranceStatus,
        "Pedagogisk forsikringsoversikt",
        "Få, flere eller mange mulige forsikringstemaer kan være relevante avhengig av bolig, bil, familie, gjeld, reisevaner og økonomisk avhengighet.",
        overviewText,
        [
          "Sjekk dekning og unntak før du bytter eller kjøper forsikring.",
          "Sammenlign egenandel og dekningssummer.",
          "Se etter dobbel dekning gjennom arbeid, medlemskap eller betalingskort."
        ]
      )}
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
        ${renderComparison(
          "low",
          "Skadebeløp mot egenandel",
          "Skadebeløp over egenandel kan gi mulig økonomisk dekning, men vilkår varierer.",
          "Skaden er lavere enn eller lik egenandelen. Da vil forsikringen normalt ikke gi økonomisk utbetaling i dette forenklede eksempelet.",
          [
            "Sjekk egenandel.",
            "Sjekk bonustap.",
            "Sjekk om skaden påvirker fremtidig premie.",
            "Dokumenter skaden."
          ]
        )}
      `, "warning");
      return;
    }

    const net = coverage - bonusLoss;
    const netStatus = net < 0 ? "low" : net <= 2000 ? "normal" : "high";
    const assessment = net > 0
      ? "Det kan være verdt å undersøke om skaden bør meldes."
      : "Bonustap eller økt premie kan gjøre nytten lav. Sjekk vilkårene før du melder skade.";
    let netMessage = "Skaden kan være verdt å vurdere å melde, men sjekk vilkår, bonus og fremtidig premie først.";
    if (net < 0) {
      netMessage = "Etter egenandel og mulig bonustap/økt premie kan det økonomiske utbyttet være negativt.";
    } else if (net <= 2000) {
      netMessage = "Den økonomiske gevinsten virker begrenset. Sjekk vilkårene nøye.";
    }

    setResult(form, `
      ${resultList([
        { label: "Du betaler selv", value: formatNok(deductible + bonusLoss) },
        { label: "Forsikringen dekker potensielt", value: formatNok(coverage) },
        { label: "Netto mulig nytte", value: formatNok(net) },
        { label: "Enkel vurdering", value: assessment }
      ])}
      <p class="formula">Dekning = skadebeløp minus egenandel. Netto mulig nytte = dekning minus mulig bonustap eller økt premie.</p>
      ${renderComparison(
        netStatus,
        "Netto mulig nytte",
        "Under 0 kr kan gi negativt økonomisk utbytte, 0-2000 kr er begrenset gevinst, og over 2000 kr kan være mer relevant å undersøke.",
        netMessage,
        [
          "Sjekk egenandel.",
          "Sjekk bonustap.",
          "Sjekk om skaden påvirker fremtidig premie.",
          "Dokumenter skaden."
        ]
      )}
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
    const carStatus = getRangeStatus(monthly, 3000, 7000);
    setResult(form, `
      ${resultList([
        { label: "Total månedskostnad", value: formatNok(monthly) },
        { label: "Total årskostnad", value: formatNok(monthly * 12) },
        { label: "Kostnad per dag", value: formatNok(monthly * 12 / 365) }
      ])}
      <p class="formula">Verdifall er ofte en skjult bilkostnad fordi den først blir tydelig når bilen selges eller byttes.</p>
      ${renderComparison(
        carStatus,
        "Månedlig bilkostnad",
        "Under 3000 kr per måned er lav bilkostnad, 3000-7000 kr er moderat, og over 7000 kr er høy.",
        `Din estimerte bilkostnad er ${formatNok(monthly)} per måned og ${formatNok(monthly * 12)} per år. Bilkostnader varierer mye med biltype, lån/leasing, kjørelengde, forsikring, service og verdifall.`,
        [
          "Verdifall er ofte en stor skjult kostnad.",
          "Sammenlign forsikring.",
          "Vurder kjørelengde.",
          "Sjekk service- og dekkostnader.",
          "Vurder om bilen faktisk brukes nok."
        ]
      )}
    `, "success");
  }

  function calculateFood(form) {
    const adults = readNumber(form, "adults", "Antall voksne", { min: 0, max: 20 });
    const children = readNumber(form, "children", "Antall barn", { min: 0, max: 20 });
    const adultCost = readNumber(form, "adultCost", "Matkostnad per voksen", { min: 0 });
    const childCost = readNumber(form, "childCost", "Matkostnad per barn", { min: 0 });
    const takeaway = readNumber(form, "takeaway", "Restaurant og takeaway", { min: 0 });
    if (!valuesValid([adults, children, adultCost, childCost, takeaway])) return;
    if (adults + children <= 0) {
      if (helpers.setFieldError) helpers.setFieldError(field(form, "adults"), "Legg inn minst én person i husholdningen.");
      return;
    }

    const foodAtHome = adults * adultCost + children * childCost;
    const monthly = foodAtHome + takeaway;
    const costPerPerson = monthly / (adults + children);
    const typicalLow = adults * 3500 + children * 2000;
    const typicalHigh = adults * 5000 + children * 3500;
    const foodStatus = getRangeStatus(costPerPerson, 2500, 4500);
    let foodMessage = `Matbudsjettet ditt ligger innenfor dette grove intervallet for mat hjemme. Total matkostnad per person er ${formatNok(costPerPerson)} per måned.`;
    if (foodAtHome < typicalLow) {
      foodMessage = `Matbudsjettet ditt ligger under dette grove intervallet. Det kan bety at du handler rimelig, har lavt forbruk, eller at enkelte matkostnader ikke er tatt med. Total matkostnad per person er ${formatNok(costPerPerson)} per måned.`;
    } else if (foodAtHome > typicalHigh) {
      foodMessage = `Matbudsjettet ditt ligger over dette grove intervallet. Det kan skyldes dyrere matvaner, spesialkost, mye ferdigmat, høyere priser lokalt eller at flere kostnader er inkludert. Total matkostnad per person er ${formatNok(costPerPerson)} per måned.`;
    }

    setResult(form, `
      ${resultList([
        { label: "Mat hjemme per måned", value: formatNok(foodAtHome) },
        { label: "Restaurant/takeaway", value: formatNok(takeaway) },
        { label: "Estimert matbudsjett per måned", value: formatNok(monthly) },
        { label: "Estimert matbudsjett per år", value: formatNok(monthly * 12) },
        { label: "Total matkostnad per person", value: formatNok(costPerPerson) }
      ])}
      <p class="formula">Matbudsjettet beregnes fra antall personer, estimert månedskostnad og restaurant/takeaway.</p>
      ${renderComparison(
        foodStatus,
        "Matbudsjett for husholdningen",
        `Basert på antall personer i husholdningen ligger et grovt typisk nivå for mat hjemme på omtrent ${formatRange(typicalLow, typicalHigh)} per måned. Restaurant og takeaway kommer i tillegg. Per person er 2500-4500 kr per måned et grovt typisk nivå.`,
        foodMessage,
        [
          "Skill dagligvarer fra takeaway.",
          "Planlegg middager.",
          "Sjekk matsvinn.",
          "Sammenlign kilopris.",
          "Handle sjeldnere med handleliste."
        ]
      )}
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
    const incomeResult = readOptionalNumber(form, "income", "Nettoinntekt per måned", { min: 0, allowZero: false });
    if (!incomeResult.valid || !valuesValid([transport, lodging, food, activities, insurance, shopping, people, months])) return;

    const total = transport + lodging + food + activities + insurance + shopping;
    const perPerson = total / people;
    const monthlySaving = total / months;
    const savingShare = incomeResult.value ? (monthlySaving / incomeResult.value) * 100 : null;
    const personStatus = getRangeStatus(perPerson, 5000, 15000);
    const savingStatus = savingShare === null ? null : getRangeStatus(savingShare, 5, 15);
    const holidayStatus = savingStatus || personStatus;
    const savingText = savingShare === null
      ? "Nettoinntekt er ikke fylt ut, så nødvendig månedlig sparing sammenlignes ikke mot inntekt."
      : `Nødvendig månedlig sparing er ${formatPercent(savingShare)} av oppgitt nettoinntekt (${statusLabel(savingStatus).toLowerCase()}).`;

    setResult(form, `
      ${resultList([
        { label: "Total feriekostnad", value: formatNok(total) },
        { label: "Kostnad per person", value: formatNok(perPerson) },
        { label: "Sparebeløp per måned", value: formatNok(monthlySaving) },
        { label: "Spareandel av inntekt", value: savingShare === null ? "Ikke oppgitt" : formatPercent(savingShare) }
      ])}
      <p class="formula">Sparebeløpet er total feriekostnad delt på antall måneder til reisen.</p>
      ${renderComparison(
        holidayStatus,
        "Feriekostnad og månedlig sparing",
        "Under 5000 kr per person er lav feriekostnad, 5000-15000 kr moderat, og over 15000 kr høy. Spareandel under 5 % av inntekt er lav, 5-15 % moderat, og over 15 % høy.",
        `Kostnad per person er ${formatNok(perPerson)} (${statusLabel(personStatus).toLowerCase()}). ${savingText} Ferie blir ofte dyrere enn planlagt når mat, transport lokalt, aktiviteter og småkjøp ikke tas med.`,
        [
          "Legg inn buffer i feriebudsjettet.",
          "Bestill tidlig hvis det gir bedre pris.",
          "Sjekk reiseforsikring.",
          "Vær realistisk på mat og aktiviteter.",
          "Sett av penger månedlig."
        ]
      )}
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
