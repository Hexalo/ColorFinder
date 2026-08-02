/** Single source of truth for IPC channel names. */
export const IPC = {
  libraryRead: 'library:read',
  libraryWrite: 'library:write',
  libraryReveal: 'library:reveal',
  libraryPath: 'library:path',

  settingsRead: 'settings:read',
  settingsWrite: 'settings:write',

  pickerStart: 'picker:start',
  /** Overlay -> main: the overlay window pushes the picked colour. */
  pickerCommit: 'picker:commit',
  /** Overlay -> main: user pressed Escape / right-clicked. */
  pickerCancel: 'picker:cancel',
  /** Main -> overlay: the screenshot to display, as a data URL. */
  pickerFrame: 'picker:frame',

  /** Main -> splash: play the exit animation, the window closes right after. */
  splashLeave: 'splash:leave',

  filesExportJson: 'files:export-json',
  filesImportJson: 'files:import-json',
  filesOpenImage: 'files:open-image',

  systemScreenCaptureBlocked: 'system:screen-capture-blocked',
  systemOpenScreenCaptureSettings: 'system:open-screen-capture-settings'
} as const
