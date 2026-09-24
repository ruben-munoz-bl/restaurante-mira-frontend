// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Copias literales del web aún sin migrar a RN (fases 3–10):
      'src/components/Cuenta.jsx',
      'src/components/Favoritos.jsx',
      'src/components/LibroCarta.jsx',
      'src/components/Login.jsx',
      'src/components/Negocio.jsx',
      'src/components/Registro.jsx',
      'src/components/RestaurantDetail.jsx',
      'src/components/dashboard/**',
      'src/components/ops/**',
      'src/components/points/**',
      'src/components/promotions/**',
      'src/components/tickets/**',
      'src/pages/**',
      'src/data/**',
      'src/models/**',
      'src/styles/**',
    ],
  },
  {
    // Código portado del web: patrón data-fetching con setState en effect.
    // Se relajan reglas del React Compiler; se mantienen hooks/undef.
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
]);
