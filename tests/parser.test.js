// Parser tests. Run from the repo root with: node --test
// index.js is a browser script, so it's loaded into a VM context with just
// enough of a `document` stub for its top level to run.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { document: { addEventListener() {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8"), context);
const { parse_formula } = context;

// Molar masses from the CIAAW values in index.js, to 3 decimals.
function assert_mass(formula, expected) {
    const { mass } = parse_formula(formula);
    assert.ok(Math.abs(mass - expected) < 5e-4, `${formula}: expected ${expected}, got ${mass}`);
}

function counts(formula) {
    return Object.fromEntries(parse_formula(formula).element_counts);
}

test("simple formulas", () => {
    assert_mass("H2O", 18.015);
    assert_mass("C6H12O6", 180.156);
    assert_mass("NaCl", 58.440);
    assert_mass("O2", 31.998);
});

test("parenthesized groups", () => {
    assert_mass("Mg(OH)2", 58.319);
    assert_mass("Ca(NO3)2", 164.086);
    assert_mass("Fe2(SO4)3", 399.858);
    assert.deepEqual(counts("((CH3)3C)2O"), { C: 8, H: 18, O: 1 });
});

test("unbalanced parentheses don't throw", () => {
    assert.deepEqual(counts("H2O)"), { H: 2, O: 1 });
    assert.deepEqual(counts(")H2O"), { H: 2, O: 1 });
    assert.deepEqual(counts("H2O)3"), { H: 2, O: 1 });
    // Unclosed groups count as if closed (the running total while typing).
    assert.deepEqual(counts("Mg(OH"), { Mg: 1, O: 1, H: 1 });
    assert.deepEqual(counts("Fe2(SO4"), { Fe: 2, S: 1, O: 4 });
});

test("empty input", () => {
    const { mass, element_counts } = parse_formula("");
    assert.equal(mass, 0);
    assert.equal(element_counts.length, 0);
});

test("hydrates with any separator", () => {
    for (const formula of ["CuSO4·5H2O", "CuSO4*5H2O", "CuSO4.5H2O", "CuSO4•5H2O", "CuSO4⋅5H2O"]) {
        assert_mass(formula, 249.677);
    }
    assert_mass("MgSO4·7H2O", 246.466);
    assert_mass("Na2CO3·10H2O", 286.138);
    // Same answer as the parenthesized workaround.
    assert_mass("CuSO4(H2O)5", 249.677);
});

test("fractional hydrate coefficients", () => {
    assert_mass("CaSO4·0.5H2O", 145.142);
    assert_mass("CaSO4·½H2O", 145.142);
    assert_mass("CaSO4.0.5H2O", 145.142);
});

test("square and curly brackets", () => {
    assert.deepEqual(counts("K3[Fe(CN)6]"), { K: 3, Fe: 1, C: 6, N: 6 });
    assert_mass("K3[Fe(CN)6]", 329.248);
    assert.deepEqual(counts("[Co(NH3)6]Cl3"), { Co: 1, N: 6, H: 18, Cl: 3 });
    assert.deepEqual(counts("{[(CH3)2]2}3"), { C: 12, H: 36 });
});

test("hydrate separator display", () => {
    const { normalize_dots, formula_to_unicode } = context;
    assert.equal(normalize_dots("CuSO4.5H2O"), "CuSO4·5H2O");
    assert.equal(normalize_dots("CuSO4*5H2O"), "CuSO4·5H2O");
    assert.equal(normalize_dots("CaSO4.0.5H2O"), "CaSO4·0.5H2O");
    assert.equal(formula_to_unicode("CuSO4.5H2O"), "CuSO₄·5H₂O");
    assert.equal(formula_to_unicode("K3[Fe(CN)6]"), "K₃[Fe(CN)₆]");
});

test("unknown symbols are reported and left out of the mass", () => {
    const result = parse_formula("Xx2O");
    assert.deepEqual([...result.unknown_symbols], ["Xx"]);
    assert.ok(Math.abs(result.mass - 15.999) < 5e-4);
    assert.equal(context.is_complete_formula(result), false);
    assert.deepEqual([...parse_formula("QH2").unknown_symbols], ["Q"]);
});

test("lowercase letters are flagged", () => {
    const result = parse_formula("co2");
    assert.equal(result.has_lowercase, true);
    assert.equal(context.is_complete_formula(result), false);
    assert.equal(parse_formula("CO2").has_lowercase, false);
});

test("a half-typed trailing symbol is incomplete, not unknown", () => {
    const result = parse_formula("NaClM");
    assert.equal(result.incomplete, true);
    assert.equal(result.unknown_symbols.length, 0);
    assert.ok(Math.abs(result.mass - 58.440) < 5e-4);
    assert.equal(context.is_complete_formula(result), false);
    // "M2" and "Q" can't be the start of a symbol, so they are wrong.
    assert.deepEqual([...parse_formula("M2").unknown_symbols], ["M"]);
    assert.deepEqual([...parse_formula("Q").unknown_symbols], ["Q"]);
});

test("superheavy elements are known", () => {
    for (const sym of ["Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"]) {
        assert.equal(parse_formula(sym).unknown_symbols.length, 0, sym);
    }
});

test("capitalization suggestions", () => {
    const { suggest_capitalizations } = context;
    assert.deepEqual([...suggest_capitalizations("co2")], ["Co2", "CO2"]);
    assert.deepEqual([...suggest_capitalizations("nacl")], ["NaCl"]);
    assert.deepEqual([...suggest_capitalizations("NaCL")], ["NaCl"]);
    assert.deepEqual([...suggest_capitalizations("cuso4·5h2o")].slice(0, 1), ["CuSO4·5H2O"]);
    // Valid runs are kept as typed; only the broken run is changed.
    assert.deepEqual([...suggest_capitalizations("CO2·h2o")], ["CO2·H2O"]);
    assert.deepEqual([...suggest_capitalizations("Xx2")], []);
    // Long garbage doesn't blow up.
    assert.deepEqual([...suggest_capitalizations("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")], []);
});

test("problem messages", () => {
    const { formula_problem_html } = context;
    const message = (formula, typing = false) => formula_problem_html(formula, parse_formula(formula), typing);
    assert.match(message("Xx2"), /no element with the symbol <strong>Xx<\/strong>/);
    assert.match(message("co2"), /capital letter.*Did you mean/);
    assert.equal(message("H2O"), "");
    // "NaCL" might be "NaCLi" mid-typing: quiet while typing, explained after.
    assert.equal(message("NaCL", true), "");
    assert.match(message("NaCL", false), /symbol <strong>L<\/strong>.*data-formula="NaCl"/);
});
