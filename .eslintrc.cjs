module.exports = {
  root: true,
  env: { node: true, es2022: true, browser: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module', ecmaVersion: 2022, ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  settings: { react: { version: 'detect' } },
  // supabase/functions runs on Deno (its own runtime, its own `deno lint` /
  // `deno check`), not on our Node/Vite toolchain — it uses `npm:`/`.ts`
  // Deno-style specifiers and Deno globals (`Deno.serve`) that this
  // Node-oriented config isn't meant to understand.
  ignorePatterns: ['out', 'release', 'node_modules', '*.cjs', 'supabase/functions/**'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  }
}
