import unittest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE_URL = "http://127.0.0.1:5173"

EMAIL = "planner@citymind.local"
INVALID_PASSWORD = "WrongPassword123!"

WAIT_TIME = 20


class InvalidLoginTest(unittest.TestCase):

	def setUp(self):
		self.driver = webdriver.Chrome()
		self.driver.maximize_window()
		self.wait = WebDriverWait(self.driver, WAIT_TIME)
		self.driver.get(BASE_URL)

	def tearDown(self):
		self.driver.quit()

	def test_invalid_login_shows_auth_error(self):
		email_field = self.wait.until(
			EC.visibility_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
		)
		password_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")

		email_field.send_keys(EMAIL)
		password_field.send_keys(INVALID_PASSWORD)

		login_button = self.driver.find_element(By.CSS_SELECTOR, "button.auth-submit")
		login_button.click()

		error_message = self.wait.until(
			EC.visibility_of_element_located((By.CSS_SELECTOR, ".auth-error"))
		)

		self.assertIn("Invalid email or password", error_message.text)


if __name__ == "__main__":
	unittest.main(verbosity=2)
