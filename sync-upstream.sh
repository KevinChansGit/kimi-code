#!/usr/bin/env bash
# sync-upstream.sh — 一键同步官方主线到当前分支
# 用法: bash sync-upstream.sh [branch_name]
# 默认同步到 main 分支

set -e

BRANCH="${1:-main}"
echo "🔄 开始同步 upstream/$BRANCH -> origin/$BRANCH"

# 1. 获取官方最新代码
echo "📥 获取官方最新代码..."
git fetch upstream

# 2. 切换到目标分支
echo "🔀 切换到 $BRANCH 分支..."
git checkout "$BRANCH"

# 3. 使用 rebase 方式同步（保持干净线性历史）
# 如果你有未推送的本地提交，这里会自动把你的提交放在官方最新提交之后
echo "⬆️ 执行 rebase..."
git rebase "upstream/$BRANCH"

# 4. 推送到你自己的 fork
# 由于 rebase 会改写历史，需要强制推送。如果你确定只有你一个人用这个 fork，这是安全的。
echo "📤 推送到 origin/$BRANCH..."
read -p "⚠️  即将执行强制推送 (git push -f)，确认继续? (y/N): " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    git push -f origin "$BRANCH"
    echo "✅ 同步完成！当前分支已基于 upstream/$BRANCH 最新版本。"
else
    echo "❌ 已取消推送。本地 rebase 已完成但未推送到 origin。"
fi
