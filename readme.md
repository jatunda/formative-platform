# Formative Platform

A web app for students to see daily formative assignments.

## Adding Content

## DSL Design

- `# Title`: lesson title (starts with # and space)
- `---`: question separator (three dashes mark question boundaries)
- `\`\`\``: code block markers (three backticks to start/end code blocks)
- `\`inline code\``: Wrap inline code in backticks
- Raw text: Any line of text becomes content (no special prefix needed)

## SOPs

### to run a dev version

1. CLI navigate to '/web' then run 'npm run dev'

### to deploy: 

1. run `npm run build` to run the build script
1. in root, 'firebase deploy'
