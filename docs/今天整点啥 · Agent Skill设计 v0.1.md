# 今天整点啥 · Agent Skill 设计 v0.1

## 1. 文档定位

本文档用于沉淀《今天整点啥》的 Agent Skill 设计方案，重点说明如何把通用 `handoff` 和 `grill-me` 思路改造成适合本产品的多人聚会决策能力。

本文档不直接复用通用 skill，而是基于其能力做产品化改造：

- `handoff` 参考点：上下文交接、下一 Agent 可接手。
- `grill-me` 参考点：沿决策树追问，直到关键分支被澄清。
- 本产品改造目标：让每个参与者和自己的海鸥 Agent 轻松对话，再把结构化偏好 handoff 给决策 Agent。

核心产物分为三部分：

- `Preference Agent Skill`：参与者偏好收集与低压澄清。
- `Decision Agent Skill`：多人偏好融合、调研和方案生成。
- `Handoff Package Schema`：偏好 Agent 与决策 Agent 之间的结构化交接协议。

## 2. 总体架构

```text
参与者 A
  -> Preference Agent A
  -> ParticipantPreferencePackage A

参与者 B
  -> Preference Agent B
  -> ParticipantPreferencePackage B

参与者 C
  -> Preference Agent C
  -> ParticipantPreferencePackage C

所有 ParticipantPreferencePackage
  -> Decision Agent
  -> 偏好融合
  -> POI / 活动调研
  -> 主方案 + 方案 B
  -> 动态修改
```

### 2.1 为什么不能直接复用通用 skill

| 通用能力 | 原始问题 | 本产品改造 |
| --- | --- | --- |
| `handoff` | 偏通用会话压缩，不知道聚会偏好字段 | 改为结构化偏好包，包含预算、雷区、位置、局类型建议和原始证据 |
| `grill-me` | 追问强度高，容易像审问或评审 | 改为海鸥式低压澄清，最多追问 1-2 次，允许“都行” |
| 普通聊天 Agent | 容易只会闲聊，不沉淀结构化字段 | 每轮对话必须更新后台字段 |
| 普通推荐 Agent | 容易直接给方案，忽略多人冲突 | 先收集、再 handoff、最后由 Decision Agent 统一决策 |

### 2.2 Agent 分工

| Agent | 触发时机 | 输入 | 输出 | 不负责 |
| --- | --- | --- | --- | --- |
| `Preference Agent` | 参与者进入 `/chat/:roomId` | 房间信息、局类型、参与者回答 | `ParticipantPreferencePackage` | 不生成最终方案 |
| `Decision Agent` | 组织者点击生成、结果页动态修改 | 房间信息、所有 handoff 包、POI 候选 | `PlanDecisionPackage` | 不逐个追问参与者 |
| `Handoff Schema` | Preference Agent 完成问询时 | 结构化偏好、原始证据、置信度 | 可被 Decision Agent 消费的数据包 | 不做自然语言闲聊 |

## 3. Preference Agent Skill

### 3.1 Skill 定义

```yaml
name: seagull-preference-agent
description: Collects one participant's party preferences with playful low-pressure clarification. Invoke when a participant starts or resumes preference chat.
```

### 3.2 角色定位

`Preference Agent` 是每个参与者的“专属海鸥组局搭子”。

它的目标不是逼用户做决定，而是：

- 读取组织者创建的局类型 `eventMode`。
- 用 4-5 轮轻量对话收集偏好。
- 识别用户说不清、纠结或只表达排除项的情况。
- 用低压选择题帮用户收敛。
- 把最终信息整理成结构化 handoff 包。

### 3.3 语气规范

| 维度 | 要求 |
| --- | --- |
| 人设 | 码头海鸥，嘴碎但靠谱 |
| 语气 | 俏皮、短句、像朋友，不像客服 |
| 梗 | 可使用“码头”“海鸥”“薯条”“鸽子”“交卷” |
| 禁止 | 爹味、审问感、连续追问、强迫用户解释 |
| 用户逃生口 | `都行`、`交给海鸥`、`我只有雷区`、`跳过` |

### 3.4 问询流程

```text
读取 room.eventMode
  -> 开场说明 3 分钟搞定
  -> 承接局类型
  -> 进入对应分支
  -> 收集硬性雷区
  -> 收集预算和位置
  -> 模糊偏好澄清
  -> 偏好小结确认
  -> 生成 ParticipantPreferencePackage
```

### 3.5 局类型分支

| `eventMode` | 主要问什么 | 不主动问什么 |
| --- | --- | --- |
| `meal_only` | 菜系、口味、忌口、预算、位置 | 不主动问 KTV、桌游 |
| `activity_only` | 活动类型、体力强度、社交强度、预算、位置 | 不主动问菜系 |
| `meal_activity` | 第一站吃饭偏好、第二站娱乐偏好、两站距离 | 不让用户重新决定要不要玩 |
| `undecided` | 参与者对吃饭/玩乐/组合的倾向 | 不强迫每个人拍板 |

### 3.6 低压澄清范式

通用 `grill-me` 是“问到清楚为止”，本产品改成“帮用户少想一点”。

```text
承认模糊
  -> 解释用户不是没想法，只是范围太大
  -> 给 3-4 个小选项
  -> 提供推荐答案
  -> 用户仍然模糊则使用默认值
```

示例：

```text
用户：不想吃辣，但也不知道吃啥。

海鸥：辣的先踢下船。你不是没想法，是只排除了一个错误答案。

A. 粤菜/茶餐厅，稳妥清淡
B. 日料/寿司，少油少辣
C. 家常小馆，适合聊天
D. 交给海鸥，我只负责不踩雷

海鸥推荐：如果你懒得选，我先按 A/C 给你记。
```

### 3.7 需要识别的用户信号

| 用户表达 | 识别结果 | 处理 |
| --- | --- | --- |
| 随便 / 都行 | `no_preference` | 降低权重，不追问 |
| 听大家的 | `low_decision_weight` | 只问硬性雷区 |
| 不想吃辣 | `hard_constraint` 或 `taste_exclusion` | 写入饮食约束 |
| 光吃饭不够 | `eventModeChangeSuggestion` | 建议升级为 `meal_activity` |
| 不想太累 | `low_energy_preference` | 推荐桌游、清吧、电影等 |
| 别太贵 | `budget_sensitive` | 优先低预算候选 |
| 离我近点 | `distance_sensitive` | 增加地理权重 |

### 3.8 Preference Agent Prompt

```text
你是“今天整点啥”的参与者偏好 Agent，角色是一只在码头抢薯条但很会办事的海鸥。

你的任务：
1. 读取 room.eventMode。
2. 根据 eventMode 选择问询分支。
3. 用 4-5 轮对话收集参与者偏好。
4. 每轮只问一个核心问题。
5. 每轮必须给 3-4 个低思考成本选项。
6. 用户可以自由输入，也可以说“都行”“交给海鸥”。
7. 用户表达模糊时，最多澄清 1-2 次。
8. 用户仍然模糊时，使用默认值，不继续追问。
9. 用户提出局类型变化时，记录 eventModeChangeSuggestion。
10. 最终输出 ParticipantPreferencePackage，不直接生成聚会方案。

语气要求：
1. 俏皮、自然、短句。
2. 可以用“码头”“海鸥”“薯条”“鸽子”“交卷”等梗。
3. 不要像客服，不要像评委，不要审问用户。
4. 不要为了玩梗牺牲信息准确性。
```

## 4. Handoff Package Schema

### 4.1 设计目标

`Handoff Package` 是 Preference Agent 给 Decision Agent 的交接协议。

它必须做到：

- 决策 Agent 不看完整聊天记录，也能理解用户偏好。
- 保留原始证据，方便结果页解释“为什么这样安排”。
- 结构化字段足够明确，方便做规则融合。
- 不保存不必要的敏感信息。

### 4.2 ParticipantPreferencePackage

```ts
type ParticipantPreferencePackage = {
  roomId: string;
  participantId: string;
  nickname: string;
  eventModeSeen: EventMode;
  preference: {
    mealPreference?: MealPreference;
    activityPreference?: ActivityPreference;
    budgetRange?: BudgetRange;
    location?: UserLocation;
    hardConstraints: string[];
    softPreferences: string[];
    noPreferenceFields: string[];
  };
  eventModeChangeSuggestion?: EventModeChangeSuggestion;
  decisionStyle: 'clear' | 'guided_options_needed' | 'follow_group' | 'ai_decide';
  confidence: number;
  rawEvidence: string[];
  handoffSummary: string;
  createdAt: string;
};
```

### 4.3 字段说明

| 字段 | 说明 | 示例 |
| --- | --- | --- |
| `eventModeSeen` | 用户问询时看到的初始局类型 | `meal_only` |
| `mealPreference` | 菜系、口味、饮食倾向 | 清淡、粤菜、不辣 |
| `activityPreference` | 娱乐类型、体力强度、社交强度 | KTV、桌游、低体力 |
| `hardConstraints` | 一票否决项 | 海鲜过敏、不唱 K |
| `softPreferences` | 可尽量满足但非必须 | 想离地铁近 |
| `noPreferenceFields` | 用户明确表示都行的字段 | 菜系、第二站活动 |
| `eventModeChangeSuggestion` | 对局类型的升级/降级建议 | 只吃饭升级为吃饭+娱乐 |
| `rawEvidence` | 用户原话证据 | “光吃饭不够吧” |
| `handoffSummary` | 给决策 Agent 的短摘要 | 小王不吃辣，建议加饭后娱乐 |

### 4.4 EventModeChangeSuggestion

```ts
type EventModeChangeSuggestion = {
  suggestedMode: 'meal_only' | 'activity_only' | 'meal_activity' | 'undecided';
  fromMode: 'meal_only' | 'activity_only' | 'meal_activity' | 'undecided';
  reason: string;
  evidence: string[];
  confidence: number;
};
```

### 4.5 示例

```json
{
  "roomId": "A7K29Q",
  "participantId": "p_001",
  "nickname": "小王",
  "eventModeSeen": "meal_only",
  "preference": {
    "mealPreference": {
      "taste": ["light", "not_spicy"],
      "cuisine": ["cantonese", "japanese"]
    },
    "activityPreference": {
      "preferred": ["ktv", "board_game"],
      "energyLevel": "low_to_medium"
    },
    "budgetRange": {
      "min": 100,
      "max": 200
    },
    "location": {
      "text": "科技园",
      "area": "南山区"
    },
    "hardConstraints": ["no_spicy"],
    "softPreferences": ["near_metro"],
    "noPreferenceFields": []
  },
  "eventModeChangeSuggestion": {
    "fromMode": "meal_only",
    "suggestedMode": "meal_activity",
    "reason": "用户认为光吃饭不够，想增加饭后娱乐",
    "evidence": ["光吃饭不够吧，可以唱 K"],
    "confidence": 0.82
  },
  "decisionStyle": "guided_options_needed",
  "confidence": 0.86,
  "rawEvidence": [
    "不想吃辣",
    "光吃饭不够吧，可以唱 K"
  ],
  "handoffSummary": "小王偏清淡、不吃辣，预算 100-200，建议饭后增加低门槛娱乐。",
  "createdAt": "2026-06-13T10:00:00+08:00"
}
```

### 4.6 隐私与安全

- 不保存手机号、微信号、精确住址、身份证等敏感信息。
- 位置只保留到商圈、地铁站或区域级别。
- `rawEvidence` 只保存与聚会决策相关的短句。
- 不保存用户无关闲聊。
- handoff 包只在房间维度内使用，不作为公开内容展示。

## 5. Decision Agent Skill

### 5.1 Skill 定义

```yaml
name: seagull-decision-agent
description: Fuses participant handoff packages, researches POI candidates, and generates or modifies party plans. Invoke when organizer generates or edits a plan.
```

### 5.2 角色定位

`Decision Agent` 是整个房间的“组局大脑”。

它负责：

- 接收所有 `ParticipantPreferencePackage`。
- 汇总硬性限制、预算、位置和偏好。
- 判断是否需要修改 `eventMode`。
- 调研商家和活动候选。
- 生成主方案、方案 B 和推荐理由。
- 处理结果页动态修改。

### 5.3 工作流

```text
组织者点击生成 / 用户提出修改
  -> 读取 room 信息
  -> 拉取所有 ParticipantPreferencePackage
  -> 校验硬性限制
  -> 判断 eventMode 是否需要升级/降级
  -> 融合预算、位置、偏好
  -> 调用 POI API 或本地兜底数据
  -> 生成主方案 + 方案 B
  -> 输出推荐理由、预算、路线和注意事项
```

### 5.4 决策优先级

```text
硬性禁忌
  > 局类型 eventMode
  > 预算上限
  > 地理便利
  > 多数偏好
  > 少数偏好照顾
  > 趣味性和文案效果
```

### 5.5 eventMode 变更判断

| 场景 | 判断 | 动作 |
| --- | --- | --- |
| 1 人建议升级 | 少数诉求 | 进入方案 B 或备注 |
| 多数人建议升级 | 强信号 | 提示组织者升级 |
| 组织者在结果页要求升级 | 最高优先级 | 直接修改 `eventMode` 并重算 |
| 新增硬性限制导致娱乐不可行 | 强约束 | 降级或替换娱乐类型 |

### 5.6 调研能力

Decision Agent 可以使用三类数据源：

| 数据源 | 优先级 | 用途 |
| --- | --- | --- |
| POI API | 第一优先级 | 查询真实商家、地址、评分、品类 |
| 本地兜底 JSON | 第二优先级 | API 失败时保证演示稳定 |
| Prompt 内置知识 | 第三优先级 | 只做文案解释，不作为真实商家来源 |

### 5.7 Decision Agent Prompt

```text
你是“今天整点啥”的决策 Agent，是整个房间的组局大脑。

你的输入：
1. room 基础信息。
2. 所有 ParticipantPreferencePackage。
3. 可用 POI / 商家 / 活动候选。
4. 用户在结果页提出的修改诉求。

你的任务：
1. 融合多人偏好。
2. 优先满足硬性禁忌。
3. 判断 eventMode 是否需要升级或降级。
4. 调研并筛选商家和活动候选。
5. 生成主方案和方案 B。
6. 标注为什么这样安排，以及照顾了哪些人的偏好。
7. 动态修改时，判断是局部替换还是整案重算。

输出要求：
1. 输出结构化 PlanDecisionPackage。
2. 推荐理由必须引用 handoff 中的 rawEvidence 或 handoffSummary。
3. 不要编造用户没有表达的偏好。
4. 不要输出不存在的真实商家；POI 失败时使用兜底 JSON。
5. 文案可以俏皮，但方案必须清晰可执行。
```

## 6. PlanDecisionPackage

```ts
type PlanDecisionPackage = {
  roomId: string;
  finalEventMode: EventMode;
  eventModeDecision: {
    changed: boolean;
    from?: EventMode;
    to?: EventMode;
    reason?: string;
  };
  preferenceSummary: {
    hardConstraints: string[];
    budgetMedian: string;
    targetArea: string;
    majorityNeeds: string[];
    minorityNeeds: string[];
    unresolvedConflicts: string[];
  };
  researchSummary: {
    source: 'poi_api' | 'fallback_json' | 'mixed';
    candidateCount: number;
    selectedReason: string;
  };
  plan: {
    title: string;
    summary: string;
    tags: string[];
    stops: PlanStop[];
    budgetSummary: string;
    fallbackPlan: string;
  };
  explanation: string[];
  changeHistory?: PlanChange[];
};
```

## 7. 动态修改接入

动态修改统一交给 `Decision Agent`，不回到单个 `Preference Agent`。

```text
用户在结果页输入修改诉求
  -> Decision Agent 识别意图
  -> 判断是否影响 eventMode
  -> 判断局部修改还是整案重算
  -> 必要时重新调研 POI
  -> 输出新版 PlanDecisionPackage
```

### 7.1 修改类型

| 修改类型 | 示例 | 处理方式 |
| --- | --- | --- |
| 局部替换 | 第一站换成户外 | 替换对应 stop |
| 预算调整 | 预算再低一点 | 重新筛选低价候选 |
| eventMode 升级 | 光吃饭不够，加个 KTV | `meal_only -> meal_activity`，新增娱乐站点 |
| eventMode 降级 | 不玩了，吃完就散 | `meal_activity -> meal_only`，移除娱乐站点 |
| 新增硬限制 | 有人临时不吃辣 | 全方案重新校验 |
| 区域变化 | 改到后海附近 | 重新查询 POI |

## 8. MVP 实现建议

### 8.1 黑客松最小实现

- 不一定真的启动多个独立 Agent 服务，可以在代码上模拟三个角色。
- `Preference Agent` 可先用固定状态机 + LLM 解析。
- `Handoff Package` 必须真实落库或存储。
- `Decision Agent` 可先用规则融合 + LLM 生成方案。
- POI API 可接真实接口，失败时使用兜底 JSON。

### 8.2 模块拆分

```text
/agents/preferenceAgent
  -> askNextQuestion()
  -> parseAnswer()
  -> buildHandoffPackage()

/agents/decisionAgent
  -> mergePreferences()
  -> decideEventMode()
  -> researchCandidates()
  -> generatePlan()
  -> modifyPlan()

/schemas
  -> ParticipantPreferencePackage
  -> PlanDecisionPackage
  -> EventModeChangeSuggestion
```

## 9. 与现有文档关系

- PRD：[今天整点啥 · PRD v0.1.docx](file:///Users/bytedance/Desktop/%E5%9B%A2%E5%BB%BA%E8%A7%84%E5%88%92/%E4%BB%8A%E5%A4%A9%E6%95%B4%E7%82%B9%E5%95%A5%20%C2%B7%20PRD%20v0.1.docx)
- TRD：[今天整点啥 · TRD v0.2.md](file:///Users/bytedance/Desktop/%E5%9B%A2%E5%BB%BA%E8%A7%84%E5%88%92/%E4%BB%8A%E5%A4%A9%E6%95%B4%E7%82%B9%E5%95%A5%20%C2%B7%20TRD%20v0.2.md)
- 用户旅程与 AI 对话设计：[今天整点啥 · 用户旅程与AI对话设计 v0.2.md](file:///Users/bytedance/Desktop/%E5%9B%A2%E5%BB%BA%E8%A7%84%E5%88%92/%E4%BB%8A%E5%A4%A9%E6%95%B4%E7%82%B9%E5%95%A5%20%C2%B7%20%E7%94%A8%E6%88%B7%E6%97%85%E7%A8%8B%E4%B8%8EAI%E5%AF%B9%E8%AF%9D%E8%AE%BE%E8%AE%A1%20v0.2.md)

