# Molar Mass Calculator

Calculates the molar mass of a chemical formula _as you type it_.

![Demo](./demo.gif)

## Features

- **Real-time calculation** — results update on every keystroke
- **Parentheses and brackets** — handles nested groups like `Mg(OH)2`, `Fe2(SO4)3` and `K3[Fe(CN)6]`
- **Hydrates** — `CuSO4·5H2O`, also typed as `CuSO4.5H2O` or `CuSO4*5H2O`; fractional coefficients like `CaSO4·0.5H2O` work too
- **Typo help** — unknown symbols (`Xx`) and miscapitalized formulas (`co2`, `NaCL`) are explained, with clickable fixes: _Did you mean Co₂ or CO₂?_
- **Grams ⇄ moles** — type a mass to get moles or an amount to get grams, at the current molar mass (4 significant figures); the value you typed is kept when the formula changes
- **Copy work** — copies the calculation as a line for a worksheet: `H₂O: 2(1.01) + 16.00 = 18.02 g/mol`. It's summed from the rounded atomic masses shown, the way it adds up by hand
- **Shareable links** — the formula is kept in the page address (`…/#Fe2(SO4)3`), so a link opens with the calculation already done
- **Detailed breakdown** — shows each element, its atomic mass, count, and contribution to the total
- **Atomic mass reference** — values sourced from IUPAC, displayed per element
- **Adjustable precision** — decimals stepper rounds displayed values (math stays full-precision)
- **Subscript display + copy** — rendered formula with one-click Unicode-subscript copy for documents
- **Mass-percent breakdown** — each element's share of the total, with proportional bars
- **Clear button** — the × in the input (or Esc) empties it for the next formula
- **History** — press Enter (or clear) to save a result; click a saved formula to load it again, or ✎ to label it ("glucose", "Problem 3"). Kept in the browser between visits

## Usage

Type a chemical formula into the input field. Examples:

| Formula | Mass |
|---------|------|
| `H2O` | 18.0150 |
| `Mg(OH)2` | 58.3190 |
| `Ca(NO3)2` | 164.0860 |
| `Fe2(SO4)3` | 399.8580 |
| `C6H12O6` | 180.1560 |

## Tests

Parser tests use Node's built-in test runner (no dependencies). From the repo root:

```bash
node --test
```
