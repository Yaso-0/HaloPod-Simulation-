# Parameter Source Ledger

All parameters used in the HaloPod diffusion simulation, with their sources and verification status.

## Layer Thicknesses

| Parameter | Symbol | Value | Unit | Source | Verification Status |
|-----------|--------|-------|------|--------|-------------------|
| Chitosan layer thickness | L_chi | 0.05 | normalized fraction of total | Illustrative assumption | **NOT VERIFIED** |
| Hydrogel layer thickness | L_hyd | 0.35 | normalized fraction of total | Illustrative assumption | **NOT VERIFIED** |
| Biochar layer thickness | L_bio | 0.30 | normalized fraction of total | Illustrative assumption | **NOT VERIFIED** |
| Propagule chamber size | L_cha | 0.30 | normalized fraction of total | Illustrative assumption | **NOT VERIFIED** |

## Diffusion Coefficients

| Parameter | Symbol | Value | Unit | Source | Verification Status |
|-----------|--------|-------|------|--------|-------------------|
| D_eff chitosan | D_chi | 0.3 | relative to D_water | Illustrative — general polymer membrane literature suggests reduced D | **NOT VERIFIED** for HaloPod formulation |
| D_eff hydrogel | D_hyd | 0.5 | relative to D_water | Illustrative — hydrogels typically slow diffusion vs free solution | **NOT VERIFIED** for HaloPod formulation |
| D_eff biochar composite | D_bio | 0.2 | relative to D_water | Illustrative — porous carbon may further reduce effective D | **NOT VERIFIED** for HaloPod formulation |
| D_eff chamber (aqueous) | D_cha | 0.8 | relative to D_water | Illustrative — interior is aqueous but confined | **NOT VERIFIED** |
| D_eff water (reference) | D_water | 1.0 | reference value | Normalization reference by definition | N/A |

## Environmental Parameters

| Parameter | Symbol | Value | Unit | Source | Verification Status |
|-----------|--------|-------|------|--------|-------------------|
| External salinity (default) | C_ext | 1.0 | normalized (0–1) | Normalized to reference external level | N/A (definition) |
| Tidal salinity base | C_base | 0.5 | normalized | Illustrative | NOT VERIFIED |
| Tidal amplitude | C_amp | 0.3 | normalized | Illustrative | NOT VERIFIED |
| Tidal period | T_tidal | 0.25 | normalized time | Illustrative | NOT VERIFIED |

## Numerical Parameters

| Parameter | Symbol | Value | Unit | Source | Verification Status |
|-----------|--------|-------|------|--------|-------------------|
| Grid points | N | 200 | — | Numerical convergence testing | Adequate for 1D explicit FD |
| CFL safety factor | σ | 0.4 | — | Standard practice for explicit schemes | Verified stable |
| Maximum steps | — | 50000 | — | Practical computation limit | Adequate |

## Notes

1. **All diffusion coefficients** are expressed as fractions of a reference value (D in water = 1.0) and do **not** represent measured diffusivities in m²/s for any specific ion or material.

2. **All layer thicknesses** are normalized fractions of the total capsule radius. No physical dimensions in millimetres or centimetres are assigned because no prototype has been fabricated.

3. **"NOT VERIFIED"** means no experimental measurement exists for the HaloPod-specific formulation. The chosen values are order-of-magnitude assumptions intended to demonstrate the model's behaviour, not to predict real outcomes.

4. All parameter values are **user-adjustable** in the simulation interface. Users are encouraged to explore how changing these values affects the model output.

5. **Actual values would need to be determined through**:
   - Swelling ratio measurements at multiple salinities
   - Ion diffusion experiments (Na⁺/Cl⁻ transport through fabricated capsule walls)
   - Mechanical testing of the assembled capsule
   - Biodegradation rate measurements over time

6. The relative ordering (D_biochar < D_chitosan < D_hydrogel < D_chamber < D_water) is a qualitative assumption based on general material properties, not specific measurements.
