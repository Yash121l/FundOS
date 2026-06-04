import { test, expect } from '@playwright/test'

// These smoke tests require a running server (pnpm dev) and a seeded database.
// Run with: pnpm --filter @fundos/web exec playwright test

async function checkPage(
  page: Parameters<Parameters<typeof test>[1]>[0],
  path: string,
  expectedText: RegExp
) {
  const response = await page.goto(path)
  const url = page.url()

  if (url.includes('sign-in') || url.includes('sign-up')) {
    expect(response?.status()).toBe(200)
    // Sign-in page has accessible heading
    await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible()
    // Sign-in form should contain an email field and a submit button
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible()
    await expect(page.locator('button[type="submit"], button:has-text("Sign")').first()).toBeVisible()
  } else {
    expect(response?.status()).toBe(200)
    await expect(page.getByText(expectedText).first()).toBeVisible()
    // Basic ARIA structure check — every page should have at least one landmark
    const landmarks = page.locator('[role="main"], [role="navigation"], main, nav')
    await expect(landmarks.first()).toBeVisible()
  }
}

test.describe('Dashboard', () => {
  test('loads without error', async ({ page }) => {
    await checkPage(page, '/', /portfolio|dashboard|signalos/i)
  })
})

test.describe('Portfolio', () => {
  test('portfolio page renders', async ({ page }) => {
    await checkPage(page, '/portfolio', /portfolio|companies/i)
  })
})

test.describe('Ask', () => {
  test('ask page renders with keyboard-accessible input', async ({ page }) => {
    await checkPage(page, '/ask', /ask|portfolio|intelligence/i)
    const url = page.url()
    if (!url.includes('sign-in')) {
      // Verify the textarea is present and keyboard-focusable
      const input = page.locator('textarea').first()
      await expect(input).toBeVisible()
      await input.focus()
      await expect(input).toBeFocused()
    }
  })
})

test.describe('LP Reports', () => {
  test('lp-reports page renders', async ({ page }) => {
    await checkPage(page, '/lp-reports', /lp reports|reports/i)
  })
})

test.describe('Intelligence', () => {
  test('intelligence page renders', async ({ page }) => {
    await checkPage(page, '/intelligence', /intelligence|signals|market/i)
  })
})

test.describe('Trends', () => {
  test('trends page renders', async ({ page }) => {
    await checkPage(page, '/trends', /trends|portfolio/i)
  })
})

test.describe('Mobile responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('dashboard renders on mobile', async ({ page }) => {
    await checkPage(page, '/', /portfolio|dashboard|signalos/i)
  })

  test('portfolio renders on mobile', async ({ page }) => {
    await checkPage(page, '/portfolio', /portfolio|companies/i)
  })
})
