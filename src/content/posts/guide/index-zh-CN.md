---
title: Fuwari 简易指南
published: 2024-04-01
description: "如何使用这个博客模板。"
image: "./cover.jpeg"
tags: ["Fuwari", "Blogging", "Customization"]
category: Guides
draft: true
---

> 封面图来源： [Source](https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/208fc754-890d-4adb-9753-2c963332675d/width=2048/01651-1456859105-(colour_1.5),girl,_Blue,yellow,green,cyan,purple,red,pink,_best,8k,UHD,masterpiece,male%20focus,%201boy,gloves,%20ponytail,%20long%20hair,.jpeg)

这个博客模板基于 [Astro](https://astro.build/) 构建。如果本指南未提及某些内容，你可以在 [Astro Docs](https://docs.astro.build/)中查找答案。

## 文章 Front-matter（头部信息）

```yaml
---
title: My First Blog Post
published: 2023-09-09
description: This is the first post of my new Astro blog.
image: ./cover.jpg
tags: [Foo, Bar]
category: Front-end
draft: false
---
```

| Attribute     | Description                                                                                                                                                                                                 |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `title`       | 文章标题。                                                                                                                                                                                      |
| `published`   | 文章发布日期。                                                                                                                                                                            |
| `description` | 文章的简短描述，会显示在首页列表中。                                                                                                                                                   |
| `image`       | 文章封面图路径。<br/>1. 以 http:// 或 https:// 开头：使用网络图片<br/>2. 以 / 开头：使用 public 目录下的图片<br/>3. 不含前缀：相对于当前 markdown 文件的路径 |
| `tags`        | 文章标签。                                                                                                                                                                                       |
| `category`    | 文章分类。                                                                                                                                                                                   |
| `draft`        | 是否为草稿（true 则不会展示）。                                                                                                                                                    |

## 将文章文件放在哪里



你的文章文件应该放在 `src/content/posts/` 目录中。
你也可以创建子目录来更好地管理文章与资源文件。

```
src/content/posts/
├── post-1.md
└── post-2/
    ├── cover.png
    └── index.md
```
