---
name: markdown-author
description: Use markdown-author when you need to create analysis reports, notes, etc.
---


# Markdown Author Skill

This skill provides you with some new and creative Markdown generation rules.

## Figure
When you need to make image comparisons, Place two images horizontally
<div style="display: flex; gap: 10px; justify-content: center;">
  <img src="image1.jpg" alt="描述1" style="width: calc(50% - 5px); border-radius: 8px;">
  <img src="image2.jpg" alt="描述2" style="width: calc(50% - 5px); border-radius: 8px;">
</div>

## Under line
1. Basic underline
Must add text-underline-offset: 3px;
<span style="text-decoration: underline; text-underline-offset: 3px;">Basic Underline</span>

2. Colored underline
<span style="text-decoration: underline; text-decoration-color: red; text-underline-offset: 3px;">Red Underline</span>

## Wavy lines
1. Basic Wave lines
<span style="text-decoration: wavy underline; text-underline-offset: 3px;">波浪线下划线</span>

2. Custom Wave lines
<span style="text-decoration: wavy underline red; text-underline-offset: 3px;">红色波浪线</span>
<span style="text-decoration: underline wavy #ff6b6b; text-underline-offset: 3px; text-decoration-thickness: 3px;">粉色粗波浪线</span>

## Callout

> [!NOTE]
> 这是一个普通提示。

> [!TIP]
> 这是一个技巧提示。

> [!IMPORTANT]
> 这是一个重要提示。

> [!WARNING]
> 这是一个警告提示。

> [!CAUTION]
> 这是一个危险提示。

