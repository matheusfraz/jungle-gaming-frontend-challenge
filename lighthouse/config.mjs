/** Mobile profile: Lighthouse defaults (Moto G Power, slow 4G, 4x CPU, simulated throttling). */
export default {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    throttlingMethod: 'simulate',
  },
}
