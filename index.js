let decimal_places = 2;
const MIN_DECIMALS = 0;
// Display cap: stored weights carry up to 9 decimals (phosphorus), but past 6
// the readout is noise for a teaching tool.
const MAX_DECIMALS = 6;

// Standard atomic weights at full published precision, CIAAW/IUPAC 2024
// (https://ciaaw.org/atomic-weights.htm). Interval elements use the abridged
// (conventional) single value. Elements with no standard weight
// (Tc, Pm, Po, At, Rn, Fr, Ra, Ac, Np-Mt) carry a representative mass number.
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
    "Mt": 268
}

// Elements with no CIAAW standard weight; the map carries a representative mass number.
const placeholder_mass_numbers = new Set([
    "Tc", "Pm", "Po", "At", "Rn", "Fr", "Ra", "Ac",
    "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md",
    "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt"
]);

// Current formula text, shared by the display update and the copy button.
let molecular_formula;

// Saved formulas, most recent first. Only formulas are stored; masses are
// recomputed on render so they follow the decimals control.
const HISTORY_KEY = "molwt-history";
const MAX_HISTORY = 50;
let history_formulas = load_history();
// Formula to flash in the history list on its next render.
let just_saved_formula = null;

function load_history() {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
        return Array.isArray(saved) ? saved.filter(f => typeof f === "string") : [];
    } catch (e) {
        return [];
    }
}

function save_history() {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history_formulas));
    } catch (e) {
        // Storage unavailable (private window, blocked site data): history lasts this page load only.
    }
}

// Put a formula at the top of the history, moving it up if it's already there.
// Blanks and formulas that don't compute (unknown symbols, lowercase) are skipped.
function add_to_history(formula) {
    formula = (formula || "").trim();
    if (!formula) {
        return;
    }
    const { mass } = parse_formula(formula);
    if (!Number.isFinite(mass) || mass <= 0) {
        return;
    }
    history_formulas = [formula, ...history_formulas.filter(f => f !== formula)].slice(0, MAX_HISTORY);
    just_saved_formula = formula;
    save_history();
    render_history();
}

function remove_from_history(index) {
    history_formulas.splice(index, 1);
    save_history();
    render_history();
}

function render_history() {
    const list_el = document.getElementById('history-list');
    const empty_el = document.getElementById('history-empty');
    const clear_all_el = document.getElementById('history-clear');
    if (!list_el) {
        return;
    }
    const current = (molecular_formula || "").trim();
    list_el.innerHTML = history_formulas.map((formula, index) => {
        const { mass } = parse_formula(formula);
        const classes = [
            formula === current ? "current" : "",
            formula === just_saved_formula ? "just-saved" : ""
        ].join(" ").trim();
        return `<li class="${classes}">
            <button class="history-load" type="button" data-index="${index}" title="Load ${escape_html(formula)}">
                <span class="history-formula">${render_formula_html(formula)}</span>
                <span class="history-mass">${mass.toFixed(decimal_places)}</span>
            </button>
            <button class="history-remove" type="button" data-index="${index}" aria-label="Remove ${escape_html(formula)}">×</button>
        </li>`;
    }).join("");
    just_saved_formula = null;
    if (empty_el) {
        empty_el.hidden = history_formulas.length > 0;
    }
    if (clear_all_el) {
        clear_all_el.hidden = history_formulas.length === 0;
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
    update_display();
    input_el.focus();
}

function escape_html(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Render a formula with subscript counts: H2SO4 -> H<sub>2</sub>SO<sub>4</sub>
function render_formula_html(formula) {
    return escape_html(formula).replace(/([A-Za-z)])(\d+)/g, "$1<sub>$2</sub>");
}

const UNICODE_SUBSCRIPTS = {"0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉"};

// Plain-text formula with Unicode subscripts for pasting into documents: H2SO4 -> H₂SO₄
function formula_to_unicode(formula) {
    return formula.replace(/([A-Za-z)])(\d+)/g, (match, pre, digits) =>
        pre + [...digits].map(d => UNICODE_SUBSCRIPTS[d]).join(""));
}

// Copy the rendered formula (Unicode subscripts) to the clipboard
async function copy_formula() {
    const text = formula_to_unicode(molecular_formula || "");
    if (!text) {
        return;
    }
    const btn = document.getElementById('formula-copy');
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
    if (btn) {
        btn.textContent = ok ? "Copied!" : "Copy failed";
        setTimeout(() => { btn.textContent = "Copy"; }, 1200);
    }
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
    return `<table class="detail-grid">${rows}</table>
        <div class="detail-source">Atomic masses from <a href="https://www.ciaaw.org/atomic-weights.htm" target="_blank" rel="noopener">IUPAC</a>${placeholder_note}</div>`
};
// Count atoms with a stack of element->count tallies, one per open parenthesis:
// each ")" group multiplies out and folds into its parent, so Mg(OH)2 and
// Fe2(SO4)3 accumulate correctly no matter how deeply groups nest.
// Returns the total mass plus the per-element [symbol, count] pairs.
function parse_formula(formula) {
    const stack = [{}];
    let i = 0;

    while (i < formula.length) {
        const ch = formula[i];
        if (ch === '(') {
            stack.push({});
            i++;
        } else if (ch === ')') {
            i++;
            let digits = '';
            while (i < formula.length && /[0-9]/.test(formula[i])) {
                digits += formula[i];
                i++;
            }
            // Unmatched ")" (a typo like "H2O)"): ignore it and its multiplier
            // rather than popping the root tally.
            if (stack.length === 1) {
                continue;
            }
            const multiplier = digits ? parseInt(digits) : 1;
            const group = stack.pop();
            const parent = stack[stack.length - 1];
            for (const sym in group) {
                parent[sym] = (parent[sym] || 0) + group[sym] * multiplier;
            }
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
            const count = digits ? parseInt(digits) : 1;
            const top = stack[stack.length - 1];
            top[sym] = (top[sym] || 0) + count;
        } else {
            i++;
        }
    }

    // Unclosed "(" (mid-typing "Mg(OH"): fold open groups in as if closed,
    // so the running total doesn't drop them.
    while (stack.length > 1) {
        const group = stack.pop();
        const parent = stack[stack.length - 1];
        for (const sym in group) {
            parent[sym] = (parent[sym] || 0) + group[sym];
        }
    }

    const counts = stack[0];
    const element_counts = [];
    let mass = 0;
    for (const sym in counts) {
        const count = counts[sym];
        element_counts.push([sym, count]);
        mass += element_mass_map[sym] * count;
    }
    return { mass, element_counts };
}

function update_display() {
    const input_el = document.getElementById('mol-formula');

    // Read the formula, recompute from full-precision weights, repaint everything.
    molecular_formula = input_el ? input_el.value : molecular_formula;
    const { mass, element_counts } = parse_formula(molecular_formula || "");
    const details_txt = details_html(element_counts, mass);

    document.getElementById('output-text').innerHTML = mass.toFixed(decimal_places);
    document.getElementById('details-text').innerHTML = details_txt;

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
}

document.addEventListener('DOMContentLoaded', () => {
    const input_el = document.getElementById('mol-formula');
    if (input_el) {
        input_el.addEventListener('input', update_display);
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
            } else {
                load_formula(history_formulas[index]);
            }
        });
    }
    const history_clear_el = document.getElementById('history-clear');
    if (history_clear_el) {
        history_clear_el.addEventListener('click', () => {
            if (confirm("Clear all saved formulas?")) {
                history_formulas = [];
                save_history();
                render_history();
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