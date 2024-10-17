# Function to check if a command exists
function command_exists {
    param ($cmd)
    $null = Get-Command $cmd -ErrorAction SilentlyContinue
    return $?
}

# Function to prompt installation message and exit
function prompt_installation {
    param ($software, $install_command)
    Write-Host "$software is not installed. Please install it and rerun this script."
    Write-Host "Command to install $software: $install_command"
    exit 1
}

# Step 1: Check if Git is installed
if (-not (command_exists "git")) {
    prompt_installation "Git" "winget install --id Git.Git -e --source winget"
} else {
    Write-Host "Git is already installed."
}

# Step 2: Check if Miniconda is installed
if (-not (command_exists "conda")) {
    prompt_installation "Miniconda" "winget install --id ContinuumMiniconda.Miniconda3 -e --source winget"
    $Env:PATH += ";$HOME\miniconda3\Scripts;$HOME\miniconda3"
} else {
    Write-Host "Miniconda is already installed."
}

# Step 3: Check if ollama is installed
if (-not (command_exists "ollama")) {
    prompt_installation "ollama" "winget install --id ollama.ollama -e --source winget"
} else {
    Write-Host "ollama is already installed."
}

# Step 4: Run ollama serve
Write-Host "Starting ollama serve..."
Start-Process -NoNewWindow ollama serve

# Step 5: Clone the repository if it doesn't exist
$REPO_DIR = "3404"
if (-not (Test-Path $REPO_DIR)) {
    Write-Host "Cloning the repository..."
    git clone "https://github.com/raggi-BM/3404"
}
Set-Location $REPO_DIR

# Step 6: Initialize conda for the shell
conda init powershell
& conda shell.powershell hook | Out-String | Invoke-Expression

# Step 7: Create a conda environment if it doesn't exist
$ENV_NAME = "myenv"
if (-not (conda env list | Select-String -Pattern $ENV_NAME)) {
    Write-Host "Creating conda environment..."
    conda create --name $ENV_NAME python=3.9 -y
}

# Step 8: Activate the conda environment
Write-Host "Activating conda environment..."
conda activate $ENV_NAME

# Step 9: Install dependencies from requirements.txt
Write-Host "Installing dependencies..."
Get-Content requirements.txt | ForEach-Object {
    $package = $_
    $package_name = $package -replace '(=|<|>).*',''
    if (-not (python -c "import $package_name" 2>$null)) {
        Write-Host "Installing $package..."
        pip install $package
    } else {
        Write-Host "$package_name is already installed."
    }
}

# Step 10: Run the app
Clear-Host
Write-Host "Running the app..."
Start-Process -NoNewWindow python app.py
Start-Process "http://localhost:5000/display"
Start-Process "http://localhost:5000/input"
Start-Process "http://localhost:5000/moderator"
