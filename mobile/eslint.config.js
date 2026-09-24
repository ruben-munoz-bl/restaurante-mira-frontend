// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
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
