import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['Pixel 5'] })

test('mobile hamburger menu opens and closes', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('button', { name: /Abrir menu/i })
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(page.getByRole('button', { name: /Fechar menu/i })).toBeVisible()
  await page.getByRole('banner').getByRole('link', { name: 'Recursos' }).click()
  await expect(page).toHaveURL(/#recursos$/)
})

test('mobile sticky CTA appears after scrolling', async ({ page }) => {
  await page.goto('/')
  await page.mouse.wheel(0, 900)
  await expect(page.getByRole('link', { name: 'Testar Grátis' })).toBeVisible()
})
