#!/usr/bin/env bash
# =============================================================================
# Hackathon Hub - Universal Start Script (durable supervisor edition)
# Works on Linux, macOS, Windows (WSL/Git Bash)
# =============================================================================
#
# Features:
# - Auto-detects OS and package manager
# - Creates .env files from templates if missing
# - Validates prerequisites (Node.js, npm, PostgreSQL)
# - Starts PostgreSQL via Docker if not available locally
# - Frees occupied ports before starting (auto-reclaim)
# - Runs database migrations and seeds
# - SUPERVISED services: backend/frontend auto-restart on crash with backoff
# - All service output captured to logs/ (nothing goes to /dev/null)
# - Update watcher: reinstalls deps & restarts services when package.json,
#   lockfiles, tsconfig, vite config, .env files — or start.sh itself — change
# - Health monitor: restarts services that stop answering HTTP checks
# - Graceful shutdown on Ctrl+C
#
# Usage: ./start.sh [options]
# Options:
#   --no-db          Skip database setup (use existing DB)
#   --docker-db      Force using Docker for PostgreSQL
#   --no-seed        Skip database seeding
#   --prod           Production mode (build + start)
#   --no-watch       Disable update watcher & health monitor
#   --help           Show this help
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"
CLIENT_DIR="${PROJECT_ROOT}/client"
LOG_DIR="${PROJECT_ROOT}/logs"
RUN_DIR="${PROJECT_ROOT}/.run"

# Database
DB_NAME="hackathon_hub"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Ports
BACKEND_PORT="${BACKEND_PORT:-5000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Version requirements
REQUIRED_NODE_VERSION="18"
REQUIRED_NPM_VERSION="9"

# Docker PostgreSQL
DOCKER_DB_CONTAINER="hackathon-hub-postgres"
DOCKER_DB_IMAGE="postgres:16-alpine"

# Flags
SKIP_DB=false
FORCE_DOCKER_DB=false
SKIP_SEED=false
PROD_MODE=false
WATCH_MODE=true  # Update watcher + health monitor enabled by default

# Supervisor tuning
BACKOFF_MIN=1
BACKOFF_MAX=30
HEALTH_FAIL_THRESHOLD=3      # consecutive failed checks before restart
MONITOR_INTERVAL=3           # seconds between update/health checks

DOCKER_DB_STARTED=false
CLEANED_UP=false

mkdir -p "$LOG_DIR" "$RUN_DIR"

# -----------------------------------------------------------------------------
# Colors & Helpers
# -----------------------------------------------------------------------------
if [[ -t 1 ]] && [[ "${TERM:-}" != "dumb" ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
    CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' MAGENTA='' BOLD='' DIM='' NC=''
fi

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()    { echo -e "\n${CYAN}==== $* ====${NC}"; }
log_debug()   { [[ "${DEBUG:-}" == "1" ]] && echo -e "${DIM}[DEBUG]${NC} $*" || true; }

# Portable mtime (epoch seconds); 0 if missing
mtime_of() { stat -c '%Y' "$1" 2>/dev/null || stat -f '%m' "$1" 2>/dev/null || echo 0; }

# Newest mtime among existing files
newest_mtime() {
    local newest=0 t
    for f in "$@"; do
        t=$(mtime_of "$f")
        (( t > newest )) && newest=$t
    done
    echo "$newest"
}

# -----------------------------------------------------------------------------
# Supervisor: auto-restart services on crash, capture logs
# -----------------------------------------------------------------------------
# supervise <name> <workdir> <command...>
supervise() {
    local name=$1 dir=$2
    shift 2
    local child_pid_file="$RUN_DIR/$name.child.pid"
    local sup_pid_file="$RUN_DIR/$name.supervisor.pid"

    (
        local backoff=$BACKOFF_MIN
        while supervisor_enabled; do
            echo -e "$(date '+%H:%M:%S') [supervisor] starting $name" >> "$LOG_DIR/$name.log"
            if command -v setsid &>/dev/null; then
                (cd "$dir" && exec setsid "$@") >> "$LOG_DIR/$name.log" 2>&1 &
            else
                (cd "$dir" && exec "$@") >> "$LOG_DIR/$name.log" 2>&1 &
            fi
            local pid=$!
            echo "$pid" > "$child_pid_file"
            local rc=0
            wait "$pid" || rc=$?
            rm -f "$child_pid_file"
            supervisor_enabled || break
            echo -e "$(date '+%H:%M:%S') [supervisor] $name exited (code $rc), restarting in ${backoff}s" >> "$LOG_DIR/$name.log"
            sleep "$backoff"
            (( backoff < BACKOFF_MAX )) && backoff=$(( backoff * 2 ))
            (( backoff > BACKOFF_MAX )) && backoff=$BACKOFF_MAX
        done
    ) &
    echo $! > "$sup_pid_file"
    log_success "$name supervisor started (log: logs/$name.log)"
}

supervisor_enabled() { [[ -f "$RUN_DIR/enabled" ]]; }

# kill_service_child <pid> — kill a service's whole process tree.
# The child is a setsid session leader (group == session), but tools like
# tsx watch move their inner server into a different process group within
# the same session, so a plain group-kill leaks them. Sweep by session too.
kill_service_child() {
    local pid=$1
    local sweep_pids=""
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    if ps -eo pid=,sid= >/dev/null 2>&1; then
        sweep_pids=$(ps -eo pid=,sid= 2>/dev/null | awk -v p="$pid" '$2==p {print $1}')
        # shellcheck disable=SC2086
        [[ -n "$sweep_pids" ]] && kill $sweep_pids 2>/dev/null || true
    fi
    sleep 2
    kill -9 -- "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    if ps -eo pid=,sid= >/dev/null 2>&1; then
        sweep_pids=$(ps -eo pid=,sid= 2>/dev/null | awk -v p="$pid" '$2==p {print $1}')
        # shellcheck disable=SC2086
        [[ -n "$sweep_pids" ]] && kill -9 $sweep_pids 2>/dev/null || true
    fi
}

# restart_service <name> — kills the child; supervisor loop starts a fresh one
restart_service() {
    local name=$1
    local child_pid_file="$RUN_DIR/$name.child.pid"
    log_warn "[RESTART] $name restarting..."
    echo -e "$(date '+%H:%M:%S') [supervisor] restart requested for $name" >> "$LOG_DIR/$name.log"
    if [[ -f "$child_pid_file" ]]; then
        kill_service_child "$(cat "$child_pid_file")"
    fi
}

stop_service_tree() {
    local name=$1
    local child_pid_file="$RUN_DIR/$name.child.pid"
    local sup_pid_file="$RUN_DIR/$name.supervisor.pid"
    if [[ -f "$sup_pid_file" ]]; then
        kill "$(cat "$sup_pid_file")" 2>/dev/null || true
        rm -f "$sup_pid_file"
    fi
    if [[ -f "$child_pid_file" ]]; then
        kill_service_child "$(cat "$child_pid_file")"
        rm -f "$child_pid_file"
    fi
}

# -----------------------------------------------------------------------------
# Port reclamation: free a port owned by a stale process
# -----------------------------------------------------------------------------
free_port() {
    local port=$1 name=$2
    local pids=""
    if command -v lsof &>/dev/null; then
        pids=$(lsof -ti ":$port" 2>/dev/null || true)
    elif command -v fuser &>/dev/null; then
        pids=$(fuser "$port/tcp" 2>/dev/null || true)
    fi
    if [[ -n "$pids" ]]; then
        log_warn "Port $port ($name) is in use by PID(s): $pids — reclaiming"
        # shellcheck disable=SC2086
        kill $pids 2>/dev/null || true
        sleep 1
        # shellcheck disable=SC2086
        kill -9 $pids 2>/dev/null || true
        log_success "Port $port reclaimed"
    fi
}

# -----------------------------------------------------------------------------
# Update watcher & health monitor
# -----------------------------------------------------------------------------
# Debounced watcher: config/dependency/env changes -> reinstall (if needed) + restart.
# start.sh itself is watched: editing this script triggers a full reload.
start_monitor() {
    (
        # Snapshot mtimes at startup
        newest_mtime "$SERVER_DIR/package.json" "$SERVER_DIR/package-lock.json" "$SERVER_DIR/tsconfig.json" "$SERVER_DIR/.env" "$SERVER_DIR"/src/db/migrations/*.sql > "$RUN_DIR/stamp.backend"
        newest_mtime "$CLIENT_DIR/package.json" "$CLIENT_DIR/package-lock.json" "$CLIENT_DIR/tsconfig.json" "$CLIENT_DIR/tsconfig.app.json" "$CLIENT_DIR/vite.config.ts" "$CLIENT_DIR/.env" > "$RUN_DIR/stamp.frontend"
        newest_mtime "$PROJECT_ROOT/.env" "$PROJECT_ROOT/docker-compose.yml" "$PROJECT_ROOT/start.sh" > "$RUN_DIR/stamp.root"
        local backend_fails=0 frontend_fails=0

        while supervisor_enabled; do
            sleep "$MONITOR_INTERVAL"

            # --- Root-level changes: full reload of both services ---
            if [[ $(newest_mtime "$PROJECT_ROOT/.env" "$PROJECT_ROOT/docker-compose.yml" "$PROJECT_ROOT/start.sh") -gt $(cat "$RUN_DIR/stamp.root") ]]; then
                log_warn "[WATCH] Root config or start.sh changed — reloading all services"
                newest_mtime "$PROJECT_ROOT/.env" "$PROJECT_ROOT/docker-compose.yml" "$PROJECT_ROOT/start.sh" > "$RUN_DIR/stamp.root"
                newest_mtime "$SERVER_DIR/package.json" "$SERVER_DIR/package-lock.json" "$SERVER_DIR/tsconfig.json" "$SERVER_DIR/.env" "$SERVER_DIR"/src/db/migrations/*.sql > "$RUN_DIR/stamp.backend"
                newest_mtime "$CLIENT_DIR/package.json" "$CLIENT_DIR/package-lock.json" "$CLIENT_DIR/tsconfig.json" "$CLIENT_DIR/tsconfig.app.json" "$CLIENT_DIR/vite.config.ts" "$CLIENT_DIR/.env" > "$RUN_DIR/stamp.frontend"
                restart_service backend
                restart_service frontend
                continue
            fi

            # --- Backend dependency/config/migration changes ---
            if [[ $(newest_mtime "$SERVER_DIR/package.json" "$SERVER_DIR/package-lock.json" "$SERVER_DIR/tsconfig.json" "$SERVER_DIR/.env" "$SERVER_DIR"/src/db/migrations/*.sql) -gt $(cat "$RUN_DIR/stamp.backend") ]]; then
                log_warn "[WATCH] Backend config or migrations changed — migrating & restarting backend"
                newest_mtime "$SERVER_DIR/package.json" "$SERVER_DIR/package-lock.json" "$SERVER_DIR/tsconfig.json" "$SERVER_DIR/.env" "$SERVER_DIR"/src/db/migrations/*.sql > "$RUN_DIR/stamp.backend"
                if [[ $(newest_mtime "$SERVER_DIR/package.json" "$SERVER_DIR/package-lock.json") -gt $(mtime_of "$SERVER_DIR/node_modules") ]]; then
                    install_deps "$SERVER_DIR" "backend" || log_error "Backend dependency install failed"
                fi
                # Migrate is idempotent (applied files are skipped), so running
                # it here picks up new migrations pulled from Git without a
                # manual `npm run migrate`. Failure is non-fatal: the restart
                # still happens and the health monitor keeps watch.
                if (cd "$SERVER_DIR" && npm run migrate >/dev/null 2>&1); then
                    log_success "[WATCH] Migrations applied (if any were pending)"
                else
                    log_error "[WATCH] Migration run failed — see logs; backend restarting anyway"
                fi
                restart_service backend
            fi

            # --- Frontend dependency/config changes ---
            if [[ $(newest_mtime "$CLIENT_DIR/package.json" "$CLIENT_DIR/package-lock.json" "$CLIENT_DIR/tsconfig.json" "$CLIENT_DIR/tsconfig.app.json" "$CLIENT_DIR/vite.config.ts" "$CLIENT_DIR/.env") -gt $(cat "$RUN_DIR/stamp.frontend") ]]; then
                log_warn "[WATCH] Frontend config changed — reinstalling deps & restarting frontend"
                newest_mtime "$CLIENT_DIR/package.json" "$CLIENT_DIR/package-lock.json" "$CLIENT_DIR/tsconfig.json" "$CLIENT_DIR/tsconfig.app.json" "$CLIENT_DIR/vite.config.ts" "$CLIENT_DIR/.env" > "$RUN_DIR/stamp.frontend"
                if [[ $(newest_mtime "$CLIENT_DIR/package.json" "$CLIENT_DIR/package-lock.json") -gt $(mtime_of "$CLIENT_DIR/node_modules") ]]; then
                    install_deps "$CLIENT_DIR" "frontend" || log_error "Frontend dependency install failed"
                fi
                restart_service frontend
            fi

            # --- Health checks: restart hung/unresponsive services ---
            if curl -sf --max-time 3 "http://localhost:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1; then
                backend_fails=0
            else
                backend_fails=$((backend_fails + 1))
                if (( backend_fails >= HEALTH_FAIL_THRESHOLD )); then
                    log_error "[HEALTH] Backend unresponsive (${backend_fails} failed checks) — restarting"
                    backend_fails=0
                    restart_service backend
                fi
            fi

            if curl -sf --max-time 3 "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
                frontend_fails=0
            else
                frontend_fails=$((frontend_fails + 1))
                if (( frontend_fails >= HEALTH_FAIL_THRESHOLD )); then
                    log_error "[HEALTH] Frontend unresponsive (${frontend_fails} failed checks) — restarting"
                    frontend_fails=0
                    restart_service frontend
                fi
            fi
        done
    ) &
    echo $! > "$RUN_DIR/monitor.pid"
    log_success "Update watcher & health monitor started (interval: ${MONITOR_INTERVAL}s)"
}

stop_monitor() {
    if [[ -f "$RUN_DIR/monitor.pid" ]]; then
        kill "$(cat "$RUN_DIR/monitor.pid")" 2>/dev/null || true
        rm -f "$RUN_DIR/monitor.pid"
    fi
}

# -----------------------------------------------------------------------------
# Cleanup on Exit
# -----------------------------------------------------------------------------
cleanup() {
    [[ "$CLEANED_UP" == "true" ]] && return
    CLEANED_UP=true
    echo -e "\n${YELLOW}Shutting down services...${NC}"

    rm -f "$RUN_DIR/enabled"   # tell supervisors/monitor to stop
    stop_monitor
    stop_service_tree frontend
    stop_service_tree backend

    if [[ "$DOCKER_DB_STARTED" == "true" ]]; then
        log_info "Stopping Docker PostgreSQL container..."
        docker stop "$DOCKER_DB_CONTAINER" >/dev/null 2>&1 || true
        docker rm "$DOCKER_DB_CONTAINER" >/dev/null 2>&1 || true
    fi

    echo -e "${GREEN}All services stopped.${NC}"
}

# -----------------------------------------------------------------------------
# Prerequisite Checks
# -----------------------------------------------------------------------------
check_command() {
    local cmd=$1 install_hint=${2:-}
    if ! command -v "$cmd" &>/dev/null; then
        log_error "$cmd not found."
        [[ -n "$install_hint" ]] && log_info "Install: $install_hint"
        return 1
    fi
    local version
    version=$($cmd --version 2>/dev/null | head -1 || echo "version unknown")
    log_success "$cmd found: $version"
    return 0
}

check_version() {
    local cmd=$1 min_version=$2 version major
    version=$($cmd --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [[ -z "$version" ]]; then
        log_warn "Could not determine $cmd version"
        return 0
    fi
    major=$(echo "$version" | cut -d. -f1)
    if [[ "$major" -lt "$min_version" ]]; then
        log_error "$cmd version $version is too old. Required: >= $min_version"
        return 1
    fi
    log_success "$cmd version $version meets requirement (>= $min_version)"
    return 0
}

# -----------------------------------------------------------------------------
# Environment File Management
# -----------------------------------------------------------------------------
setup_env_files() {
    log_step "Setting up environment files"
    local pair
    for pair in "$PROJECT_ROOT" "$SERVER_DIR" "$CLIENT_DIR"; do
        if [[ ! -f "$pair/.env" && -f "$pair/.env.example" ]]; then
            log_info "Creating $pair/.env from .env.example"
            cp "$pair/.env.example" "$pair/.env"
            # The server (and the migration runner) read DATABASE_URL from
            # server/.env — build it from the DB_* vars this script manages so
            # DB_PASSWORD etc. aren't silently ignored. Passwords with URL
            # special characters (@ / : ?) must be percent-encoded by the user.
            if [[ "$pair" == "$SERVER_DIR" ]]; then
                local db_url="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
                if grep -q '^DATABASE_URL=' "$pair/.env"; then
                    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${db_url}|" "$pair/.env" && rm -f "$pair/.env.bak"
                else
                    printf '\nDATABASE_URL=%s\n' "$db_url" >> "$pair/.env"
                fi
                log_info "server/.env DATABASE_URL built from DB_HOST/DB_PORT/DB_USER/DB_PASSWORD"
            fi
            log_success "Created $pair/.env"
        else
            [[ -f "$pair/.env" ]] && log_success "$pair/.env already exists"
        fi
    done
}

# -----------------------------------------------------------------------------
# Database Functions
# -----------------------------------------------------------------------------
check_docker() {
    if command -v docker &>/dev/null && docker info &>/dev/null; then
        log_success "Docker is available"
        return 0
    fi
    log_warn "Docker not available or not running"
    return 1
}

start_docker_postgres() {
    log_step "Starting PostgreSQL via Docker"

    if docker ps -a --format '{{.Names}}' | grep -q "^${DOCKER_DB_CONTAINER}$"; then
        log_info "Container $DOCKER_DB_CONTAINER exists, starting it..."
        docker start "$DOCKER_DB_CONTAINER" >/dev/null
    else
        log_info "Creating new PostgreSQL container..."
        docker run -d \
            --name "$DOCKER_DB_CONTAINER" \
            -e POSTGRES_DB="$DB_NAME" \
            -e POSTGRES_USER="$DB_USER" \
            -e POSTGRES_PASSWORD="$DB_PASSWORD" \
            -p "$DB_PORT:5432" \
            "$DOCKER_DB_IMAGE" >/dev/null
    fi

    DOCKER_DB_STARTED=true

    log_info "Waiting for PostgreSQL to be ready..."
    local attempt=1 max_attempts=30
    while [[ $attempt -le $max_attempts ]]; do
        if docker exec "$DOCKER_DB_CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null; then
            log_success "PostgreSQL is ready in Docker!"
            return 0
        fi
        printf "\r${YELLOW}[%d/%d]${NC} Waiting for PostgreSQL..." "$attempt" "$max_attempts"
        sleep 1
        ((attempt++))
    done

    printf "\r"
    log_error "PostgreSQL in Docker did not become ready in time"
    return 1
}

check_postgres() {
    log_step "Checking PostgreSQL"

    if command -v pg_isready &>/dev/null; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
            log_success "PostgreSQL is running locally at $DB_HOST:$DB_PORT"
            return 0
        fi
    fi

    log_warn "Local PostgreSQL not available at $DB_HOST:$DB_PORT"

    if [[ "$FORCE_DOCKER_DB" == "true" ]] || check_docker; then
        log_info "Attempting to use Docker for PostgreSQL..."
        if start_docker_postgres; then
            DB_HOST="localhost"
            export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
            log_success "Using Docker PostgreSQL at $DB_HOST:$DB_PORT"
            return 0
        fi
    fi

    log_error "PostgreSQL is not available."
    log_info "Options to fix this:"
    log_info "  1. Start local PostgreSQL (e.g. sudo systemctl start postgresql)"
    log_info "  2. Use Docker: ./start.sh --docker-db"
    log_info "  3. Skip database setup: ./start.sh --no-db (requires external DB)"
    return 1
}

# run_psql — psql locally, or inside the Docker container when the host
# has no PostgreSQL client tools (typical Windows + Docker Desktop setup)
run_psql() {
    if command -v psql &>/dev/null; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$@"
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DOCKER_DB_CONTAINER}$"; then
        docker exec -e PGPASSWORD="$DB_PASSWORD" "$DOCKER_DB_CONTAINER" \
            psql -h localhost -U "$DB_USER" "$@"
    else
        return 127
    fi
}

create_database() {
    log_step "Ensuring database exists: $DB_NAME"

    if run_psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
        log_success "Database '$DB_NAME' already exists"
        return 0
    fi

    log_info "Creating database '$DB_NAME'..."
    if run_psql -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null 2>&1; then
        log_success "Database '$DB_NAME' created"
    else
        log_error "Failed to create database. Options to fix this:"
        log_info "  1. Install PostgreSQL client tools (psql) and create it manually:"
        log_info "     createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME"
        log_info "  2. Use Docker: ./start.sh --docker-db"
        return 1
    fi
}

run_migrations() {
    log_step "Running database migrations"
    cd "$SERVER_DIR"
    if npm run migrate 2>&1; then
        log_success "Migrations completed"
    else
        log_error "Migrations failed"
        cd "$PROJECT_ROOT"
        return 1
    fi
    cd "$PROJECT_ROOT"
}

run_seeds() {
    if [[ "$SKIP_SEED" == "true" ]]; then
        log_warn "Skipping database seeding (--no-seed flag)"
        return 0
    fi
    log_step "Seeding database"
    cd "$SERVER_DIR"
    if npm run seed 2>&1; then
        log_success "Database seeded successfully"
    else
        log_warn "Seeding failed (may be expected if data already exists)"
    fi
    cd "$PROJECT_ROOT"
}

# -----------------------------------------------------------------------------
# Dependency Installation
# -----------------------------------------------------------------------------
detect_package_manager() {
    local dir=$1
    if [[ -f "$dir/pnpm-lock.yaml" ]] && command -v pnpm &>/dev/null; then
        echo "pnpm"
    elif [[ -f "$dir/yarn.lock" ]] && command -v yarn &>/dev/null; then
        echo "yarn"
    else
        echo "npm"
    fi
}

install_deps() {
    local dir=$1 name=$2

    log_step "Installing $name dependencies"
    cd "$dir"

    [[ -f "package.json" ]] || { log_error "$name package.json not found in $dir"; return 1; }

    local lock_file=""
    for f in pnpm-lock.yaml yarn.lock package-lock.json; do
        [[ -f "$f" ]] && lock_file="$f" && break
    done

    if [[ -d "node_modules" && -n "$lock_file" && "$lock_file" -ot "node_modules" ]]; then
        log_success "$name dependencies already installed (lock file unchanged)"
        cd "$PROJECT_ROOT"
        return 0
    fi

    local pm pm_args=()
    pm=$(detect_package_manager "$dir")
    case "$pm" in
        pnpm) pm_args=("install" "--frozen-lockfile") ;;
        yarn) pm_args=("install" "--frozen-lockfile") ;;
        npm)  [[ -f "package-lock.json" ]] && pm_args=("ci") || pm_args=("install") ;;
    esac

    log_info "Using $pm ${pm_args[*]}"

    local output exit_code=0
    output=$($pm "${pm_args[@]}" 2>&1) || exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        log_success "$name dependencies installed"
    elif echo "$output" | grep -q "EALLOWSCRIPTS"; then
        log_warn "npm scripts restriction detected. Retrying with --ignore-scripts..."
        if $pm "${pm_args[@]}" --ignore-scripts 2>&1; then
            log_success "$name dependencies installed (scripts skipped)"
            log_warn "Some packages may need manual rebuild. Run: cd $dir && npm rebuild"
        else
            log_error "$pm install failed even with --ignore-scripts"
            cd "$PROJECT_ROOT"
            return 1
        fi
    else
        log_error "$pm install failed (exit code: $exit_code)"
        echo "$output"
        cd "$PROJECT_ROOT"
        return 1
    fi

    cd "$PROJECT_ROOT"
}

# -----------------------------------------------------------------------------
# Service Health Checks
# -----------------------------------------------------------------------------
wait_for_service() {
    local url=$1 name=$2 max_attempts=${3:-30} attempt=1
    log_info "Waiting for $name to be ready at $url..."

    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            log_success "$name is ready!"
            return 0
        fi
        printf "\r${YELLOW}[%d/%d]${NC} Waiting for %s..." "$attempt" "$max_attempts" "$name"
        sleep 1
        ((attempt++))
    done

    printf "\r"
    log_error "$name did not become ready in time (checked $url)"
    log_error "Last 20 log lines from logs/:"
    tail -n 20 "$LOG_DIR/"*.log 2>/dev/null || true
    return 1
}

# -----------------------------------------------------------------------------
# Build for Production
# -----------------------------------------------------------------------------
build_production() {
    log_step "Building for production"

    log_info "Building backend..."
    (cd "$SERVER_DIR" && npm run build) || { log_error "Backend build failed"; return 1; }
    log_success "Backend built successfully"

    log_info "Building frontend..."
    (cd "$CLIENT_DIR" && npm run build) || { log_error "Frontend build failed"; return 1; }
    log_success "Frontend built successfully"
}

# -----------------------------------------------------------------------------
# Start Services (supervised)
# -----------------------------------------------------------------------------
start_backend() {
    log_step "Starting backend on port $BACKEND_PORT"
    free_port "$BACKEND_PORT" "backend"

    if [[ "$PROD_MODE" == "true" ]]; then
        supervise backend "$SERVER_DIR" env NODE_ENV=production PORT="$BACKEND_PORT" node dist/index.js
    else
        supervise backend "$SERVER_DIR" env NODE_ENV=development PORT="$BACKEND_PORT" npm run dev
    fi

    wait_for_service "http://localhost:$BACKEND_PORT/api/v1/health" "Backend API" 60 || return 1
}

start_frontend() {
    log_step "Starting frontend on port $FRONTEND_PORT"
    free_port "$FRONTEND_PORT" "frontend"

    if [[ "$PROD_MODE" == "true" ]]; then
        supervise frontend "$CLIENT_DIR" env PORT="$FRONTEND_PORT" npm run preview
    else
        supervise frontend "$CLIENT_DIR" env PORT="$FRONTEND_PORT" npm run dev
    fi

    wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" 60 || return 1
}

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------
show_help() {
    cat << 'EOF'
Hackathon Hub - Universal Start Script (durable supervisor edition)

Usage: ./start.sh [options]

Options:
  --no-db           Skip database setup (use existing database)
  --docker-db       Force using Docker for PostgreSQL
  --no-seed         Skip database seeding
  --prod            Production mode (build + start)
  --no-watch        Disable update watcher & health monitor
  --help            Show this help message

Environment Variables:
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD   PostgreSQL connection (defaults: localhost, 5432, postgres, postgres)
                                           When server/.env is first created, its DATABASE_URL is
                                           built from these (percent-encode special chars in passwords).
  BACKEND_PORT, FRONTEND_PORT              Service ports (defaults: 5000, 5173)
  DEBUG=1                                  Enable debug output

Durability features (dev mode, default):
  - Supervisor: crashed backend/frontend processes restart automatically
    (exponential backoff 1s → 30s), output always appended to logs/.
  - Update watcher: editing package.json/lockfiles/tsconfig/vite config/.env
    (or start.sh itself) reinstalls dependencies if needed and restarts the
    affected service(s) — no manual restart after big updates.
  - Migration watcher: new files in server/src/db/migrations/ (e.g. pulled
    from Git) trigger `npm run migrate` (idempotent) and a backend restart —
    no manual migrate step after pulling.
  - Health monitor: services that stop answering HTTP checks get restarted.
  - Port reclamation: occupied service ports are freed at startup.
  - Source-level hot reload is still handled by tsx watch (backend)
    and Vite HMR (frontend); the watcher only handles heavier changes.

Logs:
  logs/backend.log    - all backend output (crashes included)
  logs/frontend.log   - all frontend output
  tail -f logs/*.log  - follow both

Examples:
  ./start.sh                    # Development, supervised + auto-reload (DEFAULT)
  ./start.sh --no-watch         # Development without watcher/health monitor
  ./start.sh --docker-db        # Use Docker for PostgreSQL
  ./start.sh --prod             # Production build and start
  DEBUG=1 ./start.sh            # Debug mode

EOF
}

# -----------------------------------------------------------------------------
# Parse Arguments
# -----------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-db)     SKIP_DB=true; shift ;;
            --docker-db) FORCE_DOCKER_DB=true; shift ;;
            --no-seed)   SKIP_SEED=true; shift ;;
            --prod)      PROD_MODE=true; shift ;;
            --no-watch)  WATCH_MODE=false; shift ;;
            --help|-h)   show_help; exit 0 ;;
            *)           log_error "Unknown option: $1"; show_help; exit 1 ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# Main Start Sequence
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"

    trap cleanup EXIT INT TERM

    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           Hackathon Hub - Starting Up                    ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    if [[ "$PROD_MODE" == "true" ]]; then
        log_info "Running in ${BOLD}PRODUCTION${NC} mode"
    else
        log_info "Running in ${BOLD}DEVELOPMENT${NC} mode"
    fi

    # Enable supervisors/monitors (flag file consumed by background loops)
    touch "$RUN_DIR/enabled"

    # 1. Check prerequisites
    log_step "Checking prerequisites"
    check_command node "https://nodejs.org/" || exit 1
    check_version node "$REQUIRED_NODE_VERSION" || exit 1
    check_command npm "https://nodejs.org/" || exit 1
    check_version npm "$REQUIRED_NPM_VERSION" || exit 1
    check_command curl "https://curl.se/" || exit 1
    if ! check_command psql "PostgreSQL client tools" 2>/dev/null; then
        log_warn "psql not found - will use Docker for database if available"
    fi

    # 2. Setup environment files
    setup_env_files

    # 3. Database setup (unless skipped)
    if [[ "$SKIP_DB" != "true" ]]; then
        check_postgres || exit 1
        create_database || exit 1
        run_migrations || exit 1
        run_seeds
    else
        log_warn "Skipping database setup (--no-db flag)"
    fi

    # 4. Install dependencies
    install_deps "$SERVER_DIR" "backend" || exit 1
    install_deps "$CLIENT_DIR" "frontend" || exit 1

    # 5. Build if production mode
    if [[ "$PROD_MODE" == "true" ]]; then
        build_production || exit 1
    fi

    # 6. Start backend
    start_backend || exit 1

    # 7. Start frontend
    start_frontend || exit 1

    # 8. Start update watcher & health monitor
    if [[ "$WATCH_MODE" == "true" ]]; then
        start_monitor
    fi

    # 9. Success!
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  All services started successfully! 🎉                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo -e "  ${CYAN}Frontend:${NC}     http://localhost:$FRONTEND_PORT/"
    echo -e "  ${CYAN}Backend API:${NC}  http://localhost:$BACKEND_PORT/api/v1/health"
    echo -e "  ${CYAN}Logs:${NC}         tail -f $LOG_DIR/backend.log $LOG_DIR/frontend.log"
    if [[ "$WATCH_MODE" == "true" ]]; then
        echo -e "  ${MAGENTA}Supervisor:${NC}   auto-restart on crash, auto-reload on config/dep changes"
    fi
    echo -e "    ${BOLD}Admin:${NC}  admin@hackathon.com / admin123"
    echo -e "    ${BOLD}User:${NC}   user@hackathon.com  / user123"
    echo -e "\n  ${YELLOW}Press Ctrl+C to stop all services${NC}\n"

    # Wait until any tracked child exits; supervisors run until disabled
    wait
}

# Run main
main "$@"
