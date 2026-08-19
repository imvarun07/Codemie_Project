const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const TEST_DB = path.join(__dirname, '..', 'backend', 'test.sqlite');

test.beforeAll(() => {
  try { fs.unlinkSync(TEST_DB); } catch {}
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows empty state when no books exist', async ({ page }) => {
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#books-table')).toHaveClass(/hidden/);
});

test('adds a valid book and shows it in the list', async ({ page }) => {
  await page.fill('#title', 'The Great Gatsby');
  await page.fill('#author', 'F. Scott Fitzgerald');
  await page.fill('#year', '1925');
  await page.click('button[type="submit"]');

  await expect(page.locator('#books-body tr')).toHaveCount(1);
  await expect(page.locator('#books-body tr td').first()).toHaveText('The Great Gatsby');
  await expect(page.locator('#empty')).toHaveClass(/hidden/);
});

test('shows validation error for empty title', async ({ page }) => {
  await page.fill('#title', '');
  await page.fill('#author', 'Someone');
  await page.fill('#year', '2024');
  await page.evaluate(() => {
    document.getElementById('title').removeAttribute('required');
  });
  await page.click('button[type="submit"]');

  await expect(page.locator('#error')).not.toHaveClass(/hidden/);
});

test('deletes a book and shows empty state', async ({ page }) => {
  await page.fill('#title', 'Book to Delete');
  await page.fill('#author', 'Author');
  await page.fill('#year', '2023');
  await page.click('button[type="submit"]');
  await expect(page.locator('#books-body tr')).toHaveCount(1);

  await page.click('.delete-btn');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#books-body tr')).toHaveCount(0);
});
