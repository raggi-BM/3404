import sqlite3

# Connect to your SQLite database
DATABASE = 'database.db'


def insert_words_from_file(file_path):
    # Read the words from the file
    with open(file_path, 'r') as file:
        words = file.read().split(',')

    # Normalize the words (e.g., trimming spaces and converting to lowercase)
    words = [word.strip().lower() for word in words]

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()

        for word in words:
            # Check if the word already exists in the database
            cursor.execute(
                'SELECT id, count FROM strings WHERE string = ?', (word,))
            row = cursor.fetchone()

            if row:
                # Word exists, increment its count and update human_approved to True
                word_id = row[0]
                new_count = row[1] + 1
                cursor.execute('UPDATE strings SET count = ?, human_approved = ?, approved = ? WHERE id = ?',
                               (new_count, True, True, word_id))  # Ensure 'approved' is set to True
            else:
                # Word doesn't exist, insert it with count 1, set human_approved=True, and approved=True
                cursor.execute('INSERT INTO strings (string, count, human_approved, approved) VALUES (?, ?, ?, ?)',
                               (word, 1, True, True))  # Ensure 'approved' is set to True

        conn.commit()

    print(
        f"Successfully inserted/updated words from {file_path} with human_approved=True and approved=True.")


# Usage example
if __name__ == '__main__':
    # Replace 'words.txt' with your actual file path
    insert_words_from_file('test/mfa.txt')
