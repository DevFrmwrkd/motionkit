#!/usr/bin/env bash

set -euo pipefail

cleanup_appledouble() {
  find .next .open-next -name '._*' -type f -delete 2>/dev/null || true
}

ensure_worker_runtime_links() {
  if [[ -d ../node_modules/@swc/helpers ]]; then
    mkdir -p node_modules/@swc
    ln -sfn ../../../node_modules/@swc/helpers node_modules/@swc/helpers
  fi
}

resolve_symlink_target() {
  local link_path="$1"
  local link_dir
  local target

  link_dir="$(dirname "$link_path")"
  target="$(readlink "$link_path")"

  (
    cd "$link_dir"
    cd "$target"
    pwd
  )
}

materialize_standalone_next() {
  local standalone_next=".next/standalone/node_modules/next"

  if [[ -L "$standalone_next" ]]; then
    local source_dir
    source_dir="$(resolve_symlink_target "$standalone_next")"
    rm "$standalone_next"
    cp -R "$source_dir" "$standalone_next"
  fi
}

normalize_standalone_layout() {
  local nested_root=".next/standalone/app"
  local standalone_root=".next/standalone"

  if [[ -d "$nested_root/.next" ]]; then
    if [[ ! -e "$standalone_root/.next" ]]; then
      mv "$nested_root/.next" "$standalone_root/.next"
    fi

    if [[ -f "$nested_root/server.js" && ! -e "$standalone_root/server.js" ]]; then
      mv "$nested_root/server.js" "$standalone_root/server.js"
    fi

    if [[ -d "$nested_root/node_modules" ]]; then
      mkdir -p "$standalone_root/node_modules"
      cp -RL "$nested_root/node_modules/." "$standalone_root/node_modules/"
    fi
  fi
}

stop_cleaner() {
  if [[ -n "${cleaner_pid:-}" ]]; then
    kill "${cleaner_pid}" 2>/dev/null || true
    wait "${cleaner_pid}" 2>/dev/null || true
  fi
}

prepare_build_env() {
  local env_file=".env.local"
  build_env_backup=""
  build_env_created="false"

  if [[ -f "$env_file" ]]; then
    build_env_backup="$(mktemp .env.local.build-backup.XXXXXX)"
    mv "$env_file" "$build_env_backup"
  fi

  : > "$env_file"
  build_env_created="true"

  if [[ -n "${build_env_backup:-}" ]]; then
    grep -E '^NEXT_PUBLIC_[A-Z0-9_]*=' "$build_env_backup" >> "$env_file" || true
  fi

  # Allow shell env to override file value
  if [[ -n "${NEXT_PUBLIC_CONVEX_URL:-}" ]]; then
    sed -i '' '/^NEXT_PUBLIC_CONVEX_URL=/d' "$env_file"
    printf 'NEXT_PUBLIC_CONVEX_URL=%s\n' "$NEXT_PUBLIC_CONVEX_URL" >> "$env_file"
  fi
}

restore_build_env() {
  local env_file=".env.local"

  if [[ -n "${build_env_backup:-}" ]]; then
    rm -f "$env_file"
    mv "$build_env_backup" "$env_file"
    build_env_backup=""
    build_env_created="false"
    return
  fi

  if [[ "${build_env_created:-false}" == "true" ]]; then
    rm -f "$env_file"
    build_env_created="false"
  fi
}

trap 'restore_build_env; stop_cleaner; cleanup_appledouble' EXIT

export COPYFILE_DISABLE=1
export COPY_EXTENDED_ATTRIBUTES_DISABLE=1

ensure_worker_runtime_links
cleanup_appledouble
prepare_build_env

while true; do
  cleanup_appledouble
  sleep 0.2
done &
cleaner_pid=$!

pnpm build
normalize_standalone_layout
materialize_standalone_next
cleanup_appledouble
opennextjs-cloudflare build --skipBuild
