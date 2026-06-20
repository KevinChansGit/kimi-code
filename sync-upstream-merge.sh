#!/usr/bin/env bash
# sync-upstream-merge.sh — 用 merge 方式同步官方主线（不强制推送，保留合并历史）
# 适合：不想强制推送，或与他人协作的场景

set -e

BRANCH="${1:-main}"
echo "🔄 开始同步 upstream/$BRANCH -> origin/$BRANCH (merge 模式)"

git fetch upstream
git checkout "$BRANCH"

# merge 方式不会改写历史，可以正常 push
git merge "upstream/$BRANCH" --no-edit

git push origin "$BRANCH"

echo "✅ 同步完成！origin/$BRANCH 已合并 upstream/$BRANCH 的最新更新。"
