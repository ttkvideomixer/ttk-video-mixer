import { test, expect } from '@playwright/test'

test.describe('Download page', () => {
  test('shows the real local Windows installer as available (dev fallback) and macOS as not yet published', async ({ page }) => {
    await page.goto('/download')
    await expect(page.getByRole('heading', { name: /Baixe o TTK VIDEO MIXER/i })).toBeVisible()

    await expect(page.getByRole('button', { name: /Baixar para Windows/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Em breve' })).toBeVisible()
    await expect(page.getByText(/Ainda não publicamos uma build estável para macOS/i)).toBeVisible()
  })

  test('clicking Baixar para Windows actually starts a real file download', async ({ page }) => {
    await page.goto('/download')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Baixar para Windows/i }).click()
    ])
    expect(download.suggestedFilename().toLowerCase()).toContain('.exe')
  })

  test('install instructions are present for both platforms', async ({ page }) => {
    await page.goto('/download')
    await expect(page.getByRole('heading', { name: 'Como instalar no Windows' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Como instalar no macOS' })).toBeVisible()
  })
})
