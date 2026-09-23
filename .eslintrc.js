module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Screens intentionally use effect-driven API refreshes and fire-and-forget
    // mutations; keep these reviewable without making the build fail on them.
    'react-hooks/exhaustive-deps': 'warn',
    'no-void': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
  },
};
