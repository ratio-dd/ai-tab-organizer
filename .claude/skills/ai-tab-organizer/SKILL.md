```markdown
# ai-tab-organizer Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the development conventions and workflows used in the `ai-tab-organizer` JavaScript codebase. It covers file naming, import/export styles, commit message patterns, and testing practices. By following these guidelines, contributors can maintain consistency and quality throughout the project.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `tabManager.js`, `tabUtils.test.js`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```javascript
    import { organizeTabs } from './tabManager';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```javascript
    // In tabManager.js
    export function organizeTabs(tabs) { /* ... */ }
    ```

### Commit Messages
- Follow **Conventional Commits** with these prefixes:
  - `feat`: New features
  - `docs`: Documentation changes
  - `chore`: Maintenance tasks
- Keep commit messages concise (average 38 characters).
  - Example: `feat: add tab grouping logic`

## Workflows

### Feature Development
**Trigger:** When adding a new feature  
**Command:** `/feature`

1. Create a new branch for your feature.
2. Implement the feature using camelCase file naming and named exports.
3. Write or update tests in a corresponding `.test.js` file.
4. Commit using the `feat` prefix (e.g., `feat: implement tab sorting`).
5. Open a pull request for review.

### Documentation Update
**Trigger:** When updating or adding documentation  
**Command:** `/docs`

1. Edit or add documentation files as needed.
2. Commit changes with the `docs` prefix (e.g., `docs: update README with usage examples`).
3. Open a pull request for review.

### Maintenance Task
**Trigger:** For refactoring, dependency updates, or other chores  
**Command:** `/chore`

1. Make the necessary maintenance changes.
2. Commit with the `chore` prefix (e.g., `chore: update dependencies`).
3. Open a pull request for review.

## Testing Patterns

- Test files use the `*.test.*` naming pattern, e.g., `tabManager.test.js`.
- The specific testing framework is not defined, but tests should be colocated with the code they test.
- Example test file:
  ```javascript
  // tabManager.test.js
  import { organizeTabs } from './tabManager';

  test('organizes tabs by domain', () => {
    // test implementation
  });
  ```

## Commands
| Command    | Purpose                                  |
|------------|------------------------------------------|
| /feature   | Start a new feature development workflow |
| /docs      | Start a documentation update workflow    |
| /chore     | Start a maintenance task workflow        |
```
