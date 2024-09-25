import time
import requests
import json

# URL and headers for the request
url = 'http://127.0.0.1:5000/store_string'
headers = {
    'Accept': '*/*',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': 'http://10.16.27.17:5000',
    'Referer': 'http://10.16.27.17:5000/input',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
}

# Function to read the words from positive.txt


def read_words_from_file(filename):
    with open(filename, 'r') as file:
        content = file.read()
        # Split the content by commas to get individual words
        words = content.split(',')
        # Strip any leading/trailing whitespace from words
        words = [word.strip() for word in words]
    return words

# Function to send each word to the endpoint


def send_words_to_endpoint(words, url, headers):
    for word in words:
        # Assuming the endpoint accepts a 'word' key in the payload
        data = {"string": word}
        try:
            response = requests.post(
                url, headers=headers, data=json.dumps(data))
            if response.status_code == 200 or response.status_code == 201:
                print(f"Successfully sent word: {word}")
            else:
                print(
                    f"Failed to send word: {word}, Status Code: {response.status_code}")
        except Exception as e:
            print(f"Error occurred: {e}")

        # Wait for 3.5 seconds before sending the next word
        time.sleep(3.5)


# Main function to run the script
if __name__ == "__main__":
    words = read_words_from_file('positive.txt')
    send_words_to_endpoint(words, url, headers)
