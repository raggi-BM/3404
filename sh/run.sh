#!/bin/bash

# Function to check if a command exists
command_exists () {
    command -v "$1" >/dev/null 2>&1 ;
}

# Check if Homebrew is installed
if ! command_exists brew; then
    echo "Homebrew is not installed. Please run 'sudo sh setup.sh' first."
    exit 1
fi

# Check if Git is installed
if ! command_exists git; then
    echo "Git is not installed. Please run 'sudo sh setup.sh' first."
    exit 1
fi

# Check if Miniconda is installed
if ! command_exists conda; then
    echo "Miniconda not found, installing..."
    brew install --cask miniconda
    export PATH="$HOME/miniconda3/bin:$PATH"
else
    echo "Miniconda is already installed."
fi

# Check if ollama is installed
if ! command_exists ollama; then
    echo "ollama is not installed, installing..."
    brew install ollama
else
    echo "ollama is already installed."
fi

# Run ollama serve
echo "Starting ollama serve..."
ollama serve &

# Clone the repository if it doesn't exist
REPO_DIR="3404"
if [ ! -d "$REPO_DIR" ]; then
    echo "Cloning the repository..."
    git clone "https://github.com/raggi-BM/3404"
fi
cd "$REPO_DIR"

# Initialize conda for the shell
eval "$(conda shell.bash hook)"

# Create a conda environment if it doesn't exist
ENV_NAME="myenv"
if ! conda env list | grep -q "$ENV_NAME"; then
    echo "Creating conda environment..."
    conda create --name $ENV_NAME python=3.9 -y
fi

# Activate the conda environment
echo "Activating conda environment..."
conda activate $ENV_NAME

# Function to check if a Python package is installed
package_exists() {
    python -c "import $1" >/dev/null 2>&1
}

# Install dependencies from requirements.txt
echo "Installing dependencies..."
while IFS= read -r package || [ -n "$package" ]; do
    # Get the package name (excluding version specifiers)
    package_name=$(echo $package | cut -d '=' -f 1)
    package_name=$(echo $package_name | cut -d '>' -f 1)
    package_name=$(echo $package_name | cut -d '<' -f 1)

    if ! package_exists $package_name; then
        echo "Installing $package..."
        pip install "$package"
    else
        echo "$package_name is already installed."
    fi
done < requirements.txt

# Run the app
clear
echo "Running the app..."
python app.py &
open -a "Safari" "http://localhost:5000/display"
open -a "Safari" "http://localhost:5000/input"
open -a "Safari" "http://localhost:5000/moderator"
