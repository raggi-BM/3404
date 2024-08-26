import sys
import os
import csv
import json
import time
from tqdm import tqdm
import random

# Add the parent directory to the system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))
from moderation import check_content_appropriateness  # Ensure this import works as discussed before

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

# List of LLMs to test
llms = [
    "vanilj/hermes-3-llama-3.1-8b:latest"
]

# Initialize storage for the report
results_summary = []

# Randomly shuffle the rows in the CSV file
with open('testdata.csv', mode='r') as file:
    csv_reader = csv.reader(file)
    header = next(csv_reader)
    rows = list(csv_reader)
    random.shuffle(rows)
    
    with open('testdata.csv', mode='w', newline='') as file:
        csv_writer = csv.writer(file)
        csv_writer.writerow(header)
        csv_writer.writerows(rows)

# Iterate over each LLM model
for llm in llms:
    total = 0
    false_positives = 0
    false_negatives = 0
    results = []

    start_time = time.time()  # Start time for this LLM
    
    with open('testdata.csv', mode='r') as file:
        csv_reader = csv.DictReader(file)
        row_count = sum(1 for row in csv_reader)
        file.seek(0)
        next(csv_reader)  # Skip header

        print(f"\nProcessing LLM: {llm}\n", end="")

        # tqdm progress bar with funny messages and position for the loader
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

        with tqdm(total=row_count, desc=funny_messages[0], bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} {elapsed_s:.0f}s", position=1, leave=False) as pbar:
            for idx, row in enumerate(csv_reader):
                sentence = row['sentence']
                expected_approve = row['approve'] == "True"
                
                # Call the moderation function directly
                approved = check_content_appropriateness(sentence, MODEL_NAME=llm)
                
                total += 1
                
                if approved != expected_approve:
                    if approved:
                        false_positives += 1
                    else:
                        false_negatives += 1
                    
                    results.append({
                        "sentence": sentence,
                        "expected_approve": expected_approve,
                        "actual_approve": approved,
                        "message": "Mismatched approval"
                    })
                
                # Update the progress bar with a new funny message every 20% of progress
                if total % (row_count // 5) == 0:  # Every 20% of progress
                    pbar.set_description(funny_messages[(total // (row_count // 5)) % len(funny_messages)])
                pbar.update(1)
                time.sleep(0.1)

    end_time = time.time()  # End time for this LLM
    elapsed_time = end_time - start_time  # Time taken in seconds

    # Calculate percentages and accuracy
    false_positive_rate = (false_positives / total) * 100 if total > 0 else 0.0
    false_negative_rate = (false_negatives / total) * 100 if total > 0 else 0.0
    total_correct = total - (false_positives + false_negatives)
    total_accuracy = (total_correct / total) * 100 if total > 0 else 0.0

    # Save the summary for this LLM
    results_summary.append({
        "LLM Name": llm,
        "Total Tests": total,
        "False Positives": false_positives,
        "False Negatives": false_negatives,
        "False Positive %": false_positive_rate,
        "False Negative %": false_negative_rate,
        "Total Accuracy %": total_accuracy,
        "Time Taken (s)": elapsed_time
    })

    print(f"LLM {llm} Results:")
    print(f"Total Tests: {total}")
    print(f"False Positives: {false_positives} ({false_positive_rate:.2f}%)")
    print(f"False Negatives: {false_negatives} ({false_negative_rate:.2f}%)")
    print(f"Total Accuracy: {total_accuracy:.2f}%")
    print(f"Time Taken: {elapsed_time:.2f} seconds\n")

# Write the results summary to a CSV file
with open('llm_results_summary.csv', mode='w', newline='') as file:
    fieldnames = [
        "LLM Name", "Total Tests", "False Positives", 
        "False Negatives", "False Positive %", 
        "False Negative %", "Total Accuracy %", 
        "Time Taken (s)"
    ]
    writer = csv.DictWriter(file, fieldnames=fieldnames)

    writer.writeheader()
    for result in results_summary:
        writer.writerow(result)

print("Results summary saved to 'llm_results_summary.csv'")
