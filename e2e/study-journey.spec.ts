import { expect, test } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
}

test('a student can register, build a deck, study it and see analytics', async ({ page }) => {
  await page.goto('/register');

  await page.getByLabel('Name').fill('E2E Student');
  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByLabel('Password').fill('super-secret-1');
  await page
    .getByRole('main')
    .getByRole('button', { name: /create account/i })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'My decks' })).toBeVisible();

  await page.getByRole('button', { name: /new deck/i }).click();
  const deckDialog = page.getByRole('dialog');
  await deckDialog.getByLabel('Title').fill('E2E Biology');
  await deckDialog.getByLabel('Subject').fill('Biology');
  await deckDialog.getByRole('button', { name: /create deck/i }).click();

  await expect(page.getByText('E2E Biology')).toBeVisible();
  await page.getByText('E2E Biology').click();

  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: /add card/i }).click();

  const cardDialog = page.getByRole('dialog');
  await cardDialog.getByLabel('Front').fill('What is mitosis?');
  await cardDialog.getByLabel('Back').fill('Cell division');
  await cardDialog.getByRole('button', { name: /^add card$/i }).click();

  await expect(page.getByText('What is mitosis?')).toBeVisible();

  await page.getByRole('link', { name: 'Study' }).click();

  await expect(page.getByText('What is mitosis?')).toBeVisible();
  await page.getByRole('button', { name: /show answer/i }).click();
  await expect(page.getByText('Cell division')).toBeVisible();
  await page.getByRole('button', { name: /good/i }).click();

  await page.getByRole('button', { name: /finish session/i }).click();
  await expect(page.getByText('Session complete')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();

  await page.getByRole('link', { name: 'Analytics' }).click();

  await expect(page.getByRole('heading', { name: 'Study analytics' })).toBeVisible();
  await expect(page.getByText('1 day')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();
  await expect(page.getByText('Next 7 days')).toBeVisible();
});
