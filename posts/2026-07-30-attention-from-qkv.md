---
title: "从 QKV 出发讲清 Self-Attention"
date: 2026-07-30
summary: "不背公式，从「一次可微的检索」这个角度推一遍 self-attention，并顺手写出 20 行的 NumPy 实现。"
tags: ["deep-learning", "notes"]
draft: false
math: true
---

大部分教程把 self-attention 讲成三个矩阵乘法，结果是公式记住了，但说不出「为什么要有三个」。这篇笔记换一个入口：**把注意力看成一次可微的字典检索**。

## 一次不可微的检索

先看普通字典。给一堆键值对 $(k_1, v_1), \dots, (k_n, v_n)$ 和一个查询 $q$，我们做的是

$$\text{lookup}(q) = v_{j}, \quad j = \arg\max_i \ \langle q, k_i \rangle$$

问题很清楚：$\arg\max$ 处处导数为零或不存在，没法反向传播。于是把「选一个」放松成「按相似度加权平均所有的」：

$$\text{attn}(q) = \sum_i \frac{\exp(\langle q, k_i\rangle / \sqrt{d})}{\sum_j \exp(\langle q, k_j\rangle / \sqrt{d})} \, v_i$$

这就是全部。剩下的都是工程细节。

### 为什么要除以 $\sqrt{d}$

假设 $q$ 和 $k_i$ 各维独立、均值 0 方差 1，那么内积 $\langle q, k_i \rangle = \sum_{t=1}^{d} q_t k_t$ 的方差是 $d$。$d$ 一大，logits 的尺度就跟着变大，softmax 迅速饱和成 one-hot，梯度随之消失。除以 $\sqrt{d}$ 把方差拉回 1，让温度与维度解耦。

### 三个投影矩阵在做什么

输入序列 $X \in \mathbb{R}^{n \times d}$ 同时要扮演三个角色：发起查询的人、被检索的索引、被取出的内容。用三个投影 $W_Q, W_K, W_V$ 把它拆成三份，模型才能分别学「我关心什么」和「我拿什么出去」：

$$Q = XW_Q, \quad K = XW_K, \quad V = XW_V$$

如果强行让 $W_Q = W_K$，注意力矩阵被迫对称 —— 而「代词指向名词」这种关系天生不对称。

## 20 行实现

```python
import numpy as np

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)      # 数值稳定，减掉行最大值
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)

def self_attention(X, Wq, Wk, Wv, causal=False):
    """X: (n, d_model) -> (n, d_v)"""
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    d_k = K.shape[-1]
    logits = Q @ K.T / np.sqrt(d_k)              # (n, n)
    if causal:
        mask = np.triu(np.ones_like(logits), k=1).astype(bool)
        logits = np.where(mask, -np.inf, logits)  # 未来位置置为 -inf
    A = softmax(logits)
    return A @ V, A

n, d = 6, 32
rng = np.random.default_rng(0)
X = rng.normal(size=(n, d))
out, A = self_attention(X, *[rng.normal(size=(d, d)) / np.sqrt(d) for _ in range(3)], causal=True)
print(out.shape, A.sum(axis=-1))   # (6, 32) 每行注意力权重和为 1
```

注意 `logits = np.where(mask, -np.inf, logits)` 这一行：因果掩码不是「乘 0」而是「加 $-\infty$」，因为归一化发生在 softmax 内部，乘 0 会破坏分母。

## 复杂度这件事

| 操作 | 时间 | 空间 |
|---|---|---|
| $QK^\top$ | $O(n^2 d)$ | $O(n^2)$ |
| $AV$ | $O(n^2 d)$ | $O(nd)$ |
| 前馈层 | $O(n d^2)$ | $O(nd)$ |

序列长到 $n \gg d$ 时 $n^2$ 项开始主导 —— 这正是 FlashAttention 之类工作的出发点：数学上一模一样，但不把 $n \times n$ 的中间矩阵写进显存。

> 记住一句话就够了：**注意力是把 argmax 换成 softmax 换来的可微性**，代价是每次都要看完所有位置。
