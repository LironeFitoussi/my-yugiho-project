#!/usr/bin/env bash
# Installs tools that have no devcontainer feature: Render CLI + agent skills,
# AWS CDK, and DynamoDB Local. Idempotent — safe to re-run.
set -euo pipefail

RENDER_CLI_VERSION="2.28.0"
AWS_CDK_VERSION="2.1146.0"
DDB_LOCAL_DIR="${HOME}/.dynamodb-local"
BIN_DIR="${HOME}/.local/bin"

mkdir -p "${BIN_DIR}"
tmp="$(mktemp -d)"
trap 'rm -rf "${tmp}"' EXIT

case "$(uname -m)" in
  x86_64) arch=amd64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "unsupported arch $(uname -m)" >&2; exit 1 ;;
esac

# Render CLI (pinned, checksum-verified)
if [[ "$("${BIN_DIR}/render" --version 2>/dev/null)" != *"v${RENDER_CLI_VERSION}"* ]]; then
  base="https://github.com/render-oss/cli/releases/download/v${RENDER_CLI_VERSION}"
  zip="cli_${RENDER_CLI_VERSION}_linux_${arch}.zip"
  curl -fsSL -o "${tmp}/${zip}" "${base}/${zip}"
  curl -fsSL -o "${tmp}/SHA256SUMS" "${base}/cli_${RENDER_CLI_VERSION}_SHA256SUMS"
  (cd "${tmp}" && grep " ${zip}\$" SHA256SUMS | sha256sum -c -)
  unzip -q -o "${tmp}/${zip}" -d "${tmp}/render"
  install -m 0755 "${tmp}/render/cli_v${RENDER_CLI_VERSION}" "${BIN_DIR}/render"
fi

# Render agent skills for Claude Code / Codex / Copilot (user scope, so not committed)
if [ ! -d "${HOME}/.claude/skills/render-cli" ]; then
  "${BIN_DIR}/render" skills install --scope user --confirm -o text \
    || echo "warning: render skills install failed; re-run this script later" >&2
fi

# AWS CDK CLI
if [[ "$(cdk --version 2>/dev/null)" != "${AWS_CDK_VERSION} "* ]]; then
  npm install -g "aws-cdk@${AWS_CDK_VERSION}"
fi

# DynamoDB Local (Java jar; started via `npm run db:local`)
if [ ! -f "${DDB_LOCAL_DIR}/DynamoDBLocal.jar" ]; then
  mkdir -p "${DDB_LOCAL_DIR}"
  curl -fsSL https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz \
    | tar -xz -C "${DDB_LOCAL_DIR}"
fi

echo "render: $("${BIN_DIR}/render" --version 2>/dev/null | head -1)"
echo "cdk: $(cdk --version)"
echo "dynamodb-local: ${DDB_LOCAL_DIR}/DynamoDBLocal.jar"
