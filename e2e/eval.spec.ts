import { test, expect } from '@playwright/test';
import reportFixture from '../data/eval/report.json' with { type: 'json' };

test.describe('corpus browser', () => {
  test('shows static corpus list without API', async ({ page }) => {
    await page.goto('/docs/corpus');
    await expect(
      page.getByRole('heading', { name: 'Demo Corpus' }),
    ).toBeVisible();
    await expect(page.getByText(/curated articles/i)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Alan Turing/i }),
    ).toBeVisible();
  });
});

test.describe('eval reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/eval/report', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: reportFixture,
        }),
      });
    });
  });

  test('shows methodology limits, scores, and failures', async ({ page }) => {
    await page.goto('/docs/eval');

    await expect(page.getByTestId('eval-methodology')).toContainText(
      /demo-scale|methodology|quality claims/i,
    );
    await expect(
      page.getByRole('heading', { name: 'Retrieval relevance' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Faithfulness' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Groundedness' }),
    ).toBeVisible();
    await expect(page.getByText(/Does not mean:/i).first()).toBeVisible();

    await expect(page.getByTestId('eval-fail-count')).toContainText('5 fail');
    await expect(page.getByTestId('eval-failures-banner')).toBeVisible();

    const failureCase = page.getByTestId('eval-case-darwin');
    await expect(failureCase).toHaveAttribute('data-pass', 'false');
    await failureCase.getByRole('button').click();
    await expect(failureCase).toContainText(
      /unfaithful|FAILURE EXAMPLE|telephone/i,
    );
  });
});
