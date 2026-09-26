import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = "http://127.0.0.1:5173"
EMAIL = "planner@citymind.local"
PASSWORD = "CityMindDemo123!"
WAIT_TIME = 20


class ProjectWorkspaceTest(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.maximize_window()
        self.wait = WebDriverWait(self.driver, WAIT_TIME)
        self.driver.get(BASE_URL)

    def tearDown(self):
        self.driver.quit()

    def test_user_can_open_project_workspace(self):
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

        project_heading = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h1[normalize-space()='My Development Projects']"
                )
            )
        )
        self.assertTrue(project_heading.is_displayed())

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

        workspace_heading = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//header[contains(@class, 'workspace-header')]"
                    "//h1[normalize-space()='Bashundhara Residential Area']"
                )
            )
        )
        self.assertTrue(workspace_heading.is_displayed())

        workspace_navigation = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "nav[aria-label='Development workspace']")
            )
        )
        self.assertTrue(workspace_navigation.is_displayed())
        self.assertTrue(
            self.driver.find_element(
                By.XPATH,
                "//button[normalize-space()='← Projects']"
            ).is_displayed()
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)