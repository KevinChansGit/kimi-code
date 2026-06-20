#!/usr/bin/env bash
set -euo pipefail

# Kimi Code CLI (Custom Fork) — Source Build Installer for macOS/Linux
#
# This script builds the custom fork from source instead of downloading
# upstream precompiled binaries. Requires Node.js >= 24.15.0 and pnpm 10.33.0.

REPO_URL="https://github.com/MoonshotAI/kimi-code.git"
INSTALL_DIR="${KIMI_INSTALL_DIR:-${HOME}/.kimi-code}"
BUILD_DIR="${INSTALL_DIR}/src"
KIMI_CODE_HOME_ENV="KIMI_CODE_HOME"

RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

step() { echo -e "${CYAN}==>${RESET} $*"; }
die()  { echo -e "${RED}error:${RESET} $*" >&2; exit 1; }

check_node() {
  local node_version min_version
  if ! command -v node >/dev/null 2>&1; then
    die "Node.js is required but not found. Please install Node.js >= 24.15.0 first."
  fi
  node_version=$(node -v | sed 's/^v//')
  min_version="24.15.0"
  if [ "$(printf '%s\n' "$min_version" "$node_version" | sort -V | head -n1)" != "$min_version" ]; then
    die "Node.js version $node_version is too old. Need >= $min_version."
  fi
  step "Node.js $node_version ✓"
}

check_pnpm() {
  if ! command -v pnpm >/dev/null 2>&1; then
    die "pnpm is required but not found. Install with: npm install -g pnpm"
  fi
  local pnpm_version
  pnpm_version=$(pnpm -v | sed 's/^v//')
  step "pnpm $pnpm_version ✓"
}

clone_or_update() {
  if [ -d "$BUILD_DIR/.git" ]; then
    step "Updating existing source at $BUILD_DIR"
    (cd "$BUILD_DIR" && git pull --ff-only)
  else
    step "Cloning repository to $BUILD_DIR"
    mkdir -p "$(dirname "$BUILD_DIR")"
    git clone "$REPO_URL" "$BUILD_DIR"
  fi
}

build() {
  step "Installing dependencies..."
  (cd "$BUILD_DIR" && pnpm install)

  step "Building packages..."
  (cd "$BUILD_DIR" && pnpm build)
}

install_binary() {
  local bin_dir cli_path
  bin_dir="${INSTALL_DIR}/bin"
  mkdir -p "$bin_dir"

  cli_path="${BUILD_DIR}/apps/kimi-code/dist/kimi"
  if [ -f "$cli_path" ]; then
    ln -sf "$cli_path" "${bin_dir}/kimi"
    step "Linked ${bin_dir}/kimi -> ${cli_path}"
  else
    # Try Windows build path
    cli_path="${BUILD_DIR}/apps/kimi-code/dist/kimi.exe"
    if [ -f "$cli_path" ]; then
      cp -f "$cli_path" "${bin_dir}/kimi.exe"
      step "Copied ${bin_dir}/kimi.exe"
    else
      die "Build artifact not found. Expected: ${BUILD_DIR}/apps/kimi-code/dist/kimi[.exe]"
    fi
  fi
}

add_to_path() {
  local bin_dir="${INSTALL_DIR}/bin"
  local shell_config

  if [ -n "${KIMI_NO_MODIFY_PATH:-}" ]; then
    step "Skipping PATH modification (KIMI_NO_MODIFY_PATH set)"
    return
  fi

  case "$SHELL" in
    */bash) shell_config="${HOME}/.bashrc" ;;
    */zsh)  shell_config="${HOME}/.zshrc" ;;
    *)      shell_config="${HOME}/.profile" ;;
  esac

  if grep -q "${bin_dir}" "$shell_config" 2>/dev/null; then
    step "${bin_dir} already in PATH"
  else
    echo "export PATH=\"${bin_dir}:\$PATH\"" >> "$shell_config"
    step "Added ${bin_dir} to PATH in ${shell_config}"
  fi

  step "Set ${KIMI_CODE_HOME_ENV}=${INSTALL_DIR}"
  if ! grep -q "${KIMI_CODE_HOME_ENV}=" "$shell_config" 2>/dev/null; then
    echo "export ${KIMI_CODE_HOME_ENV}=\"${INSTALL_DIR}\"" >> "$shell_config"
  fi
}

print_done() {
  echo ""
  step "Installation complete!"
  echo ""
  echo "  Run: source ~/.bashrc (or ~/.zshrc)"
  echo "  Then: kimi --version"
  echo ""
  echo "  To update this custom build: cd ${BUILD_DIR} && git pull && pnpm build"
  echo ""
  echo "  This is a custom fork. Auto-update is disabled."
}

# --- main ---
step "Kimi Code CLI (Custom Fork) source installer"
check_node
check_pnpm
clone_or_update
build
install_binary
add_to_path
print_done
