#!/usr/bin/env bash

set -euo pipefail

maya_archive_url="${MAYA_ARCHIVE_URL:-https://github.com/brianjmeier/maya/archive/refs/heads/main.tar.gz}"
maya_install_dir="${MAYA_INSTALL_DIR:-$HOME/Downloads/maya-unpacked}"

case "$maya_install_dir" in
  "" | "/" | "$HOME")
    printf 'Refusing unsafe MAYA_INSTALL_DIR: %s\n' "$maya_install_dir" >&2
    exit 1
    ;;
esac

case "$maya_install_dir" in
  /*) ;;
  *)
    printf 'MAYA_INSTALL_DIR must be an absolute path.\n' >&2
    exit 1
    ;;
esac

for maya_command in curl tar; do
  if ! command -v "$maya_command" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$maya_command" >&2
    exit 1
  fi
done

maya_temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/maya-installer.XXXXXX")"
trap 'rm -r "$maya_temp_dir"' EXIT

mkdir -p "$maya_temp_dir/source"
curl -fsSL "$maya_archive_url" -o "$maya_temp_dir/maya.tar.gz"
tar -xzf "$maya_temp_dir/maya.tar.gz" -C "$maya_temp_dir/source" --strip-components=1

if [[ ! -f "$maya_temp_dir/source/extension/manifest.json" ]]; then
  printf 'The downloaded archive does not contain the Maya extension.\n' >&2
  exit 1
fi

mkdir -p "$(dirname "$maya_install_dir")"

if [[ -e "$maya_install_dir" ]]; then
  maya_backup_dir="${maya_install_dir}.backup-$(date +%Y%m%d%H%M%S)"
  mv "$maya_install_dir" "$maya_backup_dir"
  printf 'Previous installation preserved at: %s\n' "$maya_backup_dir"
fi

cp -R "$maya_temp_dir/source/extension" "$maya_install_dir"

printf '\nMaya is ready at:\n  %s\n\n' "$maya_install_dir"
printf 'Open chrome://extensions, enable Developer mode, choose Load unpacked, and select that folder.\n'
