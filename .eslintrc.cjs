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
  // Node-oriented config isn't meant to understand. website/ is its own
  // Next.js project with its own package.json, node_modules and eslintrc
  // (extending next/core-web-vitals) — it lints itself, and this root config
  // can't resolve that config unless website's deps are installed too.
  ignorePatterns: ['out', 'release', 'node_modules', '*.cjs', 'supabase/functions/**', 'website/**'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  }
}
