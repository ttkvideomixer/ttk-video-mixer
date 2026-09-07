import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('renders hero, primary CTA and combination counter', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Grave 30 partes/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Testar 27 Vídeos Grátis/i }).first()).toHaveAttribute('href', '/criar-conta')
    await expect(page.getByText('1.000', { exact: false }).first()).toBeVisible()
  })

  test('header Começar Grátis and Entrar links work', async ({ page }) => {
    await page.goto('/')

    const hamburger = page.getByRole('button', { name: /Abrir menu/i })
    if (await hamburger.isVisible()) await hamburger.click()
    await page.getByRole('link', { name: 'Começar Grátis' }).first().click()
    await expect(page).toHaveURL(/\/criar-conta$/)

    await page.goBack()
    if (await hamburger.isVisible()) await hamburger.click()
    await page.getByRole('link', { name: 'Entrar' }).first().click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('calculator updates combinations instantly', async ({ page }) => {
    await page.goto('/')
    const sliders = page.locator('#recursos ~ * input[type="range"], input[type="range"]')
    await expect(sliders.first()).toBeVisible()
    const initial = await page.getByText(/combinações$/).first().textContent()
    await sliders.first().fill('2')
    await expect(page.getByText(/combinações$/).first()).not.toHaveText(initial ?? '')
  })

  test('FAQ accordion opens and closes an answer', async ({ page }) => {
    await page.goto('/')
    const question = page.getByRole('button', { name: /O que é o TTK VIDEO MIXER/i })
    await question.scrollIntoViewIfNeeded()
    await question.click()
    await expect(page.getByText(/combinar automaticamente Ganchos, Corpos e CTAs/i)).toBeVisible()
    await question.click()
    await expect(page.getByText(/combinar automaticamente Ganchos, Corpos e CTAs/i)).toBeHidden()
  })

  test('footer links resolve without 404', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Termos' }).click()
    await expect(page.getByRole('heading', { name: 'Termos de Uso' })).toBeVisible()
    await page.goto('/')
    await page.getByRole('link', { name: 'Privacidade' }).click()
    await expect(page.getByRole('heading', { name: 'Política de Privacidade' })).toBeVisible()
  })

  test('unknown route shows the custom 404 page', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByRole('link', { name: /Voltar ao TTK VIDEO MIXER/i })).toBeVisible()
  })

  test('no horizontal overflow at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(hasOverflow).toBe(false)
  })
})
