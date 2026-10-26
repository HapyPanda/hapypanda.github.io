---
title: "Claude Memory"
date: 2026-08-01
summary: "从实际上下文里的 profile.md、memory_listing 和工具调用出发，拆解 Claude 如何预填、写入和检索记忆。"
tags: ["claude", "memory", "notes"]
image: "/assets/blog/claude-app-memory-system.png"
imageAlt: "一个蓝色行走人物身后拖着逐渐变粉、变破碎的记忆残影"
heroWide: true
draft: false
math: false
---

Claude Memory 的设计是为了服务User个体，

> 本文把两类信息分开处理。分类记忆、过去聊天搜索和 Project 隔离来自 [Claude 官方说明](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)；`profile.md`、`memory_read`、`conversation_search` 等名称来自我在一次实际会话中看到的上下文与工具描述，并不代表 Anthropic 承诺长期维持这套内部接口。

![Claude Memory 的预填、写入与检索流程](/assets/blog/claude-memory-flow.svg)
*Claude Memory流程*

## 新对话并不是从零开始

在我看到的版本里，Memory prefill 由三部分组成。

- `profile.md`：少量稳定的身份事实，例如常用语言或职业背景。文件内容会直接出现在上下文中。
- `<memory_listing>`：记忆文件的目录，只提供路径和一句描述，不会把所有文件全文塞进 prompt。
- context 规则：告诉模型什么时候该存、哪些内容不能存，以及读取和修改文件时要遵守什么步骤。

这个安排很克制。模型先看目录，只有当前问题确实需要某个主题时，才读取对应文件。几十段项目记录不必在每次聊天时重复占用上下文窗口。

## Save：先判断，再写入

Claude 不需要等用户说出“请记住”。按照我看到的规则，只要用户明确陈述了一个会持续存在的事实，或者在当前轮次做出了决定，模型就应该及时写入。比如“以后代码示例用 Python”和“这个项目采用方案 B”，都满足条件。

纯提问不会进入记忆，今晚的房间号之类的临时状态也不会。模型自己的建议不能反过来变成用户事实；一句“听起来不错”同样不等于用户接受了前面所有细节。

写入前还要经过分类和隐私检查。稳定身份放进 `/profile.md`，长期话题与习惯进入 `/topics/`，正在推进的事项放在 `/areas/`，对回答方式的反馈则归到 `/preferences.md`。敏感信息会被过滤；一句话同时包含可存内容和敏感内容时，只保留前者。

文件修改带有简单的版本控制。Claude 先用 `memory_read` 取得当前内容和 version token，再选择局部替换或整体写回，避免基于旧版本覆盖新修改。它更像一组带目录和更新规则的小型文档，而不是一段不断变长的“用户画像”。

## Search：偏好和历史会话走不同路径

“我是不是更喜欢简短回答？”这是记忆文件能回答的问题。模型从 `<memory_listing>` 找到可能相关的路径，然后调用 `memory_read` 读取具体内容。它要找的是已经整理过的结论。

但如果问题变成“上个月我们讨论 PhysRVG 实验时，最后决定了哪个 baseline？”，只读偏好文件就不够了。模型需要调用 `conversation_search`，从原始聊天里找回相关片段。Claude 的公开文档没有披露这个工具名，但确认了过去聊天搜索使用 RAG，搜索过程会显示为工具调用，并能链接回原会话。

两条路径解决的问题不同：Memory 保存相对稳定的事实与偏好，conversation search 负责找证据、措辞和当时的讨论过程。把所有历史都压缩成一份长期记忆，会丢掉细节；每次都搜索聊天记录，又会让一个简单偏好问题变得很重。

## Project 给记忆划定边界

官方说明提到，每个 Claude Project 都有独立的记忆空间和项目摘要。论文项目里的实验背景不该自动影响旅行计划，另一个代码仓库的约定也不该混进当前工作。

这种隔离比“记得更多”更有用。记忆一旦缺少作用域，正确的信息也可能在错误的场景里造成干扰。

## 用户仍然需要检查它记住了什么

Claude 允许用户在 Settings → Memory 中查看、修改和删除分类记忆，也可以暂停或重置 Memory。Incognito chat 不会进入聊天历史，也不会生成新的记忆。

删除原始会话与删除长期记忆并不是同一个动作。按照当前官方说明，在新版 Memory 中，某段会话即使过期或被删除，从中生成的相关记忆条目也不会自动消失；不希望继续保留的信息，需要在 Memory 面板里单独删除。

写这篇记录时，Anthropic 仍在逐步迁移新版 Memory，不同套餐和账号可能看到不同界面。产品开关会变，工具名也可能变，但这套分工已经很清楚：prefill 提供最小的稳定背景，memory 文件保存整理后的事实，conversation search 在需要时找回原始对话。

## 参考资料

- [Use Claude’s chat search and memory to build on previous context](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)
