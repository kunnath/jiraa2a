# Connecting to GitHub

Follow these steps to push your repository to GitHub:

1. First, make sure you have a GitHub account. If you don't have one, create an account at [github.com](https://github.com/).

2. Create a new repository on GitHub:
   - Go to: https://github.com/new
   - Name the repository "jira-relationship-visualizer" (or your preferred name)
   - Add a description (optional)
   - Keep it as a public repository (or choose private if you prefer)
   - Do NOT initialize the repository with a README, .gitignore, or license as we already have these files

3. Connect your local repository to GitHub:
   ```bash
   # Replace YOUR_USERNAME with your GitHub username
   git remote add origin https://github.com/YOUR_USERNAME/jira-relationship-visualizer.git
   
   # Verify the remote connection
   git remote -v
   
   # Push your code to GitHub
   git push -u origin main
   ```

4. If you're using SSH authentication instead of HTTPS:
   ```bash
   # Replace YOUR_USERNAME with your GitHub username
   git remote add origin git@github.com:YOUR_USERNAME/jira-relationship-visualizer.git
   
   # Push your code to GitHub
   git push -u origin main
   ```

5. After pushing, refresh your GitHub repository page to see your code online!

## Personal Access Token (For HTTPS)

If you're using HTTPS and GitHub asks for authentication, you'll need a personal access token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with "repo" scopes
3. Copy the token and use it as your password when pushing (your GitHub username is still your username)

## Setting Git User Information

To set your Git user information:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

This will avoid the warning message you saw during the initial commit.
