# Example Gradle Project

An example Gradle project used in the tests.

## Formatting massive files

An example massive Java file (`MassiveFile.java`) is provided to show how well the `vscode-gradle`, `vscode-spotless-gradle` and `gradle.spotless` libraries work on massive files.

The file is pretty much the biggest the libraries can handle. If the file was any bigger, we could see the following issues:

- The file contents (request message) could exceed the grpc-client & http2 maximum message sizes (`grpc-js` throws a `Call cancelled` error)
- The formatted contents (response message) could be bigger than the maximum message size defined by the gRPC service (`io.grpc.Server` throws `gRPC message exceeds maximum size 4194304`)
- The `spotlessApply` task could run out of memory (`java.lang.OutOfMemoryError: Java heap space`)
