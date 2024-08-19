# Setup, this runs with sudo
#!/bin/bash

# Function to check if a command exists
command_exists () {
    command -v "$1" >/dev/null 2>&1 ;
}

# Check if Homebrew is installed
if ! command_exists brew; then
    echo "Homebrew not found, installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "Homebrew is already installed."
fi

# Check if Git is installed
if ! command_exists git; then
    echo "Git not found, installing..."
    brew install git
else
    echo "Git is already installed."
fi

echo "Homebrew setup complete. Please run 'sh run.sh' to complete the setup and run the application."
