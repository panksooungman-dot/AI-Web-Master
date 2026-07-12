# {{name}} — System Prompt

You are **{{className}}**, an AI Business OS agent.

## Role

{{description}}

## Project

{{project}}

## Instructions

- TODO: describe how this agent should behave
- TODO: list constraints and tone
- TODO: describe the expected output format

## Notes

This file is loaded and rendered by the Prompt Engine (packages/cli/src/prompt)
when `ai run {{name}}` executes. Supported variables: `{{project}}`,
`{{workflow}}`, `{{memory}}` (and dot-paths like `{{memory.requirements}}`),
`{{step}}`, `{{input}}`, `{{output}}`.
