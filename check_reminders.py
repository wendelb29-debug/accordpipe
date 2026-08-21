import asyncio
import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path("/tmp/browser/reminders/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Restore session
        session_path = os.path.expanduser("~/.cache/lovable-auth/session.json")
        if os.path.exists(session_path):
            with open(session_path) as f:
                minted = json.load(f)
            storage_key = minted["storage_key"]
            session_json = json.dumps(minted["session"])
            cookies = minted["cookies"]
            for c in cookies:
                c["url"] = "http://localhost:8080"
            await context.add_cookies(cookies)
            
            await page.goto("http://localhost:8080")
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
        
        # Navigate to a Lead Detail
        await page.goto("http://localhost:8080/atendimento")
        await page.wait_for_load_state("networkidle")
        
        # Click a workspace (Kamilla or similar if exists)
        workspace = page.locator("text=Kamilla").first
        if await workspace.is_visible():
            await workspace.click()
        else:
            await page.locator(".cursor-pointer").first.click()
            
        await page.wait_for_load_state("networkidle")
        
        # Click a lead to open detail
        await page.locator(".kanban-card").first.click()
        await page.wait_for_selector("text=Agenda")
        await page.screenshot(path=str(SCREENSHOTS / "1_lead_detail.png"))
        
        # Go to Agenda tab
        await page.click("text=Agenda")
        await page.screenshot(path=str(SCREENSHOTS / "2_agenda_tab.png"))
        
        # Check if reminder options are visible and valid
        await page.click("text=Novo agendamento")
        await page.wait_for_selector("text=Antecedência")
        
        # Validate email checkbox logic (should show email if user has one)
        email_label = await page.locator("text=E-mail").inner_text()
        print(f"Email label found: {email_label}")
        
        await page.screenshot(path=str(SCREENSHOTS / "3_new_activity_form.png"))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
