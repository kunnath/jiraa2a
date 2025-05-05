# Contributing to JIRA Relationship Visualizer

Thank you for your interest in contributing to JIRA Relationship Visualizer! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Be respectful to others and follow the golden rule: "Treat others as you'd like to be treated."

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find that the bug has already been reported. If it hasn't, create a new issue with a descriptive title and clear steps to reproduce the problem.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue providing the following information:

- A clear and descriptive title
- A detailed description of the suggested enhancement
- An explanation of why this enhancement would be useful

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the code style guidelines
- Include updated tests as appropriate
- Document new code based on the project's documentation style

## Setting Up Development Environment

1. Fork the repo
2. Clone your fork
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/jira-relationship-visualizer.git
   ```
4. Set up your environment according to the README.md instructions

## Development Process

1. Create a new branch for your work
2. Make your changes
3. Add tests for your changes when applicable
4. Run the tests to ensure they pass
5. Push your branch and create a pull request

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or fewer
- Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

- Use 2 spaces for indentation
- Prefer the object spread operator (`{...anotherObj}`) to `Object.assign()`
- Use camelCase for variable and function names
- Place an empty line between methods in classes

### Python Styleguide

- Follow PEP 8 style guide
- Use 4 spaces for indentation
- Maximum line length of 79 characters
- Use snake_case for variable and function names

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
