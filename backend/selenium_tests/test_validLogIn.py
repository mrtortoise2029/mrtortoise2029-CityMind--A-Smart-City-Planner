import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE_URL = "http://127.0.0.1:5173"

EMAIL = "planner@citymind.local"
PASSWORD = "CityMindDemo123!"

WAIT_TIME = 20


class ValidLoginTest(unittest.TestCase):

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

    def test_valid_login(self):

        # Locate email field
        email = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "input[type='email']")
            )
        )

        # Locate password field
        password = self.driver.find_element(
            By.CSS_SELECTOR,
            "input[type='password']"
        )

        # Enter valid credentials
        email.send_keys(EMAIL)
        password.send_keys(PASSWORD)

        # Click Login
        login_button = self.driver.find_element(
            By.CSS_SELECTOR,
            "button.auth-submit"
        )

        login_button.click()

        # Wait for successful login page
        heading = self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h1[normalize-space()='My Development Projects']"
                )
            )
        )

        # Verify successful login
        self.assertEqual(
            heading.text,
            "My Development Projects"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
