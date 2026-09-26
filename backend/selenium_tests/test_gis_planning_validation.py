import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = "http://127.0.0.1:5173"
EMAIL = "planner@citymind.local"
PASSWORD = "CityMindDemo123!"
WAIT_TIME = 30


class GISPlanningValidationTest(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.maximize_window()
        self.wait = WebDriverWait(self.driver, WAIT_TIME)
        self.driver.get(BASE_URL)

    def tearDown(self):
        self.driver.quit()

    def test_gis_planning_and_validation_control_load(self):
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

        gis_heading = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//p[normalize-space()='Project GIS planning canvas']"
                )
            )
        )
        self.assertTrue(gis_heading.is_displayed())

        map_canvas = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, ".project-map-stage .leaflet-container")
            )
        )
        self.assertTrue(map_canvas.is_displayed())

        basemap_selector = self.driver.find_element(
            By.XPATH,
            "//label[contains(., 'Basemap')]//select"
        )
        self.assertTrue(basemap_selector.is_displayed())

        validate_button = self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Validate plan']")
            )
        )
        self.assertTrue(validate_button.is_displayed())
        validate_button.click()

        validation_notice = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, ".canvas-notice")
            )
        )
        self.assertRegex(
            validation_notice.text,
            r"^Plan validation (passed|found)"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)