import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.LEGION_ADMIN_EMAIL ?? "admin@gmail.com";
const ADMIN_PASSWORD = process.env.LEGION_ADMIN_PASSWORD;

// Smoke: login form renders, admin sign-in routes to /admin and key tiles show.
// Skips automatically if no admin password env var is set so CI doesn't fail
// without credentials.
test.describe("admin smoke", () => {
  test.skip(
    !ADMIN_PASSWORD,
    "Set LEGION_ADMIN_PASSWORD to run the admin smoke test"
  );

  test("login → dashboard", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();

    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/admin(?:$|\?|\/)/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();
    await expect(page.getByText(/total members/i)).toBeVisible();
  });
});

test("login form is reachable without auth", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: /welcome back/i })
  ).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
});
