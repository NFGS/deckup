export default {
  '*.{ts,tsx}': ['eslint --fix --no-warn-ignored', 'prettier --write'],
  '*.{js,mjs,cjs,json,md,yml,yaml,css,html}': ['prettier --write'],
};
