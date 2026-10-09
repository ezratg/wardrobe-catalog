import { expect, test } from "@playwright/test";
import path from "node:path";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);

test("sign up, upload photos, tag an item, and filter the catalog", async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.com`;

  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await page.getByLabel("Name").filter({ visible: true }).fill("Ezra Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: /let’s fill your closet/ })).toBeVisible();

  // Upload three photos
  await page.getByRole("link", { name: "Add your first pieces" }).click();
  await page.getByTestId("file-input").setInputFiles([fixture("shirt.jpg"), fixture("jeans.jpg"), fixture("skirt.jpg")]);
  await expect(page.getByText("3 of 3 ready")).toBeVisible({ timeout: 90_000 });
  if (info.project.name === "desktop") await page.screenshot({ path: "e2e/screenshots/upload.png" });

  // Auto-tagging named and categorised every piece
  await expect(page.getByRole("link", { name: "Blue T-shirt" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Black jeans" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Red skirt" })).toBeVisible();
  await page.getByRole("link", { name: "Go to my closet" }).click();
  await expect(page.getByText("3 pieces", { exact: true })).toBeVisible();
  await expect(page.getByText("Needs tags")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Tops\s*1$/, includeHidden: true }).first()).toBeAttached();
  await expect(page.getByRole("link", { name: /^Bottoms\s*2$/, includeHidden: true }).first()).toBeAttached();

  // Review the auto tags on the skirt and adjust them
  await page.locator("article a").first().click();
  await expect(page.getByText("These tags were filled in automatically")).toBeVisible();
  await expect(page.getByLabel("Category").filter({ visible: true })).toHaveValue("bottom");
  await expect(page.getByLabel("Name").filter({ visible: true })).toHaveValue("Red skirt");
  await page.getByLabel("Name").filter({ visible: true }).fill("Red A-line skirt");
  await page.getByText("Warm", { exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ visible: true })).toHaveText("Saved");
  if (info.project.name === "desktop") await page.screenshot({ path: "e2e/screenshots/item.png", fullPage: true });
  await page.getByRole("link", { name: "← All clothes" }).click();

  // Colour was detected from the cutout: the red filter finds the skirt only
  if (info.project.name === "mobile") await page.getByText(/^Filters/).click();
  await page.getByRole("link", { name: /^Red, 1 items/ }).filter({ visible: true }).click();
  await expect(page.getByText("1 of 3 pieces", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Red A-line skirt" })).toBeVisible();

  await page.getByRole("link", { name: "Clear all" }).click();
  await expect(page.getByText("3 pieces", { exact: true })).toBeVisible();

  // The two unchecked pieces can be re-detected; the reviewed skirt is left alone
  const unchecked = page.getByText("2 pieces were tagged automatically and not checked yet.");
  await expect(unchecked).toBeVisible();
  await page.getByRole("button", { name: "Detect their tags again" }).click();
  await expect(unchecked).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Blue T-shirt" }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Red A-line skirt" })).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/catalog-${info.project.name}.png`, fullPage: true });

  // Favourite toggle
  await page.getByRole("button", { name: "Add to favorites" }).first().click();
  await expect(page.getByRole("button", { name: "Remove from favorites" })).toHaveCount(1);

  // Rename the shirt
  await page.getByRole("link", { name: "Blue T-shirt" }).filter({ visible: true }).first().click();
  await page.getByLabel("Name").filter({ visible: true }).fill("Blue tee");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ visible: true })).toHaveText("Saved");

  // Suggestions: "Style it" builds around this piece
  await page.getByRole("link", { name: "Style it" }).click();
  await expect(page.getByText("Built around")).toBeVisible();
  const suggestion = page.getByTestId("suggestion").first();
  await expect(suggestion.getByAltText("Blue tee")).toBeVisible();
  await expect(suggestion.getByText("Add shoes")).toBeVisible();
  await expect(page.getByTestId("suggestion")).toHaveCount(2); // with the skirt, and with the jeans
  if (info.project.name === "desktop") await page.screenshot({ path: "e2e/screenshots/suggest.png", fullPage: true });
  await suggestion.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Outfit idea 1" })).toBeVisible();
  await page.getByRole("button", { name: "Wearing this today" }).click();
  await expect(page.getByText(/Last worn/)).toBeVisible();

  // Manual builder
  await page.getByRole("link", { name: "Outfits", exact: true }).click();
  await page.getByRole("link", { name: "Build an outfit" }).click();
  await page.getByRole("tab", { name: "Tops" }).click();
  await page.getByRole("button", { name: "Blue tee" }).click();
  await page.getByRole("tab", { name: "Bottoms" }).click();
  await page.getByRole("button", { name: "Red A-line skirt" }).click();
  await expect(page.getByText("One pop of red against neutrals").or(page.getByText(/blue and red|red and blue/i)).first()).toBeVisible();
  await page.getByLabel("Name").filter({ visible: true }).fill("Weekend");
  await page.getByRole("button", { name: "Save outfit" }).click();
  await expect(page.getByRole("heading", { name: "Weekend" })).toBeVisible();
  if (info.project.name === "desktop") await page.screenshot({ path: "e2e/screenshots/builder.png", fullPage: true });
  await page.getByRole("link", { name: "← Outfits" }).click();
  await expect(page.getByRole("link", { name: /Weekend/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Outfit idea 1/ })).toBeVisible();
  if (info.project.name === "desktop") await page.screenshot({ path: "e2e/screenshots/outfits.png", fullPage: true });

  // Log out and back in
  await page.getByLabel("Account menu").click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("3 pieces", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Outfits", exact: true }).click();
  await expect(page.getByRole("link", { name: /Weekend/ })).toBeVisible();
});

test("another account can't see someone else's photos", async ({ request }) => {
  const res = await request.get("/api/images/not-mine/thumb");
  expect(res.status()).toBe(401);
});
