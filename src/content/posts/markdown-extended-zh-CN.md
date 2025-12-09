---
title: Markdown 扩展功能
published: 2024-05-01
updated: 2024-11-29
description: '在Fuwari中阅读有关Markdown功能的更多信息'
image: ''
tags: [Demo, Example, Markdown, Fuwari]
category: 'Examples'
draft: true 
---

## GitHub 仓库卡片
你可以添加动态卡片链接到 GitHub 仓库，在页面加载时会从 GitHub API 拉取仓库信息。 

::github{repo="Fabrizz/MMM-OnSpotify"}

创建一个 GitHub 仓库卡片，代码为 `::github{repo="<owner>/<repo>"}`。

```markdown
::github{repo="saicaca/fuwari"}
```

## 提示块（Admonitions）

目前支持以下几种提示块类型: `note` `tip` `important` `warning` `caution`

:::note
强调一些即使用户快速浏览也应该注意到的信息。
:::

:::tip
提供一些可选的信息，帮助用户更好地使用。
:::

:::important
包含用户成功所需的关键信息。
:::

:::warning
包含可能存在风险，需要立即关注的关键信息。
:::

:::caution
提示某个行为可能带来的负面后果。
:::

### 基本语法

```markdown
:::note
强调一些即使用户快速浏览也应该注意到的信息。
:::

:::tip
提供一些可选的信息，帮助用户更好地使用。
:::
```

### 自定义标题

可以自定义提示块的标题。

:::note[自定义标题]
这是一个带有自定义标题的 note。
:::

```markdown
:::note[自定义标题]
这是一个带有自定义标题的 note。
:::
```

### GitHub 语法

> [!TIP]
> 支持使用[GitHub 风格语法](https://github.com/orgs/community/discussions/16925)

```
> [!NOTE]
> 支持 GitHub 风格的语法。

> [!TIP]
> 支持 GitHub 风格的语法。
```

### 折叠内容（Spoiler）

你可以在文本中添加“隐藏内容”，同时支持 **Markdown** 语法。

内容 :spoiler[已被隐藏 **ayyy**]!

```markdown
内容 :spoiler[已被隐藏 **ayyy**]!

```