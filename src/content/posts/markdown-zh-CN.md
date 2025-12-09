---
title: Markdown 示例
published: 2023-10-01
description: 一个简单的 Markdown 博客文章示例。
tags: [Markdown, Blogging, Demo]
category: Examples
draft: true
---

# 一级标题（h1 header）

段落之间通过空行分隔。

第二段。_斜体_, **粗体**, 以及 `等宽字体`。项目符号列表如下：

- 这个
- 那个
- 另一个

注意 --- 不考虑星号 --- 实际文本内容从第 4 列开始。

> 块引用
> 是这样写的。
>
> 如果你愿意，
> 它也可以跨越多个段落。

使用三个短划线表示 em-dash。使用两个短划线表示范围（例如：“在第 12--14 章中”）。三个点 ... 会被转换为省略号。支持 Unicode。☺

## 二级标题（h2 header）

下面是一个编号列表：

1. 第一项
2. 第二项
3. 第三项

再次注意实际文本从第 4 列开始（从左侧算起 4 个字符）。下面是一个代码示例：

    # Let me re-iterate ...
    for i in 1 .. 10 { do-something(i) }

如你所料，这里是缩进 4 个空格。顺便说一下，你也可以用分隔代码块的方式，而不是缩进：

```
define foobar() {
    print "Welcome to flavor country!";
}
```

(这样复制粘贴更方便)。 你还可以为分隔代码块指定语言，以便 Pandoc 进行语法高亮：

```python
import time
# Quick, count to ten!
for i in range(10):
    # (but not *too* quick)
    time.sleep(0.5)
    print i
```

### 三级标题（h3 header）

现在来看一个嵌套列表：

1. 首先准备这些食材：

    - 胡萝卜
    - 芹菜
    - 小扁豆

2. 烧一锅水。

3. 把所有东西倒进锅里并按照以下算法操作：

        find wooden spoon
        uncover pot
        stir
        cover pot
        balance wooden spoon precariously on pot handle
        wait 10 minutes
        goto first step (or shut off burner when done)

    不要碰木勺，否则它会掉下来。

再次注意文本总是对齐到 4 空格缩进（包括上面第 3 项的最后一行）。

这里有一个指向 [某个网站](http://foo.bar) 的链接, 指向一个 [l本地文档](local-doc.html) 的链接, 以及指向当前文档中一个 [标题部分](#二级标题h2-header) 的链接.。下面是一个脚注 [^1].

[^1]: 脚注内容写在这里。

表格看起来像这样：

size material color

---

9 leather brown
10 hemp canvas natural
11 glass transparent

表格：鞋子、它们的尺码及材质

（上面就是该表格的说明文字。）Pandoc 也支持多行表格：

---

keyword text

---

red Sunsets, apples, and
other red or reddish
things.

green Leaves, grass, frogs
and other things it's
not easy being.

---

下面是一个水平分隔线。

---

这里是一个“定义列表”：

apples
: 用来做苹果酱很不错。
oranges
: 柑橘类！
tomatoes
: tomato 中没有 “e”。

再次提醒，文本缩进 4 个空格。（在每组词条/定义之间添加空行可以让布局更宽松。）

下面是一个“行块”（line block）：

| Line one
| Line too
| Line tree

图片可以像这样指定：

[//]: # (![example image]&#40;./demo-banner.png "An exemplary image"&#41;)

行内数学公式写法如下：$\omega = d\phi / dt$。
显示数学公式应单独占一行，并放在双美元符号中：

$$I = \int \rho R^{2} dV$$

$$
\begin{equation*}
\pi
=3.1415926535
 \;8979323846\;2643383279\;5028841971\;6939937510\;5820974944
 \;5923078164\;0628620899\;8628034825\;3421170679\;\ldots
\end{equation*}
$$

注意，你可以反斜杠转义任何希望按字面显示的标点符号，例如： \`foo\`, \*bar\*, 等。
