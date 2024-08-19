# This runs without sudo 
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

# Install dependencies from requirements.txt
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the app
clear
echo "Running the app..."
python app.py &
open -a "Safari" "http://localhost:5000/display"
open -a "Safari" "http://localhost:5000/input"
