---
title: Git 常见问题记录手册
published: 2026-03-15
description: 介绍 Git 最常见、最容易慌的 Git 问题解决方法，适合在提交错了、推送错了、分支乱了、代码丢了的时候快速查阅。
tags: [Git]
category: 开发
draft: false
---


# 提交前后最常见的问题

## 1. commit 信息写错了怎么办

如果只是最近一次提交的说明写错了：

```bash showLineNumbers=false
git commit --amend -m "新的提交说明"
```

### 说明

* 这会修改最近一次 commit 的说明
* 如果这次 commit **还没有 push**，可以直接改
* 如果已经 push 了，再改会涉及强推，要谨慎

## 2. 刚刚 commit 了，但漏了文件怎么办

先把漏掉的文件加进暂存区：

```bash showLineNumbers=false
git add 文件名
```

然后把它补进上一次提交：

```bash showLineNumbers=false
git commit --amend --no-edit
```

### 说明

* `--no-edit` 表示沿用上一次的提交说明
* 很适合“刚提交完就发现漏文件”的情况

## 3. 提交了不该提交的文件怎么办

### 只想把文件从暂存区移除

```bash showLineNumbers=false
git restore --staged 文件名
```

旧写法也可以：

```bash showLineNumbers=false
git reset 文件名
```

### 已经 commit 了，但还没 push

可以回退到“已暂存”状态：

```bash showLineNumbers=false
git reset --soft HEAD~1
```

回退到“未暂存”状态：

```bash showLineNumbers=false
git reset HEAD~1
```

| 命令                        | 作用                   |
| ------------------------- | -------------------- |
| `git reset --soft HEAD~1` | 撤销 commit，保留暂存区和工作区  |
| `git reset HEAD~1`        | 撤销 commit，保留工作区，取消暂存 |
| `git reset --hard HEAD~1` | 撤销 commit，同时丢弃工作区修改  |

---

# 代码改乱了，想撤销怎么办

## 1. 只想撤销某个文件的本地修改

```bash showLineNumbers=false
git restore 文件名
```

如果你的 Git 版本较老，也可能看到这种写法：

```bash showLineNumbers=false
git checkout -- 文件名
```

:::warning[注意]
这会直接丢弃该文件未提交的修改，不能恢复，使用前确认。
:::

## 2. 想撤销所有本地修改

```bash showLineNumbers=false
git restore .
```

如果还想把暂存区也一起清空：

```bash showLineNumbers=false
git reset --hard HEAD
```

:::warning[注意]
这会丢弃当前所有未提交修改，风险很高。
:::

## 3. 想删除未跟踪文件

先预览有哪些垃圾文件会被删除：

```bash showLineNumbers=false
git clean -n
```

确认后删除：

```bash showLineNumbers=false
git clean -f
```

如果连未跟踪目录也删除：

```bash showLineNumbers=false
git clean -fd
```

### 常见用途

* 清理构建产物
* 清理误生成的临时文件
* 恢复工作区整洁状态

---

# 分支相关问题

## 1. 切错分支开发了怎么办

比如你本来应该在 `dev` 分支开发，结果在 `main` 上写了很多代码，但还没 commit。

这时候最简单：

```bash showLineNumbers=false
# 暂存当前修改
git stash

# 切换分支
git checkout dev

# 恢复暂存的修改
git stash pop
```

如果你已经 commit 了，可以把这次提交“挪”到新分支：

```bash showLineNumbers=false
# 创建新分支并切换
git branch 新分支名

# 切换到新分支
git checkout 新分支名
```

然后回到原分支，撤销那次提交：

```bash showLineNumbers=false
# 切换回原分支
git checkout main

# 回退到上一个提交
git reset --hard HEAD~1
```

:::warning[注意]
如果这次提交已经 push，不能直接这样硬回退，见后面的 [push / pull 出问题怎么办](#push--pull-出问题怎么办)。
:::

## 2. 想新建分支并立即切换

```bash showLineNumbers=false
git checkout -b 分支名
```

或者新写法：

```bash showLineNumbers=false
git switch -c 分支名
```

## 3. 想删除本地分支

```bash showLineNumbers=false
git branch -d 分支名
```

强制删除：

```bash showLineNumbers=false
git branch -D 分支名
```

### 区别

* `-d`：只删除已合并分支
* `-D`：强制删除，哪怕没合并

## 4. 删除远程分支

```bash showLineNumbers=false
git push origin --delete 分支名
```

---

# push / pull 出问题怎么办

## 1. push 被拒绝怎么办

常见报错类似：

```bash showLineNumbers=false
! [rejected] main -> main (non-fast-forward)
```

通常表示：**远程分支比你本地更新**。

先拉取再推送：

```bash showLineNumbers=false
# 拉取最新远程分支
git pull --rebase

# 推送本地分支到远程
git push
```

:::tip[为什么推荐 `--rebase`]
这样会把你的提交“接到”最新远程提交后面，历史更直观。
:::

## 2. push 到错误分支了怎么办

比如你把代码 push 到了 `main`，但本来应该 push 到 `dev`。

### 情况一：只是你自己测试仓库，允许改历史

先记住当前 commit：

```bash showLineNumbers=false
git log --oneline
```

假设提交 ID 是：

```text showLineNumbers=false
abc1234
```

创建正确分支并带上这次提交：

```bash showLineNumbers=false
# 创建并切换到 dev 分支
git checkout -b dev

# 推送 dev 分支到远程
git push origin dev
```

然后回到错误分支回退：

```bash showLineNumbers=false
# 切换回 main 分支
git checkout main

# 回退到上一个提交
git reset --hard HEAD~1

# 强制推送回退后的 main 分支
git push --force
```

:::warning[注意]
`git push --force` 会改远程历史。

如果是团队分支，先确认没有影响别人。
:::

### 情况二：团队协作分支，不建议强推

这时候用 `revert` 更安全：

```bash showLineNumbers=false
# 创建一个新的反向提交，撤销指定提交
git revert 提交ID

# 推送回退后的 main 分支
git push
```

然后再把正确的提交 cherry-pick 到正确分支：

```bash showLineNumbers=false
# 切换到 dev 分支
git checkout dev

# Cherry-pick 正确提交到 dev 分支
git cherry-pick 提交ID

# 推送 dev 分支到远程
git push origin dev
```

## 3. pull 之后出现冲突怎么办

先执行：

```bash showLineNumbers=false
git pull
```

冲突后 Git 会提示哪些文件冲突。

打开冲突文件，你会看到类似内容：

```text showLineNumbers=false
<<<<<<< HEAD
本地代码
=======
远程代码
>>>>>>> 分支名
```

你需要手动修改成最终想保留的内容，然后：

```bash showLineNumbers=false
# 标记文件为已解决冲突
git add 冲突文件

# 提交解决冲突的文件
git commit -m "解决冲突：文件路径"
```

如果你当时执行的是 `git pull --rebase`，解决完后继续：

```bash showLineNumbers=false
# 继续 rebase 过程
git rebase --continue
```

如果不想继续 rebase：

```bash showLineNumbers=false
# 放弃 rebase，回到正常状态
git rebase --abort
```

---

# 回退与恢复

## 1. 想回退到上一个提交

```bash showLineNumbers=false
git reset --hard HEAD~1
```

:::warning[注意]
* 适合本地还没 push 的提交
* 会丢失当前工作区和提交内容
:::


如果只想撤销 commit，但保留代码：

```bash showLineNumbers=false
git reset --soft HEAD~1
```

## 2. 想撤销某一次历史提交，但不改历史

使用：

```bash showLineNumbers=false
git revert 提交ID
```

### 适合场景

* 提交已经 push
* 团队协作中不希望强推
* 想通过“新增一个反向提交”来撤销旧改动

这通常比 `reset` 更安全。

## 3. 不小心 reset --hard 了，代码还能找回来吗

很多时候可以。

先看引用日志：

```bash showLineNumbers=false
git reflog
```

你会看到类似：

```text showLineNumbers=false
abc1234 HEAD@{0}: reset: moving to HEAD~1
def5678 HEAD@{1}: commit: feat: add login page
```

找到你想恢复到的那个 commit，然后执行：

```bash showLineNumbers=false
git reset --hard def5678
```

:::note[重点]
`reflog` 是 Git 的“后悔药”，很多误操作都能靠它找回。
:::

---

# stash 临时保存问题

## 1. 写到一半要切分支怎么办

先暂存当前修改：

```bash showLineNumbers=false
git stash
```

切换分支：

```bash showLineNumbers=false
git checkout 目标分支
```

回来后恢复：

```bash showLineNumbers=false
git stash pop
```

## 2. stash 太多了，怎么看

```bash showLineNumbers=false
git stash list
```

示例：

```text showLineNumbers=false
stash@{0}: WIP on dev: abc1234 fix api
stash@{1}: WIP on main: def5678 update docs
```

## 3. 恢复指定 stash

```bash showLineNumbers=false
git stash apply stash@{1}
```

恢复并删除该 stash：

```bash showLineNumbers=false
git stash pop stash@{1}
```

## 3. 删除 stash

删除一个：

```bash showLineNumbers=false
git stash drop stash@{0}
```

删除全部：

```bash showLineNumbers=false
git stash clear
```

---

# 复制提交到另一个分支

## 1. 想把某次提交复制到别的分支

使用：

```bash showLineNumbers=false
git cherry-pick 提交ID
```

### 典型场景

* 修复了一个 bug，想同步到多个分支
* 代码写错分支了，只想拿走其中一两个提交

示例：

```bash showLineNumbers=false
git checkout release
git cherry-pick abc1234
```

---

# 远程仓库相关问题

## 1. 查看远程仓库地址

```bash showLineNumbers=false
git remote -v
```

## 2. 修改远程仓库地址

```bash showLineNumbers=false
git remote set-url origin 新仓库地址
```

## 3. 新项目第一次推送

```bash showLineNumbers=false
# 新项目第一次推送
git remote add origin 仓库地址

# 切换到 main 分支
git branch -M main

# 推送 main 分支到远程
git push -u origin main
```

### 说明

* `-u` 会建立本地分支与远程分支的跟踪关系
* 后续就可以直接 `git push` / `git pull`

---

# 日志与排查

## 1. 查看简洁提交历史

```bash showLineNumbers=false
git log --oneline
```

## 2. 查看图形化分支历史

```bash showLineNumbers=false
git log --oneline --graph --all
```

这个命令非常适合排查：

* 分支从哪里切出来的
* merge 到哪了
* 某个提交是否真的存在

## 3. 查看某次提交改了什么

```bash showLineNumbers=false
git show 提交ID
```

## 4. 查看当前修改内容

查看未暂存修改：

```bash showLineNumbers=false
git diff
```

查看已暂存修改：

```bash showLineNumbers=false
git diff --cached
```

---

# 常用的安全建议

## 1. 已经 push 到共享分支时，优先用 revert，不要随便 force push

更安全：

```bash showLineNumbers=false
git revert 提交ID
```

高风险：

```bash showLineNumbers=false
git push --force
```

## 2. reset --hard 之前，先看一眼状态

```bash showLineNumbers=false
git status
git log --oneline -5
```

## 3. 删除文件前先预览

```bash showLineNumbers=false
git clean -n
```

而不是直接：

```bash showLineNumbers=false
git clean -fd
```

## 4. 真怕丢代码时，先备份分支

```bash showLineNumbers=false
git branch backup/临时备份
```

这招非常朴素，但很有用。

---

# 常用“救命命令清单”

```bash showLineNumbers=false
# 查看当前状态
git status

# 查看提交历史
git log --oneline --graph --all

# 查看当前修改
git diff

# 暂存当前修改
git stash

# 恢复暂存的修改
git stash pop

# 恢复文件到未暂存状态
git restore 文件名

# 恢复文件到暂存状态
git restore --staged 文件名

# 撤销最近一次提交（保留修改）
git reset --soft HEAD~1

# 撤销最近一次提交（Discard）
git reset --hard HEAD~1

# 撤销某次提交（新增反向提交）
git revert 提交ID

# 查看引用日志（找回丢失的提交）
git reflog

# 复制某次提交到当前分支
git cherry-pick 提交ID
```

如果对 Git 还不够熟，这几条基本能覆盖大多数日常问题。

---

# 判断什么时候用 reset，什么时候用 revert

## 用 reset 的时候

适合：

* 本地还没 push
* 只是想重写自己的提交历史
* 想把最近几次提交撤回来重做

常见命令：

```bash showLineNumbers=false
git reset --soft HEAD~1
git reset --hard HEAD~1
```

---

## 用 revert 的时候

适合：

* 已经 push 到远程
* 团队协作分支
* 不想改提交历史，只想抵消某次提交的影响

常见命令：

```bash showLineNumbers=false
git revert 提交ID
```