import { ErrorCodes } from '@moonshot-ai/kimi-code-sdk';

export const PRODUCT_NAME = 'Kimi Code (Custom)';
export const CLI_COMMAND_NAME = 'kimi';
export const PROCESS_NAME = 'kimi-code';

// Used in telemetry app names and HTTP User-Agent headers.
export const CLI_USER_AGENT_PRODUCT = 'kimi-code-cli';
export const CLI_UI_MODE = 'shell';
// Telemetry ui_mode for the `kimi web` / `kimi server run` host. Same product
// as the CLI (CLI_USER_AGENT_PRODUCT); the surface is distinguished by ui_mode.
export const WEB_UI_MODE = 'web';

// Give telemetry a short flush window without making CLI exit feel stuck.
export const CLI_SHUTDOWN_TIMEOUT_MS = 3000;

// Upper bound on headless (`kimi -p`) shutdown. A wedged cleanup step (e.g. a
// SessionEnd hook, an MCP shutdown, or a connection blackholed by a restrictive
// firewall) must not keep a completed run alive indefinitely — once this elapses
// we stop waiting on cleanup and let the run return.
export const PROMPT_CLEANUP_TIMEOUT_MS = 8000;

// Grace after a headless run has fully completed (turn done, cleanup attempted)
// before force-exiting. `kimi -p` otherwise relies on the event loop draining to
// exit; a stray ref'd handle (socket/timer/child) left over from the run would
// wedge it. The guard timer is unref'd, so a healthy run still exits naturally
// well before this fires.
export const HEADLESS_FORCE_EXIT_GRACE_MS = 2000;

// Max time to wait for buffered stdout/stderr to flush before arming the
// force-exit fallback. A slow/piped consumer's still-draining stdio is a
// legitimate ref'd handle — flushing first prevents the fallback from
// truncating completed output. Bounded so a permanently-stuck consumer can't
// re-introduce the hang.
export const HEADLESS_STDIO_DRAIN_TIMEOUT_MS = 10000;

// Published npm package name; this can differ from the executable command.
export const NPM_PACKAGE_NAME = '@moonshot-ai/kimi-code';

// App-owned data paths. SDK/core runtime config is intentionally not routed here.
export const KIMI_CODE_HOME_ENV = 'KIMI_CODE_HOME';
export const KIMI_CODE_DATA_DIR_NAME = '.kimi-code';
export const KIMI_CODE_LOG_DIR_NAME = 'logs';
export const KIMI_CODE_CACHE_DIR_NAME = 'cache';
export const KIMI_CODE_UPDATE_DIR_NAME = 'updates';
export const KIMI_CODE_BIN_DIR_NAME = 'bin';
export const KIMI_CODE_UPDATE_STATE_FILE_NAME = 'latest.json';
export const KIMI_CODE_UPDATE_INSTALL_STATE_FILE_NAME = 'install.json';
export const KIMI_CODE_UPDATE_INSTALL_LOCK_FILE_NAME = 'install.lock';
export const KIMI_CODE_UPDATE_ROLLOUT_LOG_FILE_NAME = 'rollout.log';
export const KIMI_CODE_INPUT_HISTORY_DIR_NAME = 'user-history';
export const KIMI_CODE_BANNER_DIR_NAME = 'banner';
export const KIMI_CODE_BANNER_STATE_FILE_NAME = 'state.json';

// Managed Kimi auth provider key shared with OAuth/SDK config.
export const DEFAULT_OAUTH_PROVIDER_NAME = 'managed:kimi-code';

// SDK/core error code that tells the TUI to show a login-required startup
// notice. Derived from sdk's ErrorCodes so a future rename in core
// auto-propagates instead of silently breaking the startup recovery path.
export const OAUTH_LOGIN_REQUIRED_CODE = ErrorCodes.AUTH_LOGIN_REQUIRED;

// Feedback disabled for custom build — issues should be tracked locally instead
// of being sent to the upstream repository.
export const FEEDBACK_ISSUE_URL = 'https://github.com/MoonshotAI/kimi-code/issues';

// Sent in the feedback `version` field so the backend can distinguish this
// TypeScript client from clients that send a bare version.
export const FEEDBACK_VERSION_PREFIX = 'kimi-code-';

// Telemetry event name; keep stable for dashboard queries.
export const FEEDBACK_TELEMETRY_EVENT = 'feedback_submitted';

// CDN source of truth: all version checks and native install scripts pull from here.
// Disabled for custom build — auto-update would overwrite the fork with upstream binaries.
export const KIMI_CODE_CDN_BASE = 'https://invalid-disabled-for-custom-build';
export const KIMI_CODE_CDN_LATEST_URL = 'https://invalid-disabled-for-custom-build/latest';
export const KIMI_CODE_CDN_LATEST_JSON_URL = 'https://invalid-disabled-for-custom-build/latest.json';
export const KIMI_CODE_TIPS_BANNER_URL = 'https://invalid-disabled-for-custom-build';
export const KIMI_CODE_PLUGIN_MARKETPLACE_URL = 'https://invalid-disabled-for-custom-build';
export const KIMI_CODE_PLUGIN_MARKETPLACE_URL_ENV = 'KIMI_CODE_PLUGIN_MARKETPLACE_URL';
export const KIMI_CODE_INSTALL_SH_URL = 'https://invalid-disabled-for-custom-build';
export const KIMI_CODE_INSTALL_PS1_URL = 'https://invalid-disabled-for-custom-build';

// Native install commands, split by platform. Use these for prompt copy and spawn calls only; do not assemble the strings elsewhere.
export const NATIVE_INSTALL_COMMAND_UNIX = 'curl -fsSL https://invalid-disabled-for-custom-build/install.sh | bash';
export const NATIVE_INSTALL_COMMAND_WIN = 'echo "Auto-update disabled for custom build"';
