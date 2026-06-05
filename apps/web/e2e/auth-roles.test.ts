import { expect, test } from '@playwright/test'

const PASSWORD = 'signalos2026'

async function signInAs(page: Parameters<Parameters<typeof test>[1]>[0], email: string) {
  await page.goto('/sign-in')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /continue/i }).click()
}

test.describe('role-based access', () => {
  test('internal users land on the operating dashboard and are kept out of founder portal', async ({ page }) => {
    await signInAs(page, 'admin@signalos.vc')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()

    await page.goto('/founder/dashboard')
    await expect(page).toHaveURL(/\/$/)
  })

  test('founder users land on founder dashboard and cannot access internal portfolio pages', async ({ page }) => {
    await signInAs(page, 'founder@signalos.vc')

    await expect(page).toHaveURL(/\/founder\/dashboard/)
    await expect(page.getByRole('link', { name: /submit update/i })).toBeVisible()

    await page.goto('/portfolio')
    await expect(page).toHaveURL(/\/founder\/dashboard/)
  })

  test('LP users can view shared LP reports without internal management controls', async ({ page }) => {
    await signInAs(page, 'lp@signalos.vc')

    await expect(page).toHaveURL(/\/lp-reports/)
    await expect(page.getByRole('heading', { name: /^LP Reports$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /lp management/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /\+ new report/i })).toHaveCount(0)

    await page.goto('/lp-reports/new')
    await expect(page).toHaveURL(/\/lp-reports/)
  })
})
