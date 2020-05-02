# VS Code Spotless Gradle

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/richardwillis.vscode-spotless-gradle.svg)](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-spotless-gradle)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/richardwillis.vscode-spotless-gradle)](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-spotless-gradle)
[![Build status](https://img.shields.io/github/workflow/status/badsyntax/vscode-spotless-gradle/Build%20&%20Publish)](https://github.com/badsyntax/vscode-spotless-gradle/actions?query=workflow%3A"Build+%26+Publish")
[![GitHub bug issues](https://img.shields.io/github/issues/badsyntax/vscode-spotless-gradle/bug?label=bug%20reports)](https://github.com/badsyntax/vscode-gradle/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

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

## Support

For general support queries, use the [#gradle-tasks](https://vscode-dev-community.slack.com/archives/C011NUFTHLM) channel in the [slack development community workspace](https://aka.ms/vscode-dev-community), or

- 👉 [Submit a bug report](https://github.com/badsyntax/vscode-spotless-gradle/issues/new?assignees=badsyntax&labels=bug&template=bug_report.md&title=)
- 👉 [Submit a feature request](https://github.com/badsyntax/vscode-spotless-gradle/issues/new?assignees=badsyntax&labels=enhancement&template=feature_request.md&title=)

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md).

## License

See [LICENSE.md](./LICENSE.md).
