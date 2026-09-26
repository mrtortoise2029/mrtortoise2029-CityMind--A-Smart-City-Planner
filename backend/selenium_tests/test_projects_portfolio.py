import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE_URL = "http://127.0.0.1:5173"

EMAIL = "planner@citymind.local"
PASSWORD = "CityMindDemo123!"

WAIT_TIME = 20


class ProjectPortfolioTest(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.maximize_window()

        self.wait = WebDriverWait(
            self.driver,
            WAIT_TIME
        )

        self.driver.get(BASE_URL)

    def tearDown(self):
        self.driver.quit()

    def test_project_portfolio(self):

        # Locate login fields
        email = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "input[type='email']")
            )
        )

        password = self.driver.find_element(
            By.CSS_SELECTOR,
            "input[type='password']"
        )

        # Login
        email.send_keys(EMAIL)
        password.send_keys(PASSWORD)

        self.driver.find_element(
            By.CSS_SELECTOR,
            "button.auth-submit"
        ).click()

        # Wait for project portfolio
        self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h1[normalize-space()='My Development Projects']"
                )
            )
        )

        # Find project cards
        project_cards = self.wait.until(
            EC.presence_of_all_elements_located(
                (
                    By.CSS_SELECTOR,
                    "article.planning-project-card"
                )
            )
        )

        # Verify at least two projects are displayed
        self.assertGreaterEqual(
            len(project_cards),
            2
        )

        # Get page text
        page_text = self.driver.find_element(
            By.TAG_NAME,
            "body"
        ).text

        # Verify Bashundhara project
        self.assertIn(
            "Bashundhara Residential Area",
            page_text
        )

        # Verify United City project
        self.assertIn(
            "United City",
            page_text
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)