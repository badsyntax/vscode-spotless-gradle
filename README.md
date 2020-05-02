# VS Code Spotless Gradle

Format your code using [Spotless](https://github.com/diffplug/spotless) (via Gradle).

## Features

- Provides a new code formatter
- Auto-fix on save

Supports `java`, `kotlin`, `scala` & `groovy` language types.

## Requirements

- [Gradle Tasks](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-gradle)
- [Java >= 8](https://adoptopenjdk.net/)

## Setting the Formatter

Set the default formatter for a specified language type in `settings.json`:

```json
"[java]": {
  "editor.defaultFormatter": "richardwillis.vscode-spotless-gradle"
}
```

Enable spotless fixes on save in `settings.json`:

```json
"editor.codeActionsOnSave": {
  "source.fixAll.spotlessGradle": true
}
```
