---
title: "注意力的发展历史"
date: 2026-08-05
summary: "注意力最初是为了解开序列压缩的瓶颈，后来成为 Transformer 的核心，又在长上下文时代演化为一场算法与硬件共同参与的工程。"
tags: ["attention", "transformer", "history"]
image: "/assets/blog/attention-history-cherry-blossom-eye-selected.png"
imageAlt: "白色背景上，蓝白粉三色撕纸樱花之间露出一只蓝灰色眼睛"
draft: false
math: false
---

今天我们谈起注意力，常常会直接想到 Transformer。可注意力并不是随着 Transformer 一起出现的。它最初解决的是一个很朴素的问题：当输入很长时，模型应该去哪里找此刻真正需要的信息？

回头看这段历史，注意力的变化并不是公式越来越复杂，而是它承担的角色不断扩大：先是翻译系统里的对齐工具，然后成为序列建模的骨架，最后又变成一项需要算法、内存与硬件共同设计的基础设施。

## 2014：从固定向量里逃出来

早期神经机器翻译常把整句源语言压进一个固定长度的向量，再由解码器生成译文。短句尚可，句子一长，所有信息都挤在同一个瓶颈里，细节很容易丢失。

Bahdanau、Cho 和 Bengio 提出的办法，是让解码器在生成每个词时，重新查看源句的不同位置。模型不必一次记住整句话，而是根据当前状态，对源句各部分分配权重，再取回此刻最相关的内容。

这时的注意力更像一个可微分的对齐器。它回答的不是“整句话是什么意思”，而是“为了生成下一个词，我现在应该看哪里”。

## 2015：注意力开始拥有不同形状

随后，Luong 等人系统比较了全局注意力与局部注意力：前者每一步都查看全部源词，后者只关注一个较小的窗口。这个区分提前预告了后来长序列研究的核心矛盾——看得越全，成本越高；看得越少，就越依赖选择策略。

同一时期，注意力也从语言走向视觉。《Show, Attend and Tell》让图像描述模型在生成不同单词时注视不同区域。生成“狗”时看向动物，生成“球”时移向物体。注意力第一次以热力图的形式，把模型正在使用的信息直观地展示出来。

## 2017：从辅助模块变成主干

《Attention Is All You Need》真正改变的，不只是提出了另一种注意力计算方式，而是把注意力从循环网络旁边的辅助模块提升为整个模型的骨架。

Self-Attention 让序列中的每个位置都能直接读取其他位置。信息不必再沿着循环结构一步步传递，训练因此更容易并行；多头注意力则让模型在同一层里学习多种关系，例如局部搭配、长距离依赖和语义指代。

从这里开始，注意力不再只是“从编码器里取信息”，而是在动态构造一张关系图：谁与谁有关，关系有多强，都由当前输入决定。

## 2020：注意力跨出语言边界

Transformer 很快进入视觉、语音与多模态系统。Vision Transformer 把图像切成 patch 序列，证明纯 Transformer 也能完成图像识别。文本 token、图像 patch、音频帧看起来完全不同，却可以被放进同一种“查询—匹配—聚合”的计算框架。

与此同时，标准 Self-Attention 的代价随着序列长度平方增长。Longformer 等工作开始引入局部窗口、稀疏连接和少量全局位置。研究重心由“注意力是否有效”转向“在有限预算里，哪些连接最值得保留”。

## 2022：公式没变，计算方式变了

FlashAttention 展示了另一条路线：不近似注意力，而是重新安排精确计算的执行顺序。通过分块计算并减少 GPU 高带宽内存与片上存储之间的数据搬运，它让同一个数学结果跑得更快、占用更少内存。

这件事很重要，因为模型的速度不只由浮点运算次数决定。一个理论复杂度漂亮的方案，如果频繁搬运数据，真实机器上未必更快。注意力从这一阶段开始，明显成为算法与硬件共同设计的问题。

## 一条没有消失的主线

从 2014 年到今天，注意力的名字和实现不断变化，但主线始终相同：先根据当前问题估计相关性，再把相关信息聚合回来。

它像人在樱花丛中寻找一只眼睛。花瓣很多，颜色也彼此遮挡；真正重要的不是把每一片花瓣都记住，而是在此刻知道视线应该落在哪里。

注意力的发展史，因此也是机器学习不断学习“如何选择”的历史。模型越来越强，不只是因为它保存了更多信息，也因为它更擅长在正确的时刻，让正确的信息进入计算。

## 参考资料

- [Neural Machine Translation by Jointly Learning to Align and Translate](https://arxiv.org/abs/1409.0473)
- [Effective Approaches to Attention-based Neural Machine Translation](https://arxiv.org/abs/1508.04025)
- [Show, Attend and Tell: Neural Image Caption Generation with Visual Attention](https://arxiv.org/abs/1502.03044)
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [Longformer: The Long-Document Transformer](https://arxiv.org/abs/2004.05150)
- [An Image is Worth 16x16 Words](https://arxiv.org/abs/2010.11929)
- [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135)
