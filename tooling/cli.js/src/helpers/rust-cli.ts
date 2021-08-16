// Copyright 2019-2021 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

import { existsSync } from 'fs'
import { resolve } from 'path'
// Webpack reads the file at build-time, so this becomes a static var
// @ts-expect-error
import manifest from '../../../cli.rs/Cargo.toml'
import { CargoManifest } from '../types/cargo'
import { downloadCli } from './download-binary'
import { spawn, spawnSync } from './spawn'
const tauriCliManifest = manifest as CargoManifest

export async function runOnRustCli(
  command: string,
  args: string[]
): Promise<{ pid: number; promise: Promise<void> }> {
  const targetPath = resolve(__dirname, '../..')
  const targetCliPath = 'C:\\Users\\Ben\\.cargo\\bin\\cargo-tauri.exe'

  let resolveCb: () => void
  let rejectCb: () => void
  let pid: number
  const promise = new Promise<void>((resolve, reject) => {
    resolveCb = resolve
    rejectCb = () => reject(new Error())
  })
  const onClose = (code: number, pid: number): void => {
    if (code === 0) {
      resolveCb()
    } else {
      rejectCb()
    }
  }

  if (existsSync(targetCliPath)) {
    pid = spawn(
      targetCliPath,
      ['tauri', command, ...args],
      process.cwd(),
      onClose
    )
  } else if (process.env.NODE_ENV === 'production') {
    await downloadCli()
    pid = spawn(
      targetCliPath,
      ['tauri', command, ...args],
      process.cwd(),
      onClose
    )
  } else {
    if (existsSync(resolve(targetPath, 'test'))) {
      // running local CLI since test directory exists
      const cliPath = resolve(targetPath, '../cli.rs')
      spawnSync('cargo', ['build', '--release'], cliPath)
      const localCliPath = resolve(
        targetPath,
        '../cli.rs/target/release/cargo-tauri'
      )
      pid = spawn(
        localCliPath,
        ['tauri', command, ...args],
        process.cwd(),
        onClose
      )
    } else {
      spawnSync(
        'cargo',
        [
          'install',
          '--root',
          targetPath,
          'tauri-cli',
          '--version',
          // eslint-disable-next-line
          tauriCliManifest.package.version
        ],
        process.cwd()
      )
      pid = spawn(
        targetCliPath,
        ['tauri', command, ...args],
        process.cwd(),
        onClose
      )
    }
  }

  return { pid, promise }
}
