import csv
import subprocess
import json
import time
from tqdm import tqdm
import random

# ASCII art header
header = r"""
 /$$$$$$$  /$$        /$$$$$$   /$$$$$$  /$$   /$$ /$$      /$$  /$$$$$$  /$$$$$$$$ /$$   /$$
| $$__  $$| $$       /$$__  $$ /$$__  $$| $$  /$$/| $$$    /$$$ /$$__  $$|__  $$__/| $$  | $$
| $$  \ $$| $$      | $$  \ $$| $$  \__/| $$ /$$/ | $$$$  /$$$$| $$  \ $$   | $$   | $$  | $$
| $$$$$$$ | $$      | $$$$$$$$| $$      | $$$$$/  | $$ $$/$$ $$| $$$$$$$$   | $$   | $$$$$$$$
| $$__  $$| $$      | $$__  $$| $$      | $$  $$  | $$  $$$| $$| $$__  $$   | $$   | $$__  $$
| $$  \ $$| $$      | $$  | $$| $$    $$| $$\  $$ | $$\  $ | $$| $$  | $$   | $$   | $$  | $$
| $$$$$$$/| $$$$$$$$| $$  | $$|  $$$$$$/| $$ \  $$| $$ \/  | $$| $$  | $$   | $$   | $$  | $$
|_______/ |________/|__/  |__/ \______/ |__/  \__/|__/     |__/|__/  |__/   |__/   |__/  |__/
                                                                                             
                                                                                             
                                                                                             
"""
print(header)

# Define the URL and headers
url = 'http://127.0.0.1:5000/store_string'
headers = [
    '-H', 'Accept: */*',
    '-H', 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8',
    '-H', 'Connection: keep-alive',
    '-H', 'Content-Type: application/json',
    '-H', 'Origin: http://10.16.27.17:5000',
    '-H', 'Referer: http://10.16.27.17:5000/input',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
]

# Initialize counters and storage for the report
total = 0
false_positives = 0
false_negatives = 0
results = []

funny_messages = [
    "Loading the matrix, please wait...",
    "Grabbing coffee, be right back...",
    "Optimizing AI brains...",
    "Counting sheep to improve sleep mode...",
    "Recalculating the meaning of life...",
    "Feeding the AI some new words...",
    "Generating some witty comments...",
    "Contemplating existence...",
    "Calculating Pi to a million digits..."
]

# open the CSV file, random sort the rows after the header and save it back
with open('testdata.csv', mode='r') as file:
    csv_reader = csv.reader(file)
    header = next(csv_reader)
    rows = list(csv_reader)
    random.shuffle(rows)
    
    with open('testdata.csv', mode='w', newline='') as file:
        csv_writer = csv.writer(file)
        csv_writer.writerow(header)
        csv_writer.writerows(rows)

# Read the CSV file and send each sentence to the server
with open('testdata.csv', mode='r') as file:
    csv_reader = csv.DictReader(file)
    row_count = sum(1 for row in csv_reader)
    file.seek(0)
    next(csv_reader)  # Skip header

    # Print the header and loader (position 0)
    print("\nProcessing...\n", end="")

    # tqdm progress bar with funny messages and position for the loader
    with tqdm(total=row_count, desc=funny_messages[0], bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} {elapsed_s:.0f}s", position=1, leave=False) as pbar:
        for idx, row in enumerate(csv_reader):
            sentence = row['sentence']
            expected_approve = row['approve'] == "True"
            
            data = json.dumps({"string": sentence})
            
            curl_command = [
                'curl', url, 
                '--data-raw', data, 
                '--insecure'
            ] + headers
            
            # Execute the curl command and capture the response
            result = subprocess.run(curl_command, capture_output=True, text=True)
            response = json.loads(result.stdout)
            
            total += 1
            approved = response.get("approved", False)
            
            if approved != expected_approve:
                if approved:
                    false_positives += 1
                else:
                    false_negatives += 1
                
                results.append({
                    "sentence": sentence,
                    "expected_approve": expected_approve,
                    "actual_approve": approved,
                    "message": response.get("message", "")
                })
            
            # Update the progress bar with a new funny message every 20% of progress
            if total % (row_count // 5) == 0:  # Every 20% of progress
                pbar.set_description(funny_messages[(total // (row_count // 5)) % len(funny_messages)])
            pbar.update(1)
            time.sleep(0.1)

# Calculate percentages
false_positive_rate = (false_positives / total) * 100 if total > 0 else 0.0
false_negative_rate = (false_negatives / total) * 100 if total > 0 else 0.0

# Calculate total accuracy
total_correct = total - (false_positives + false_negatives)
total_accuracy = (total_correct / total) * 100 if total > 0 else 0.0

# Print the final results
print("\n--- False Positives and False Negatives ---\n")
for result in results:
    print(f"Sentence: {result['sentence']}")
    print(f"Expected Approval: {result['expected_approve']}")
    print(f"Actual Approval: {result['actual_approve']}")
    print(f"Message: {result['message']}")
    print()

print("--- Summary ---\n")
print(f"Total Tests: {total}")
print(f"False Positives: {false_positives} ({false_positive_rate:.2f}%)")
print(f"False Negatives: {false_negatives} ({false_negative_rate:.2f}%)")
print(f"Total Accuracy: {total_accuracy:.2f}%")
