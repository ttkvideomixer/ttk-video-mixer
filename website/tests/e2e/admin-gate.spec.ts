import { test, expect } from '@playwright/test'

test.describe('Admin panel gating (no live Supabase project in this environment)', () => {
  test('redirects to login when signed out', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)admin$/)
  })

  test('redirects to login for a deep admin route too', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login\?next=/)
  })

  test('the public site never links to /admin', async ({ page }) => {
    await page.goto('/')
    const adminLinks = await page.locator('a[href^="/admin"]').count()
    expect(adminLinks).toBe(0)
  })
})
