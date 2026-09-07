import { test, expect } from '@playwright/test'

test.describe('Auth pages and protected routes (no live Supabase project in this environment)', () => {
  test('signup form validates password confirmation before hitting the network', async ({ page }) => {
    await page.goto('/criar-conta')
    await page.getByPlaceholder('Nome').fill('Creator Teste')
    await page.getByPlaceholder('E-mail').fill('teste@example.com')
    await page.getByPlaceholder('Senha', { exact: true }).fill('senha123')
    await page.getByPlaceholder('Confirmar senha').fill('outrasenha')
    await page.getByRole('button', { name: /Criar Minha Conta/i }).click()
    await expect(page.getByText('As senhas não coincidem.')).toBeVisible()
  })

  test('signup shows an honest "not configured" message instead of crashing when Supabase env vars are empty', async ({ page }) => {
    await page.goto('/criar-conta')
    await page.getByPlaceholder('Nome').fill('Creator Teste')
    await page.getByPlaceholder('E-mail').fill('teste@example.com')
    await page.getByPlaceholder('Senha', { exact: true }).fill('senha123')
    await page.getByPlaceholder('Confirmar senha').fill('senha123')
    await page.getByRole('button', { name: /Criar Minha Conta/i }).click()
    await expect(page.getByText(/Supabase não configurado/i)).toBeVisible()
  })

  test('onboarding quiz redirects to login when signed out', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)onboarding$/)
  })

  test('onboarding result page redirects to login when signed out', async ({ page }) => {
    await page.goto('/onboarding/resultado')
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)onboarding(%2F|\/)resultado$/)
  })

  test('login page shows Google and password options', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Continuar com Google/i })).toBeVisible()
    await expect(page.getByPlaceholder('E-mail')).toBeVisible()
    await expect(page.getByPlaceholder('Senha')).toBeVisible()
  })
})
