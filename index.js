let decimal_places = 2;
const MIN_DECIMALS = 0;
// Display cap: stored weights carry up to 9 decimals (phosphorus), but past 6
// the readout is noise for a teaching tool.
const MAX_DECIMALS = 6;

// Standard atomic weights at full published precision, CIAAW/IUPAC 2024
// (https://ciaaw.org/atomic-weights.htm). Interval elements use the abridged
// (conventional) single value. Elements with no standard weight
// (Tc, Pm, Po, At, Rn, Fr, Ra, Ac, Np-Og) carry a representative mass number.
// The decimals control rounds displayed values only; the stored weights stay exact.
const element_mass_map = {
    "H": 1.008,
    "He": 4.002602,
    "Li": 6.94,
    "Be": 9.0121831,
    "B": 10.81,
    "C": 12.011,
    "N": 14.007,
    "O": 15.999,
    "F": 18.998403162,
    "Ne": 20.1797,
    "Na": 22.98976928,
    "Mg": 24.305,
    "Al": 26.9815384,
    "Si": 28.085,
    "P": 30.973761998,
    "S": 32.06,
    "Cl": 35.45,
    "Ar": 39.95,
    "K": 39.0983,
    "Ca": 40.078,
    "Sc": 44.955907,
    "Ti": 47.867,
    "V": 50.9415,
    "Cr": 51.9961,
    "Mn": 54.938043,
    "Fe": 55.845,
    "Co": 58.933194,
    "Ni": 58.6934,
    "Cu": 63.546,
    "Zn": 65.38,
    "Ga": 69.723,
    "Ge": 72.63,
    "As": 74.921595,
    "Se": 78.971,
    "Br": 79.904,
    "Kr": 83.798,
    "Rb": 85.4678,
    "Sr": 87.62,
    "Y": 88.905838,
    "Zr": 91.222,
    "Nb": 92.90637,
    "Mo": 95.95,
    "Tc": 98,
    "Ru": 101.07,
    "Rh": 102.90549,
    "Pd": 106.42,
    "Ag": 107.8682,
    "Cd": 112.414,
    "In": 114.818,
    "Sn": 118.71,
    "Sb": 121.76,
    "Te": 127.6,
    "I": 126.90447,
    "Xe": 131.293,
    "Cs": 132.90545196,
    "Ba": 137.327,
    "La": 138.90547,
    "Ce": 140.116,
    "Pr": 140.90766,
    "Nd": 144.242,
    "Pm": 145,
    "Sm": 150.36,
    "Eu": 151.964,
    "Gd": 157.249,
    "Tb": 158.925354,
    "Dy": 162.5,
    "Ho": 164.930329,
    "Er": 167.259,
    "Tm": 168.934219,
    "Yb": 173.045,
    "Lu": 174.96669,
    "Hf": 178.486,
    "Ta": 180.94788,
    "W": 183.84,
    "Re": 186.207,
    "Os": 190.23,
    "Ir": 192.217,
    "Pt": 195.084,
    "Au": 196.96657,
    "Hg": 200.592,
    "Tl": 204.38,
    "Pb": 207.2,
    "Bi": 208.9804,
    "Po": 209,
    "At": 210,
    "Rn": 222,
    "Fr": 223,
    "Ra": 226,
    "Ac": 227,
    "Th": 232.0377,
    "Pa": 231.03588,
    "U": 238.02891,
    "Np": 237,
    "Pu": 244,
    "Am": 243,
    "Cm": 247,
    "Bk": 247,
    "Cf": 251,
    "Es": 252,
    "Fm": 257,
    "Md": 258,
    "No": 259,
    "Lr": 262,
    "Rf": 261,
    "Db": 262,
    "Sg": 266,
    "Bh": 264,
    "Hs": 277,
    "Mt": 268,
    "Ds": 281,
    "Rg": 282,
    "Cn": 285,
    "Nh": 286,
    "Fl": 289,
    "Mc": 290,
    "Lv": 293,
    "Ts": 294,
    "Og": 294
}

// Elements with no CIAAW standard weight; the map carries a representative mass number.
const placeholder_mass_numbers = new Set([
    "Tc", "Pm", "Po", "At", "Rn", "Fr", "Ra", "Ac",
    "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md",
    "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt",
    "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"
]);

// Lowercase symbol -> proper symbol, for reading miscapitalized input.
const SYMBOLS_BY_LOWERCASE = new Map(Object.keys(element_mass_map).map(sym => [sym.toLowerCase(), sym]));

// Current formula text, shared by the display update and the copy button.
let molecular_formula;

// True from a keystroke until typing pauses, to hold back hints about a
// symbol that's still being typed.
const TYPING_PAUSE_MS = 1000;
let still_typing = false;
let typing_timer = null;

// Saved formulas, most recent first, each with an optional label
// ({formula, label}). Masses are recomputed on render so they follow the
// decimals control.
const HISTORY_KEY = "molwt-history";
const MAX_HISTORY = 50;
const MAX_LABEL_LENGTH = 40;
let history_entries = load_history();
// Formula to flash in the history list on its next render.
let just_saved_formula = null;
// Index of the entry whose label is being edited, or null.
let editing_index = null;

function load_history() {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
        if (!Array.isArray(saved)) {
            return [];
        }
        // Earlier versions stored bare formula strings.
        return saved
            .map(item => typeof item === "string" ? { formula: item, label: "" } : item)
            .filter(item => item && typeof item.formula === "string")
            .map(item => ({ formula: item.formula, label: typeof item.label === "string" ? item.label : "" }));
    } catch (e) {
        return [];
    }
}

function save_history() {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history_entries));
    } catch (e) {
        // Storage unavailable (private window, blocked site data): history lasts this page load only.
    }
}

// Put a formula at the top of the history, moving it up (label kept) if it's already there.
// Blanks, half-typed formulas and ones with unreadable symbols are skipped.
function add_to_history(formula) {
    formula = (formula || "").trim();
    if (!formula) {
        return;
    }
    if (!is_complete_formula(parse_formula(formula))) {
        return;
    }
    const existing = history_entries.find(entry => entry.formula === formula);
    const entry = existing || { formula, label: "" };
    history_entries = [entry, ...history_entries.filter(e => e !== entry)].slice(0, MAX_HISTORY);
    just_saved_formula = formula;
    save_history();
    render_history();
}

function remove_from_history(index) {
    history_entries.splice(index, 1);
    save_history();
    render_history();
}

function start_label_edit(index) {
    editing_index = index;
    render_history();
}

// Close the label editor, keeping the typed label when save is true.
// Enter and Escape hand focus back to the formula input; a blur leaves it where the click went.
function finish_label_edit(save, refocus) {
    if (editing_index === null) {
        return;
    }
    const index = editing_index;
    editing_index = null;
    const label_input_el = document.querySelector('.history-label-input');
    if (save && label_input_el && history_entries[index]) {
        history_entries[index].label = label_input_el.value.trim().slice(0, MAX_LABEL_LENGTH);
        save_history();
    }
    render_history();
    const input_el = document.getElementById('mol-formula');
    if (refocus && input_el) {
        input_el.focus();
    }
}

function render_history() {
    const list_el = document.getElementById('history-list');
    const empty_el = document.getElementById('history-empty');
    const clear_all_el = document.getElementById('history-clear');
    if (!list_el) {
        return;
    }
    const current = (molecular_formula || "").trim();
    list_el.innerHTML = history_entries.map(({ formula, label }, index) => {
        if (index === editing_index) {
            return `<li class="editing">
                <span class="history-formula">${render_formula_html(formula)}</span>
                <input class="history-label-input" type="text" maxlength="${MAX_LABEL_LENGTH}"
                    value="${escape_html(label)}" placeholder="Label, e.g. Problem 3"
                    aria-label="Label for ${escape_html(formula)}" />
            </li>`;
        }
        const { mass } = parse_formula(formula);
        const classes = [
            formula === current ? "current" : "",
            formula === just_saved_formula ? "just-saved" : ""
        ].join(" ").trim();
        const label_html = label ? `<span class="history-label">${escape_html(label)}</span>` : "";
        return `<li class="${classes}">
            <button class="history-load" type="button" data-index="${index}" title="Load ${escape_html(formula)}">
                <span class="history-name">
                    <span class="history-formula">${render_formula_html(formula)}</span>
                    ${label_html}
                </span>
                <span class="history-mass">${mass.toFixed(decimal_places)}</span>
            </button>
            <button class="history-edit" type="button" data-index="${index}" title="Label" aria-label="Label ${escape_html(formula)}">✎</button>
            <button class="history-remove" type="button" data-index="${index}" title="Remove" aria-label="Remove ${escape_html(formula)}">×</button>
        </li>`;
    }).join("");
    just_saved_formula = null;

    const label_input_el = list_el.querySelector('.history-label-input');
    if (label_input_el) {
        label_input_el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                finish_label_edit(true, true);
            } else if (event.key === 'Escape') {
                finish_label_edit(false, true);
            }
        });
        label_input_el.addEventListener('blur', () => finish_label_edit(true, false));
        label_input_el.focus();
        label_input_el.select();
    }

    if (empty_el) {
        empty_el.hidden = history_entries.length > 0;
    }
    if (clear_all_el) {
        clear_all_el.hidden = history_entries.length === 0;
    }
}

// Empty the input for the next problem, saving the outgoing formula first.
function clear_formula() {
    const input_el = document.getElementById('mol-formula');
    if (!input_el) {
        return;
    }
    add_to_history(input_el.value);
    input_el.value = "";
    update_display();
    input_el.focus();
}

function load_formula(formula) {
    const input_el = document.getElementById('mol-formula');
    if (!input_el) {
        return;
    }
    input_el.value = formula;
    clearTimeout(typing_timer);
    still_typing = false;
    update_display();
    input_el.focus();
}

function escape_html(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Render a formula with subscript counts: H2SO4 -> H<sub>2</sub>SO<sub>4</sub>
function render_formula_html(formula) {
    return escape_html(normalize_dots(formula)).replace(/([A-Za-z)\]}])(\d+)/g, "$1<sub>$2</sub>");
}

const UNICODE_SUBSCRIPTS = {"0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉"};

// Plain-text formula with Unicode subscripts for pasting into documents: H2SO4 -> H₂SO₄
function formula_to_unicode(formula) {
    return normalize_dots(formula).replace(/([A-Za-z)\]}])(\d+)/g, (match, pre, digits) =>
        pre + [...digits].map(d => UNICODE_SUBSCRIPTS[d]).join(""));
}

// Copy text to the clipboard; true if it worked.
async function copy_to_clipboard(text) {
    let ok = false;
    try {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            ok = true;
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            ok = document.execCommand('copy');
            document.body.removeChild(ta);
        }
    } catch (e) {
        ok = false;
    }
    return ok;
}

// Show a copy button's outcome briefly, then restore its label.
function flash_copy_result(btn, ok) {
    if (!btn) {
        return;
    }
    const label = btn.dataset.label || btn.textContent;
    btn.dataset.label = label;
    btn.textContent = ok ? "Copied!" : "Copy failed";
    setTimeout(() => { btn.textContent = label; }, 1200);
}

// Copy the rendered formula (Unicode subscripts) to the clipboard
async function copy_formula() {
    const text = formula_to_unicode(molecular_formula || "");
    if (!text) {
        return;
    }
    flash_copy_result(document.getElementById('formula-copy'), await copy_to_clipboard(text));
}

// The calculation written out for a worksheet, at the current decimals:
// "H₂O: 2(1.01) + 16.00 = 18.02 g/mol". The total is summed from the
// rounded atomic masses shown, so the line adds up the way it would by hand
// from a periodic table; it can differ from the full-precision result in
// the last digit or two (CuSO4·5H2O: 249.71 here vs 249.68).
function worked_calculation_text(formula, element_counts) {
    let total = 0;
    const terms = element_counts.map(([sym, count]) => {
        const atomic_mass = element_mass_map[sym].toFixed(decimal_places);
        total += count * Number(atomic_mass);
        return count === 1 ? atomic_mass : `${count}(${atomic_mass})`;
    });
    return `${formula_to_unicode(formula.trim())}: ${terms.join(" + ")} = ${total.toFixed(decimal_places)} g/mol`;
}

async function copy_work(btn) {
    const { element_counts } = parse_formula(molecular_formula || "");
    if (!element_counts.length) {
        return;
    }
    flash_copy_result(btn, await copy_to_clipboard(worked_calculation_text(molecular_formula, element_counts)));
}

// construct the html for the details of the calculation
// Breakdown table: one row per element with its share of the total mass.
function details_html(element_counts, total_mass) {
    let rows = "";
    for (const entry of element_counts) {
        const [element_symbol, element_count] = entry;
        const atomic_mass = element_mass_map[element_symbol];
        const element_mass = element_count * atomic_mass;
        const pct = total_mass > 0 ? (100 * element_mass / total_mass) : 0;
        const pct_text = pct.toFixed(1);
        rows += `<tr style="background: linear-gradient(to right, rgba(102, 126, 234, 0.12) ${pct_text}%, transparent ${pct_text}%);">
            <td class="detail-element">${element_symbol}</td>
            <td class="detail-atomic-mass">${atomic_mass.toFixed(decimal_places)}</td>
            <td class="detail-count">× ${element_count}</td>
            <td class="detail-mass">${element_mass.toFixed(decimal_places)}</td>
            <td class="detail-pct">${pct_text}%</td>
        </tr>`;
    }
    const placeholders_used = element_counts
        .map(([element_symbol]) => element_symbol)
        .filter(sym => placeholder_mass_numbers.has(sym));
    const placeholder_note = placeholders_used.length
        ? ` &middot; ${placeholders_used.join(", ")}: representative mass number${placeholders_used.length > 1 ? "s" : ""} (no IUPAC standard weight${placeholders_used.length > 1 ? "s" : ""})`
        : "";
    const copy_work_html = element_counts.length
        ? `<button class="work-copy" type="button" title="Copy the calculation, e.g. 2(1.01) + 16.00 = 18.02 g/mol">Copy work</button>`
        : "";
    return `<table class="detail-grid">${rows}</table>
        ${copy_work_html}
        <div class="detail-source">Atomic masses from <a href="https://www.ciaaw.org/atomic-weights.htm" target="_blank" rel="noopener">IUPAC</a>${placeholder_note}</div>`
};
// Characters that separate the parts of a hydrate or adduct: CuSO4·5H2O.
// "." and "*" are the typeable stand-ins for the middle dot.
const HYDRATE_DOTS = "·•∙⋅*.";
const OPEN_BRACKETS = "([{";
const CLOSE_BRACKETS = ")]}";

// Leading coefficient of a hydrate part: "5" in "·5H2O", "0.5" or "½" for a
// hemihydrate. Returns the value and how many characters it used.
function read_coefficient(formula, i) {
    if (formula[i] === "½") {
        return { value: 0.5, length: 1 };
    }
    const match = /^\d+(?:\.\d+)?/.exec(formula.slice(i));
    return match ? { value: parseFloat(match[0]), length: match[0].length } : { value: 1, length: 0 };
}

// Count atoms with a stack of element->count tallies, one per open bracket:
// each closing bracket multiplies its group out and folds it into the parent,
// so Mg(OH)2, Fe2(SO4)3 and K3[Fe(CN)6] accumulate correctly no matter how
// deeply groups nest. Hydrate parts (CuSO4·5H2O) are tallied separately and
// added in times their leading coefficient.
// Returns the total mass plus the per-element [symbol, count] pairs, and
// what couldn't be read: unknown_symbols ("Xx", left out of the mass),
// has_lowercase (letters not part of a symbol: "co2"), and incomplete
// (the input ends on the first letter of a two-letter symbol, "NaClM",
// so it's mid-typing rather than wrong).
function parse_formula(formula) {
    const totals = {};
    const unknown_symbols = [];
    let has_lowercase = false;
    let incomplete = false;
    let stack;
    let coefficient;
    let i = 0;

    function start_part() {
        stack = [{}];
        const coef = read_coefficient(formula, i);
        coefficient = coef.value;
        i += coef.length;
    }

    function fold_top_group(multiplier) {
        const group = stack.pop();
        const parent = stack[stack.length - 1];
        for (const sym in group) {
            parent[sym] = (parent[sym] || 0) + group[sym] * multiplier;
        }
    }

    function end_part() {
        // Unclosed bracket (mid-typing "Mg(OH"): fold open groups in as if
        // closed, so the running total doesn't drop them.
        while (stack.length > 1) {
            fold_top_group(1);
        }
        for (const sym in stack[0]) {
            totals[sym] = (totals[sym] || 0) + stack[0][sym] * coefficient;
        }
    }

    start_part();
    while (i < formula.length) {
        const ch = formula[i];
        if (HYDRATE_DOTS.includes(ch)) {
            i++;
            end_part();
            start_part();
        } else if (OPEN_BRACKETS.includes(ch)) {
            stack.push({});
            i++;
        } else if (CLOSE_BRACKETS.includes(ch)) {
            i++;
            let digits = '';
            while (i < formula.length && /[0-9]/.test(formula[i])) {
                digits += formula[i];
                i++;
            }
            // Unmatched closer (a typo like "H2O)"): ignore it and its
            // multiplier rather than popping the root tally.
            if (stack.length === 1) {
                continue;
            }
            fold_top_group(digits ? parseInt(digits) : 1);
        } else if (/[A-Z]/.test(ch)) {
            let sym = ch;
            i++;
            while (i < formula.length && /[a-z]/.test(formula[i])) {
                sym += formula[i];
                i++;
            }
            let digits = '';
            while (i < formula.length && /[0-9]/.test(formula[i])) {
                digits += formula[i];
                i++;
            }
            if (!Object.hasOwn(element_mass_map, sym)) {
                const mid_typing = i === formula.length && !digits && sym.length === 1
                    && Object.keys(element_mass_map).some(known => known.length === 2 && known[0] === sym);
                if (mid_typing) {
                    incomplete = true;
                } else if (!unknown_symbols.includes(sym)) {
                    unknown_symbols.push(sym);
                }
                continue;
            }
            const count = digits ? parseInt(digits) : 1;
            const top = stack[stack.length - 1];
            top[sym] = (top[sym] || 0) + count;
        } else {
            if (/[a-z]/.test(ch)) {
                has_lowercase = true;
            }
            i++;
        }
    }
    end_part();

    const element_counts = [];
    let mass = 0;
    for (const sym in totals) {
        const count = totals[sym];
        element_counts.push([sym, count]);
        mass += element_mass_map[sym] * count;
    }
    return { mass, element_counts, unknown_symbols, has_lowercase, incomplete };
}

// A formula worth saving: every symbol read, and something to weigh.
function is_complete_formula(result) {
    return !result.unknown_symbols.length && !result.has_lowercase && !result.incomplete && result.mass > 0;
}

// Ways to read a run of letters as element symbols ignoring case, two-letter
// symbols first: "co" -> ["Co", "CO"], "nacl" -> ["NaCl"].
function symbol_readings(letters, limit) {
    const readings = [];
    const dead_ends = new Set();
    function walk(pos, so_far) {
        if (pos === letters.length) {
            readings.push(so_far);
            return true;
        }
        if (dead_ends.has(pos)) {
            return false;
        }
        let found = false;
        for (const len of [2, 1]) {
            if (readings.length >= limit || pos + len > letters.length) {
                continue;
            }
            const sym = SYMBOLS_BY_LOWERCASE.get(letters.slice(pos, pos + len).toLowerCase());
            if (sym && walk(pos + len, so_far + sym)) {
                found = true;
            }
        }
        if (!found) {
            dead_ends.add(pos);
        }
        return found;
    }
    walk(0, "");
    return readings;
}

// Recapitalized versions of a formula that read cleanly, for "Did you mean"
// hints: "co2" -> ["Co2", "CO2"], "NaCL" -> ["NaCl"]. Letter runs that are
// already valid as typed are left alone.
function suggest_capitalizations(formula, limit = 3) {
    const parts = formula.split(/([A-Za-z]+)/);
    let candidates = [""];
    for (let k = 0; k < parts.length; k++) {
        const part = parts[k];
        const is_letters = k % 2 === 1;
        const valid_as_typed = /^(?:[A-Z][a-z]?)+$/.test(part)
            && part.match(/[A-Z][a-z]?/g).every(sym => Object.hasOwn(element_mass_map, sym));
        const options = !is_letters || valid_as_typed ? [part] : symbol_readings(part, limit + 1);
        if (!options.length) {
            return [];
        }
        candidates = candidates.flatMap(prefix => options.map(option => prefix + option)).slice(0, limit + 1);
    }
    return candidates.filter(candidate => candidate !== formula).slice(0, limit);
}

// Explain what couldn't be read, with clickable recapitalizations. A
// half-typed trailing symbol ("NaClM") only counts once typing has paused,
// so typing "Mg" doesn't flash a complaint about "M".
function formula_problem_html(formula, result, typing) {
    const unknown = result.incomplete && !typing
        ? [...result.unknown_symbols, formula.slice(-1)]
        : result.unknown_symbols;
    let message = "";
    if (unknown.length) {
        message = unknown.length === 1
            ? `There's no element with the symbol <strong>${escape_html(unknown[0])}</strong>.`
            : `There are no elements with the symbols ${unknown.map(sym => `<strong>${escape_html(sym)}</strong>`).join(", ")}.`;
    } else if (result.has_lowercase) {
        message = "Element symbols start with a capital letter.";
    } else {
        return "";
    }
    const suggestions = suggest_capitalizations(formula);
    if (suggestions.length) {
        const buttons = suggestions.map(suggestion =>
            `<button class="formula-suggestion" type="button" data-formula="${escape_html(suggestion)}">${render_formula_html(suggestion)}</button>`);
        message += ` Did you mean ${buttons.join(" or ")}?`;
    }
    return message;
}

// Show hydrate separators as a middle dot: "CuSO4.5H2O" and "CuSO4*5H2O"
// both display as CuSO4·5H2O. A decimal point inside a coefficient
// ("·0.5H2O") is left alone.
function normalize_dots(formula) {
    let out = "";
    let i = 0;
    let at_part_start = true;
    while (i < formula.length) {
        if (at_part_start) {
            const coef = read_coefficient(formula, i);
            out += formula.slice(i, i + coef.length);
            i += coef.length;
            at_part_start = false;
            continue;
        }
        const ch = formula[i];
        if (HYDRATE_DOTS.includes(ch)) {
            out += "·";
            at_part_start = true;
        } else {
            out += ch;
        }
        i++;
    }
    return out;
}

// Grams <-> moles: whichever field was typed in last is the given value,
// and the other is computed from it at the current molar mass. Computed
// values show 4 significant figures.
const CONVERTER_SIG_FIGS = 4;
let converter_source = "grams";

function format_sig_figs(value) {
    return Number.isFinite(value) ? String(Number(value.toPrecision(CONVERTER_SIG_FIGS))) : "";
}

function update_converter(molar_mass) {
    const converter_el = document.getElementById('converter');
    const grams_el = document.getElementById('convert-grams');
    const moles_el = document.getElementById('convert-moles');
    if (!converter_el || !grams_el || !moles_el) {
        return;
    }
    converter_el.hidden = !(molar_mass > 0);
    if (!(molar_mass > 0)) {
        return;
    }
    const [given_el, computed_el] = converter_source === "grams" ? [grams_el, moles_el] : [moles_el, grams_el];
    const given = parseFloat(given_el.value);
    if (given_el.value === "" || !Number.isFinite(given)) {
        computed_el.value = "";
        return;
    }
    computed_el.value = format_sig_figs(converter_source === "grams" ? given / molar_mass : given * molar_mass);
}

// The formula rides in the page link (…/#Fe2(SO4)3), so a link opens with
// the calculation done. replaceState keeps typing out of the back button.
function formula_from_hash() {
    try {
        return decodeURIComponent(location.hash.slice(1));
    } catch (e) {
        return "";
    }
}

function sync_hash(formula) {
    // "*" reads the same as a middle dot and stays readable in a link (no %C2%B7).
    const trimmed = (formula || "").trim().replace(/[·•∙⋅]/g, "*");
    if (trimmed === formula_from_hash()) {
        return;
    }
    const url = trimmed ? "#" + encodeURIComponent(trimmed) : location.pathname + location.search;
    history.replaceState(null, "", url);
}

function update_display() {
    const input_el = document.getElementById('mol-formula');

    // Read the formula, recompute from full-precision weights, repaint everything.
    molecular_formula = input_el ? input_el.value : molecular_formula;
    const result = parse_formula(molecular_formula || "");
    const problem_html = formula_problem_html(molecular_formula || "", result, still_typing);
    const { mass, element_counts } = result;
    // A dash rather than a mass that leaves part of the formula out.
    const unreadable = result.unknown_symbols.length || result.has_lowercase || result.incomplete;

    document.getElementById('output-text').innerHTML = unreadable ? "—" : mass.toFixed(decimal_places);
    const unit_el = document.getElementById('output-unit');
    if (unit_el) {
        unit_el.hidden = unreadable || !(mass > 0);
    }
    update_converter(unreadable ? 0 : mass);
    document.getElementById('details-text').innerHTML = unreadable ? details_html([], 0) : details_html(element_counts, mass);
    const problem_el = document.getElementById('formula-problem');
    if (problem_el) {
        problem_el.innerHTML = problem_html;
        problem_el.hidden = !problem_html;
    }

    const formula_row_el = document.getElementById('formula-display-row');
    const formula_el = document.getElementById('formula-display');
    if (formula_el) {
        formula_el.innerHTML = molecular_formula ? render_formula_html(molecular_formula) : "";
    }
    if (formula_row_el) {
        formula_row_el.hidden = !molecular_formula;
    }
    const clear_el = document.getElementById('formula-clear');
    if (clear_el) {
        clear_el.hidden = !molecular_formula;
    }

    const decimal_value_el = document.getElementById('decimal-value');
    if (decimal_value_el) {
        decimal_value_el.textContent = decimal_places;
    }
    const minus_el = document.getElementById('decimal-minus');
    const plus_el = document.getElementById('decimal-plus');
    if (minus_el) {
        minus_el.disabled = decimal_places <= MIN_DECIMALS;
    }
    if (plus_el) {
        plus_el.disabled = decimal_places >= MAX_DECIMALS;
    }
    render_history();
    sync_hash(molecular_formula);
}

document.addEventListener('DOMContentLoaded', () => {
    const input_el = document.getElementById('mol-formula');
    if (input_el && formula_from_hash()) {
        input_el.value = formula_from_hash();
    }
    window.addEventListener('hashchange', () => {
        if (input_el && formula_from_hash() !== input_el.value.trim()) {
            load_formula(formula_from_hash());
        }
    });
    if (input_el) {
        input_el.addEventListener('input', () => {
            still_typing = true;
            update_display();
            clearTimeout(typing_timer);
            typing_timer = setTimeout(() => {
                still_typing = false;
                update_display();
            }, TYPING_PAUSE_MS);
        });
        input_el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                add_to_history(input_el.value);
            } else if (event.key === 'Escape') {
                clear_formula();
            }
        });
    }
    const clear_el = document.getElementById('formula-clear');
    if (clear_el) {
        clear_el.addEventListener('click', clear_formula);
    }
    const history_list_el = document.getElementById('history-list');
    if (history_list_el) {
        history_list_el.addEventListener('click', (event) => {
            const btn = event.target.closest('button[data-index]');
            if (!btn) {
                return;
            }
            const index = Number(btn.dataset.index);
            if (btn.classList.contains('history-remove')) {
                remove_from_history(index);
            } else if (btn.classList.contains('history-edit')) {
                start_label_edit(index);
            } else {
                load_formula(history_entries[index].formula);
            }
        });
    }
    const history_clear_el = document.getElementById('history-clear');
    if (history_clear_el) {
        history_clear_el.addEventListener('click', () => {
            if (confirm("Clear all saved formulas?")) {
                history_entries = [];
                save_history();
                render_history();
            }
        });
    }
    for (const [id, source] of [['convert-grams', 'grams'], ['convert-moles', 'moles']]) {
        const field_el = document.getElementById(id);
        if (field_el) {
            field_el.addEventListener('input', () => {
                converter_source = source;
                update_display();
            });
        }
    }
    const details_el = document.getElementById('details-text');
    if (details_el) {
        details_el.addEventListener('click', (event) => {
            const btn = event.target.closest('.work-copy');
            if (btn) {
                copy_work(btn);
            }
        });
    }
    const problem_el = document.getElementById('formula-problem');
    if (problem_el) {
        problem_el.addEventListener('click', (event) => {
            const btn = event.target.closest('button[data-formula]');
            if (btn) {
                load_formula(btn.dataset.formula);
            }
        });
    }
    const copy_btn_el = document.getElementById('formula-copy');
    if (copy_btn_el) {
        copy_btn_el.addEventListener('click', copy_formula);
    }
    const minus_el = document.getElementById('decimal-minus');
    const plus_el = document.getElementById('decimal-plus');
    if (minus_el) {
        minus_el.addEventListener('click', () => {
            if (decimal_places > MIN_DECIMALS) {
                decimal_places -= 1;
                update_display();
            }
        });
    }
    if (plus_el) {
        plus_el.addEventListener('click', () => {
            if (decimal_places < MAX_DECIMALS) {
                decimal_places += 1;
                update_display();
            }
        });
    }
    update_display();
});