# VS Code Spotless Gradle

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/richardwillis.vscode-spotless-gradle.svg)](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-spotless-gradle)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/richardwillis.vscode-spotless-gradle)](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-spotless-gradle)
[![Build status](https://img.shields.io/github/workflow/status/badsyntax/vscode-spotless-gradle/Build%20&%20Publish)](https://github.com/badsyntax/vscode-spotless-gradle/actions?query=workflow%3A"Build+%26+Publish")
[![GitHub bug issues](https://img.shields.io/github/issues/badsyntax/vscode-spotless-gradle/bug?label=bug%20reports)](https://github.com/badsyntax/vscode-spotless-gradle/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

Format your code using [Spotless](https://github.com/diffplug/spotless) (via Gradle).

![Spotless Gradle Screencast](images/spotless-gradle-screencast.gif)

## Features

- Provides a Spotless formatter (`Format Document`)
- Provides a Spotless fixAll code action (`Format on Save`)

Supports `java`, `kotlin`, `kotlinscript`, `scala`, `sql`, `groovy`, `javascript`, `javascriptreact`, `typescript`, `typescriptreact`, `css`, `scss`, `less`, `vue`, `graphql`, `json`, `yaml`, `markdown` language types.

## Requirements

- [Gradle Tasks => 2.7.11](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-gradle)
- [Spotless Gradle Plugin >= 3.30.0](https://github.com/diffplug/spotless/tree/master/plugin-gradle)
- [Java >= 8](https://adoptopenjdk.net/)

For `scala`, `kotlin`, `kotlinscript`, `vue` & `graphql` languages, you'll need to install a language extension that provides these language identifiers.

## Usage

Before using this extension ensure you've [configured Spotless](https://github.com/diffplug/spotless/tree/master/plugin-gradle) correctly in your Gradle build file.

### Format on Save

Enable Spotless fixes on save in `settings.json`:

```json
"[java]": {
  "editor.codeActionsOnSave": {
    "source.fixAll.spotlessGradle": true
  }
}
```

### Setting the default Formatter

If there are multiple formatters for a language, set Spotless to be the default in `settings.json`:

```json
"[java]": {
  "editor.defaultFormatter": "richardwillis.vscode-spotless-gradle"
}
```

## How it Works

This extension runs the `spotlessApply` Gradle task on the focused file. Untitled/Unsaved files are ignored.

Invoking the Spotless formatting will take a while if your Gradle build hasn't previously resolved project dependencies. To warm up Spotless, run `./gradlew spotlessDiagnose`.

The vscode => Spotless interface is provided by the [Gradle Tasks](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-gradle) extension.

👉 [Architecture Overview](./ARCHITECTURE.md)

## Troubleshooting

View logs by selecting "Spotless Gradle" and/or "Gradle Tasks" in the output panel.

## Support

For general support queries, use the [#gradle-tasks](https://vscode-dev-community.slack.com/archives/C011NUFTHLM) channel in the [slack development community workspace](https://aka.ms/vscode-dev-community), or

- 👉 [Submit a bug report](https://github.com/badsyntax/vscode-spotless-gradle/issues/new?assignees=badsyntax&labels=bug&template=bug_report.md&title=)
- 👉 [Submit a feature request](https://github.com/badsyntax/vscode-spotless-gradle/issues/new?assignees=badsyntax&labels=enhancement&template=feature_request.md&title=)

## Credits

- Thanks to [Ned Twigg](https://github.com/nedtwigg) for adapting Spotless for better IDE integration
- Thanks to all the [Spotless contributors](https://github.com/diffplug/spotless#acknowledgements)

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md).

## License

See [LICENSE.md](./LICENSE.md).
