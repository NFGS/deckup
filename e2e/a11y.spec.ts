import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_IMPACTS = ['serious', 'critical'];

for (const path of ['/', '/login', '/register']) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blocking = results.violations.filter((violation) =>
      BLOCKING_IMPACTS.includes(violation.impact ?? ''),
    );

    expect(
      blocking.map((violation) => `${violation.id}: ${violation.help}`),
      'Serious or critical accessibility violations found',
    ).toEqual([]);
  });
}
