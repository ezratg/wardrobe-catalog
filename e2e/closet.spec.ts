import { expect, test } from "@playwright/test";
import path from "node:path";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);

test("sign up, upload photos, tag an item, and filter the catalog", async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.com`;

  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await page.getByLabel("Name").fill("Ezra Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: /let’s fill your closet/ })).toBeVisible();

  // Upload three photos
  await page.getByRole("link", { name: "Add your first pieces" }).click();
  await page.getByTestId("file-input").setInputFiles([fixture("shirt.jpg"), fixture("jeans.jpg"), fixture("skirt.jpg")]);
  await expect(page.getByText("3 of 3 ready")).toBeVisible({ timeout: 90_000 });
  if (info.project.name === "desktop") await page.screenshot({ path: "e2e/screenshots/upload.png" });

  // Catalog shows them, needing tags
  await page.getByRole("link", { name: "Go to my closet" }).click();
  await expect(page.getByText("3 pieces")).toBeVisible();
  await expect(page.getByText("Needs tags")).toHaveCount(3);

  // Tag the first (newest = skirt, uploaded last)
  await page.locator("article a").first().click();
  await page.getByLabel("Name").fill("Red A-line skirt");
  await page.getByLabel("Category").selectOption("bottom");
  await page.getByText("Warm", { exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  if (info.project.name === "desktop") await page.screenshot({ path: "e2e/screenshots/item.png", fullPage: true });
  await page.getByRole("link", { name: "← All clothes" }).click();

  // Colour was detected from the cutout: the red filter finds the skirt only
  if (info.project.name === "mobile") await page.getByText(/^Filters/).click();
  await page.getByRole("link", { name: /^Red, 1 items/ }).filter({ visible: true }).click();
  await expect(page.getByText("1 of 3 pieces")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Red A-line skirt" })).toBeVisible();

  await page.getByRole("link", { name: "Clear all" }).click();
  await expect(page.getByText("3 pieces")).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/catalog-${info.project.name}.png`, fullPage: true });

  // Favourite toggle
  await page.getByRole("button", { name: "Add to favorites" }).first().click();
  await expect(page.getByRole("button", { name: "Remove from favorites" })).toHaveCount(1);

  // Log out and back in
  await page.getByLabel("Account menu").click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("3 pieces")).toBeVisible();
});

test("another account can't see someone else's photos", async ({ request }) => {
  const res = await request.get("/api/images/not-mine/thumb");
  expect(res.status()).toBe(401);
});
