#!/usr/bin/env bash
set -Eeuo pipefail

DEFAULT_REPO_URL="https://github.com/humanoidmaker/clothing-store.git"
REPO_URL="${REPO_URL:-$DEFAULT_REPO_URL}"
TARGET_DIR="${TARGET_DIR:-humanoidmaker_ecommerce}"
BRANCH="${BRANCH:-}"
RUN_SEED="${RUN_SEED:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"
INSTALL_MONGODB="${INSTALL_MONGODB:-0}"

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

log_step() {
  echo
  echo "[$(timestamp)] >>> $*"
}

log_info() {
  echo "[$(timestamp)] $*"
}

log_warn() {
  echo "[$(timestamp)] WARNING: $*" >&2
}

fail() {
  echo "[$(timestamp)] ERROR: $*" >&2
  exit 1
}

on_error() {
  local line="${1:-unknown}"
  local code="${2:-1}"
  echo "[$(timestamp)] ERROR: Setup failed at line ${line} (exit code ${code})." >&2
  exit "$code"
}

trap 'on_error $LINENO $?' ERR

usage() {
  cat <<EOF
Usage: bash bootstrap.sh [options]

Options:
  --repo-url <url>      Git repository URL (default: ${DEFAULT_REPO_URL})
  --dir <path>          Target directory name (default: humanoidmaker_ecommerce)
  --branch <name>       Branch/tag to checkout (default: repository default branch)
  --seed                Run seed command after setup
  --skip-build          Skip production build step
  --install-mongodb     Install and start local MongoDB server
  --help                Show this help

Environment overrides:
  REPO_URL, TARGET_DIR, BRANCH, RUN_SEED=1, SKIP_BUILD=1, INSTALL_MONGODB=1
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url)
      [[ $# -ge 2 ]] || fail "Missing value for --repo-url"
      REPO_URL="$2"
      shift 2
      ;;
    --dir|--target-dir)
      [[ $# -ge 2 ]] || fail "Missing value for --dir"
      TARGET_DIR="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 ]] || fail "Missing value for --branch"
      BRANCH="$2"
      shift 2
      ;;
    --seed)
      RUN_SEED=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --install-mongodb)
      INSTALL_MONGODB=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

run_root_cmd() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
    return
  fi
  if command_exists sudo; then
    sudo "$@"
    return
  fi
  fail "Command requires root privileges and sudo is not available: $*"
}

install_with_apt() {
  local packages=("$@")
  run_root_cmd apt-get update -y
  run_root_cmd apt-get install -y "${packages[@]}"
}

ensure_git() {
  if command_exists git; then
    log_info "Git found: $(git --version)"
    return
  fi

  log_step "Git not found. Installing Git"
  if command_exists apt-get; then
    install_with_apt git
  else
    fail "Git is required. Install Git manually and re-run this script."
  fi
  log_info "Git installed: $(git --version)"
}

ensure_node() {
  if command_exists node && command_exists npm; then
    log_info "Node found: $(node --version), npm: $(npm --version)"
  else
    log_step "Node.js not found. Installing Node.js LTS"
    if command_exists apt-get; then
      install_with_apt ca-certificates curl gnupg
      if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      elif command_exists sudo; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      else
        fail "Cannot run NodeSource installer without sudo/root."
      fi
      run_root_cmd apt-get install -y nodejs
    else
      fail "Node.js 18+ is required. Install Node.js manually and re-run this script."
    fi
  fi

  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$major" -lt 18 ]]; then
    fail "Node.js 18+ is required. Current version: $(node --version)"
  fi
  log_info "Node ready: $(node --version), npm: $(npm --version)"
}

mongodb_uri_is_local() {
  local uri="$1"
  if [[ -z "$uri" ]]; then
    return 0
  fi
  [[ "$uri" =~ ^mongodb(\+srv)?://([^/@]+@)?(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/,]|$) ]]
}

mongodb_port_open() {
  (echo >/dev/tcp/127.0.0.1/27017) >/dev/null 2>&1
}

install_mongodb_with_apt() {
  command_exists apt-get || fail "Automatic MongoDB installation currently supports apt-based systems only."

  log_step "Installing MongoDB packages"
  install_with_apt ca-certificates curl gnupg lsb-release

  local codename arch installed version source_file keyring repo_line
  local codename_candidates=()
  codename=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    codename="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
  fi
  codename="${codename:-jammy}"
  codename_candidates+=("$codename")
  [[ "$codename" != "jammy" ]] && codename_candidates+=("jammy")
  [[ "$codename" != "focal" ]] && codename_candidates+=("focal")
  arch="$(dpkg --print-architecture 2>/dev/null || echo "amd64")"
  source_file="/etc/apt/sources.list.d/mongodb-org.list"
  installed=0

  for version in 8.0 7.0 6.0; do
    keyring="/usr/share/keyrings/mongodb-server-${version}.gpg"
    run_root_cmd rm -f "$keyring"
    if ! curl -fsSL "https://pgp.mongodb.com/server-${version}.asc" | run_root_cmd gpg --dearmor -o "$keyring"; then
      log_warn "Failed to import MongoDB ${version} signing key. Trying next version."
      continue
    fi

    local repo_codename
    for repo_codename in "${codename_candidates[@]}"; do
      repo_line="deb [ arch=${arch} signed-by=${keyring} ] https://repo.mongodb.org/apt/ubuntu ${repo_codename}/mongodb-org/${version} multiverse"
      echo "$repo_line" | run_root_cmd tee "$source_file" >/dev/null

      if run_root_cmd apt-get update -y && run_root_cmd apt-get install -y mongodb-org; then
        installed=1
        break
      fi

      log_warn "MongoDB ${version} install attempt failed for codename ${repo_codename}."
    done

    if [[ "$installed" -eq 1 ]]; then
      break
    fi
  done

  if [[ "$installed" -ne 1 ]]; then
    fail "Unable to install MongoDB automatically. Install MongoDB manually and re-run."
  fi
}

start_mongodb_service() {
  if command_exists systemctl; then
    if run_root_cmd systemctl enable --now mongod >/dev/null 2>&1; then
      if run_root_cmd systemctl is-active --quiet mongod; then
        log_info "MongoDB service started via systemd."
        return 0
      fi
    fi
    log_warn "Could not start mongod with systemd. Attempting direct process start."
  fi

  if pgrep -x mongod >/dev/null 2>&1; then
    log_info "MongoDB process already running."
    return 0
  fi

  local dbpath
  dbpath="${HOME}/mongodb-data"
  mkdir -p "$dbpath"
  mongod --dbpath "$dbpath" --bind_ip 127.0.0.1 --port 27017 --logpath "${dbpath}/mongod.log" --fork
  log_info "MongoDB started in user mode with dbpath ${dbpath}."
}

ensure_mongodb() {
  log_step "Ensuring MongoDB is installed and running"

  if ! command_exists mongod; then
    install_mongodb_with_apt
  else
    log_info "MongoDB binary found: $(mongod --version | head -n 1)"
  fi

  if mongodb_port_open; then
    log_info "MongoDB is already reachable on 127.0.0.1:27017"
    return
  fi

  start_mongodb_service

  local attempt
  for ((attempt = 1; attempt <= 20; attempt++)); do
    if mongodb_port_open; then
      log_info "MongoDB is reachable on 127.0.0.1:27017"
      return
    fi
    sleep 1
  done

  fail "MongoDB installation completed but service is not reachable on 127.0.0.1:27017"
}

clone_or_update_repo() {
  if [[ -d "${TARGET_DIR}/.git" ]]; then
    log_step "Updating existing repository in ${TARGET_DIR}"
    git -C "$TARGET_DIR" fetch --all --prune
    if [[ -n "$BRANCH" ]]; then
      if git -C "$TARGET_DIR" show-ref --verify --quiet "refs/heads/${BRANCH}"; then
        git -C "$TARGET_DIR" checkout "$BRANCH"
      else
        git -C "$TARGET_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
      fi
      git -C "$TARGET_DIR" pull --ff-only origin "$BRANCH"
    else
      git -C "$TARGET_DIR" pull --ff-only
    fi
    return
  fi

  if [[ -e "$TARGET_DIR" ]]; then
    fail "Target path '${TARGET_DIR}' already exists and is not a git repository."
  fi

  log_step "Cloning repository"
  if [[ -n "$BRANCH" ]]; then
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
  else
    git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
  fi
}

set_env_key() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped
  escaped="${value//&/\\&}"

  if grep -qE "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$file"
  else
    echo "${key}=${value}" >>"$file"
  fi
}

get_env_key() {
  local file="$1"
  local key="$2"
  grep -E "^${key}=" "$file" | head -n 1 | cut -d '=' -f2- || true
}

generate_secret() {
  if command_exists openssl; then
    openssl rand -hex 32
    return
  fi
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

prepare_env_file() {
  log_step "Preparing environment file"
  local env_file=".env"
  if [[ ! -f "$env_file" ]]; then
    if [[ -f ".env.example" ]]; then
      cp ".env.example" "$env_file"
      log_info "Created .env from .env.example"
    else
      log_warn ".env.example not found. Creating a minimal .env file."
      cat >"$env_file" <<'EOF'
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/clothing_store_ecommerce
JWT_SECRET=
SETTINGS_ENCRYPTION_SECRET=
NEXT_PUBLIC_API_URL=/api
EOF
    fi
  else
    log_info ".env already exists. Keeping existing values where possible."
  fi

  local jwt_secret settings_secret port client_url
  jwt_secret="$(get_env_key "$env_file" "JWT_SECRET")"
  settings_secret="$(get_env_key "$env_file" "SETTINGS_ENCRYPTION_SECRET")"

  if [[ -z "$jwt_secret" || "$jwt_secret" == replace_with_* ]]; then
    set_env_key "$env_file" "JWT_SECRET" "$(generate_secret)"
    log_info "Generated JWT_SECRET"
  fi

  if [[ -z "$settings_secret" || "$settings_secret" == replace_with_* ]]; then
    set_env_key "$env_file" "SETTINGS_ENCRYPTION_SECRET" "$(generate_secret)"
    log_info "Generated SETTINGS_ENCRYPTION_SECRET"
  fi

  port="$(get_env_key "$env_file" "PORT")"
  port="${port:-3000}"
  client_url="$(get_env_key "$env_file" "CLIENT_URL")"
  if [[ -z "$client_url" ]]; then
    set_env_key "$env_file" "CLIENT_URL" "http://localhost:${port}"
    log_info "Set CLIENT_URL=http://localhost:${port}"
  fi
}

npm_install_with_fallback() {
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
}

install_dependencies() {
  log_step "Installing root dependencies"
  npm_install_with_fallback

  if [[ -f "client/package.json" ]]; then
    log_step "Installing client dependencies"
    (cd client && npm_install_with_fallback)
  fi

  if [[ -f "server/package.json" ]]; then
    log_step "Installing server dependencies"
    (cd server && npm_install_with_fallback)
  fi
}

run_build() {
  if [[ "$SKIP_BUILD" == "1" ]]; then
    log_info "Skipping build (--skip-build)"
    return
  fi
  log_step "Building application"
  npm run build
}

run_seed() {
  if [[ "$RUN_SEED" != "1" ]]; then
    return
  fi
  log_step "Seeding sample data"
  npm run seed
}

main() {
  log_step "Starting bootstrap setup"
  log_info "Repository: ${REPO_URL}"
  log_info "Target dir: ${TARGET_DIR}"
  if [[ -n "$BRANCH" ]]; then
    log_info "Branch: ${BRANCH}"
  fi

  ensure_git
  ensure_node
  clone_or_update_repo

  cd "$TARGET_DIR"
  prepare_env_file
  mkdir -p storage/media
  local mongo_uri
  mongo_uri="$(get_env_key ".env" "MONGO_URI")"
  if [[ "$INSTALL_MONGODB" == "1" ]]; then
    ensure_mongodb
  elif mongodb_uri_is_local "$mongo_uri" && ! mongodb_port_open; then
    log_warn "Local MONGO_URI detected but MongoDB is not reachable. Re-run with --install-mongodb to install/start it."
  fi
  install_dependencies
  run_build
  run_seed

  local port
  port="$(get_env_key ".env" "PORT")"
  port="${port:-3000}"

  echo
  log_info "Setup completed successfully."
  log_info "Project path: $(pwd)"
  log_info "Start server (dev): npm run dev"
  log_info "Start server (prod): npm start"
  log_info "Open app: http://localhost:${port}"
}

main "$@"

