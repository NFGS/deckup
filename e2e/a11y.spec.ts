import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const BLOCKING_IMPACTS = ['serious', 'critical'];

async function expectNoBlockingViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = results.violations.filter((violation) =>
    BLOCKING_IMPACTS.includes(violation.impact ?? ''),
  );

  expect(
    blocking.map((violation) => `${violation.id}: ${violation.help}`),
    `Serious or critical accessibility violations found on ${label}`,
  ).toEqual([]);
}

for (const path of ['/', '/login', '/register']) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expectNoBlockingViolations(page, path);
  });
}

test('authenticated screens and dialogs have no serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/register');

  await page.getByLabel('Name').fill('A11y Student');
  await page
    .getByLabel('Email')
    .fill(`a11y-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`);
  await page.getByLabel('Password').fill('super-secret-1');
  await page
    .getByRole('main')
    .getByRole('button', { name: /create account/i })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expectNoBlockingViolations(page, '/dashboard');

  await page.getByRole('button', { name: /new deck/i }).click();
  const deckDialog = page.getByRole('dialog');
  await deckDialog.getByLabel('Title').fill('A11y deck');
  await deckDialog.getByRole('button', { name: /create deck/i }).click();
  await page.getByText('A11y deck').click();

  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]+$/);
  await expectNoBlockingViolations(page, 'deck detail');

  await page.getByRole('button', { name: /add card/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoBlockingViolations(page, 'card dialog');
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Study analytics' })).toBeVisible();
  await expectNoBlockingViolations(page, '/analytics');

  await page.getByRole('link', { name: 'Account' }).click();
  await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible();
  await expectNoBlockingViolations(page, '/account');
});
