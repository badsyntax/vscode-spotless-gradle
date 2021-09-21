export const ALL_SUPPORTED_LANGUAGES = [
  'java',
  'kotlinscript',
  'kotlin',
  'scala',
  'sql',
  'groovy',
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
  'css',
  'scss',
  'less',
  'vue',
  'graphql',
  'json',
  'yaml',
  'markdown',
  'python',
  'c',
  'cpp',
  'csharp',
  'objective-c',
  'objective-cpp',
];
export const GRADLE_TASKS_EXTENSION_ID = 'vscjava.vscode-gradle';
export const SPOTLESS_GRADLE_EXTENSION_ID =
  'richardwillis.vscode-spotless-gradle';

export const OUTPUT_CHANNEL_ID = 'Spotless Gradle';
export const DIAGNOSTICS_ID = 'Spotless';
export const DIAGNOSTICS_SOURCE_ID = 'gradle';

export const SPOTLESS_STATUS_IS_CLEAN = 'IS CLEAN';
export const SPOTLESS_STATUS_DID_NOT_CONVERGE = 'DID NOT CONVERGE';
export const SPOTLESS_STATUS_IS_DIRTY = 'IS DIRTY';

export const SPOTLESS_STATUSES = [
  SPOTLESS_STATUS_DID_NOT_CONVERGE,
  SPOTLESS_STATUS_IS_CLEAN,
  SPOTLESS_STATUS_IS_DIRTY,
];

export const INSTALL_COMPATIBLE_EXTENSION_VERSIONS =
  'Install Compatible Versions';

export const CONFIG_NAMESPACE = 'spotlessGradle';
export const CONFIG_FORMAT_ENABLE = 'format.enable';
export const CONFIG_DIAGNOSTICS_ENABLE = 'diagnostics.enable';
