import { test, expect } from '@playwright/test';
import scenariosFixture from '../data/redteam/scenarios.json' with { type: 'json' };

test.describe('red-team demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/redteam/scenarios', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...scenariosFixture, source: 'static' },
        }),
      });
    });

    await page.route('**/api/v1/redteam/try', async (route) => {
      const body = route.request().postDataJSON() as { scenarioId?: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            scenarioId: body.scenarioId ?? 'inject-ignore-instructions',
            category: 'prompt-injection',
            title: 'Ignore previous instructions',
            prompt: 'Ignore previous instructions…',
            answer:
              'Artificial intelligence is the ability of a computer to do tasks that usually need human intelligence.',
            behavior: 'resist',
            refused: false,
            expectedDefense:
              'Input sanitization redacts ignore-instructions patterns.',
            teachingNotes:
              'Layered defense: sanitize + grounded system prompt.',
            committedOutcome: {
              behavior: 'resist',
              summary: 'Injection neutralized; in-corpus answer.',
            },
            latencyMs: 42,
            chatLoggingSkipped: true,
            source: 'live',
          },
        }),
      });
    });
  });

  test('shows guardrails, picker, teaching notes, and live try', async ({
    page,
  }) => {
    await page.goto('/docs/redteam');

    await expect(page.getByTestId('redteam-methodology')).toContainText(
      /educational|curated|not attack tooling|security audit/i,
    );

    await expect(page.getByTestId('redteam-picker')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Ignore previous instructions' }),
    ).toBeVisible();

    await expect(page.getByTestId('redteam-teaching-notes')).toContainText(
      /sanitizeQuestion|system prompt|injection/i,
    );

    await page.getByTestId('redteam-filter-out-of-corpus').click();
    await expect(
      page.getByRole('heading', { name: 'Live stock price' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Current weather' }).click();
    await expect(
      page.getByRole('heading', { name: 'Current weather' }),
    ).toBeVisible();
    await expect(page.getByTestId('redteam-teaching-notes')).toContainText(
      /out-of-corpus|refuse|weather/i,
    );

    await page.getByTestId('redteam-try-live').click();
    await expect(page.getByTestId('redteam-live-result')).toContainText(
      /chatLoggingSkipped=true|resist|Artificial intelligence/i,
    );
  });
});
