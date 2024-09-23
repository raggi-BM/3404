from moderation import check_content_appropriateness

base_sental = "When I hear Democracy, I think of "

while True:
    # Get the flag from the user input in the terminal
    input_flag = input("Enter a word (or type 'exit' to quit): ")

    # Break the loop if the user types 'exit'
    if input_flag.lower() == 'exit':
        print("Exiting the program.")
        break

    # Concatenate the base sentence with the input flag
    full_sentence = base_sental + input_flag

    # Check the content appropriateness
    if check_content_appropriateness(full_sentence):
        print("The content is appropriate.")
    else:
        print("The content is not appropriate.")
