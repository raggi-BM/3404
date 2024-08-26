#!/bin/bash

# Function to check if a command exists
command_exists () {
    command -v "$1" >/dev/null 2>&1 ;
}

# Function to prompt installation message and exit
prompt_installation() {
    echo "$1 is not installed. Please install it and rerun this script."
    echo "Command to install $1: $2"
    exit 1
}

# Step 1: Check if Homebrew is installed
if ! command_exists brew; then
    prompt_installation "Homebrew" "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
else
    echo "Homebrew is already installed."
fi

# Step 2: Check if Git is installed
if ! command_exists git; then
    prompt_installation "Git" "brew install git"
else
    echo "Git is already installed."
fi

# Step 3: Check if Miniconda is installed
if ! command_exists conda; then
    prompt_installation "Miniconda" "brew install --cask miniconda"
    export PATH="$HOME/miniconda3/bin:$PATH"
else
    echo "Miniconda is already installed."
fi

# Step 4: Check if ollama is installed
if ! command_exists ollama; then
    prompt_installation "ollama" "brew install ollama"
else
    echo "ollama is already installed."
fi

# Step 5: Run ollama serve
echo "Starting ollama serve..."
ollama serve &

# Step 6: Clone the repository if it doesn't exist
REPO_DIR="3404"
if [ ! -d "$REPO_DIR" ]; then
    echo "Cloning the repository..."
    git clone "https://github.com/raggi-BM/3404"
fi
cd "$REPO_DIR"

# Step 7: Initialize conda for the shell
eval "$(conda shell.bash hook)"

# Step 8: Create a conda environment if it doesn't exist
ENV_NAME="myenv"
if ! conda env list | grep -q "$ENV_NAME"; then
    echo "Creating conda environment..."
    conda create --name $ENV_NAME python=3.9 -y
fi

# Step 9: Activate the conda environment
echo "Activating conda environment..."
conda activate $ENV_NAME

# Step 10: Install dependencies from requirements.txt
echo "Installing dependencies..."
while IFS= read -r package || [ -n "$package" ]; do
    # Get the package name (excluding version specifiers)
    package_name=$(echo $package | cut -d '=' -f 1)
    package_name=$(echo $package_name | cut -d '>' -f 1)
    package_name=$(echo $package_name | cut -d '<' -f 1)

    if ! python -c "import $package_name" >/dev/null 2>&1; then
        echo "Installing $package..."
        pip install "$package"
    else
        echo "$package_name is already installed."
    fi
done < requirements.txt

ollama serve &

# Step 11: Run the app
clear
echo "Running the app..."
python app.py &
open -a "Safari" "http://localhost:5000/display"
open -a "Safari" "http://localhost:5000/input"
open -a "Safari" "http://localhost:5000/moderator"
