import { expect, test } from '@playwright/test';

test('home page renders the DeckUp landing', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'DeckUp' })).toBeVisible();
  await expect(page.getByText('Custom decks')).toBeVisible();
});
