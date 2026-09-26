import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = "http://127.0.0.1:5173"
EMAIL = "planner@citymind.local"
PASSWORD = "CityMindDemo123!"
WAIT_TIME = 30


class GapAnalysisTest(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.maximize_window()
        self.wait = WebDriverWait(self.driver, WAIT_TIME)
        self.driver.get(BASE_URL)

    def tearDown(self):
        self.driver.quit()

    def test_project_gap_analysis_page_loads(self):
        email = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "input[type='email']")
            )
        )
        password = self.driver.find_element(
            By.CSS_SELECTOR,
            "input[type='password']"
        )

        email.send_keys(EMAIL)
        password.send_keys(PASSWORD)
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button.auth-submit"
        ).click()

        open_project_button = self.wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//article[contains(@class, 'planning-project-card')]"
                    "[.//h2[normalize-space()='Bashundhara Residential Area']]"
                    "//button[contains(., 'Open feasibility')]"
                )
            )
        )
        open_project_button.click()

        gap_analysis_navigation = self.wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//nav[@aria-label='Development workspace']"
                    "//button[normalize-space()='Gap Analysis']"
                )
            )
        )
        gap_analysis_navigation.click()

        report_heading = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//article[contains(@class, 'project-gap-report')]"
                    "//h2[normalize-space()='What does this planning area currently need?']"
                )
            )
        )
        self.assertTrue(report_heading.is_displayed())

        coverage_section = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//section[contains(@class, 'project-gap-categories')]"
                    "//h3[normalize-space()='Coverage against planning benchmarks']"
                )
            )
        )
        self.assertTrue(coverage_section.is_displayed())
        self.assertTrue(
            self.driver.find_element(
                By.CSS_SELECTOR,
                "select[aria-label='Service standard']"
            ).is_displayed()
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)