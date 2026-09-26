import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = "http://127.0.0.1:5173"
EMAIL = "planner@citymind.local"
PASSWORD = "CityMindDemo123!"
WAIT_TIME = 30


class GrowthPredictionTest(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.maximize_window()
        self.wait = WebDriverWait(self.driver, WAIT_TIME)
        self.driver.get(BASE_URL)

    def tearDown(self):
        self.driver.quit()

    def test_growth_prediction_page_loads(self):
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

        growth_navigation = self.wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//nav[@aria-label='Development workspace']"
                    "//button[normalize-space()='Growth Prediction']"
                )
            )
        )
        growth_navigation.click()

        growth_heading = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//article[contains(@class, 'growth-prediction-view')]"
                    "//h2[normalize-space()='Growth Prediction']"
                )
            )
        )
        self.assertTrue(growth_heading.is_displayed())

        scenario_chart = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//section[contains(@class, 'growth-chart-card')]"
                    "//h3[normalize-space()='Population scenario']"
                )
            )
        )
        self.assertTrue(scenario_chart.is_displayed())
        self.assertTrue(
            self.driver.find_element(
                By.XPATH,
                "//aside[contains(@class, 'planning-notice')]"
            ).is_displayed()
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)