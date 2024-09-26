# Python script to remove comments and trailing spaces from each line in 'input.txt'

def remove_comments(line):
    # Find the index of '#' indicating the start of a comment
    comment_index = line.find('#')
    if comment_index != -1:
        # Remove the comment and any preceding spaces
        line = line[:comment_index].rstrip()
    else:
        # Remove any trailing spaces
        line = line.rstrip()
    return line


def main():
    # Open 'input.txt' for reading
    with open('moreWords.txt', 'r') as infile:
        lines = infile.readlines()

    # Process each line to remove comments and trailing spaces
    processed_lines = [remove_comments(line) + '\n' for line in lines]

    # Write the processed lines back to 'input.txt' or to a new file
    with open('input.txt', 'w') as outfile:
        outfile.writelines(processed_lines)


if __name__ == "__main__":
    main()
