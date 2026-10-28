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
