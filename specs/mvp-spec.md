# AI 减脂饮食管理 App — 产品规格文档 (MVP)

## Problem Statement

人们在点外卖（如 Grab）或到店就餐时，无法知道所点食物的热量和营养构成。长期下来，摄入超标而不自知，导致体重失控。现有的饮食管理工具（如 MyFitnessPal）需要手动搜索食物数据库，流程繁琐且对亚洲本地食物覆盖不足，用户难以坚持。

## Solution

一款 AI 驱动的移动端减脂饮食管理 App。用户只需拍照，AI 即可识别食物并估算热量；AI 会持续学习用户的饮食偏好、身体状况和生活场景，提供越来越精准的个性化建议——无需用户反复解释自己的情况。

核心价值主张：**AI 越用越懂你。**

## User Stories

### Onboarding & 用户档案
1. As a new user, I want to sign up with email or social login, so that I can create my account quickly
2. As a new user, I want to answer 5 quick questions (gender, age, height, weight, goal) during onboarding, so that the AI has enough context to give me personalized advice from day one
3. As a user, I want to view and edit my profile at any time, so that I can update my information as my body or goals change
4. As a user, I want the AI to gradually learn my dietary preferences over time, so that I don't have to fill out a long questionnaire upfront

### 拍照识别 (Core Loop)
5. As a user, I want to take a photo of my meal from within the app, so that the AI can analyze what I'm eating
6. As a user, I want to select an existing photo from my gallery, so that I can log a meal I photographed earlier
7. As a user, I want the AI to identify each food item in my photo, so that I know what I'm eating
8. As a user, I want to see estimated calories for each identified food item, so that I understand the caloric impact
9. As a user, I want to see a brief nutritional evaluation (protein, carbs, fat breakdown), so that I understand the quality of my meal, not just the quantity
10. As a user, I want to receive AI-generated feedback on my meal (e.g. "high in oil, consider lighter options next time"), so that I learn to make better choices
11. As a user, I want to confirm or edit the AI's identification results before saving, so that my records are accurate
12. As a user, I want each logged meal to be automatically added to my daily intake total, so that I don't have to track manually

### 每日总览 (Dashboard)
13. As a user, I want to see today's total calorie intake on the home screen, so that I know where I stand
14. As a user, I want to see my daily calorie target (calculated by AI based on my profile), so that I know my limit
15. As a user, I want to see my estimated calorie expenditure for today, so that I understand my calorie gap
16. As a user, I want to see a visual progress indicator (e.g. a gauge or progress bar), so that I can quickly assess my day at a glance
17. As a user, I want to see a list of all meals I logged today, so that I can review my eating history
18. As a user, I want to receive an AI-generated daily summary at the end of each day, so that I understand my overall performance
19. As a user, I want to receive AI-generated suggestions for tomorrow based on today's eating patterns, so that I can plan ahead

### 运动记录
20. As a user, I want to manually log my exercise (type, duration), so that the AI can factor it into my calorie gap
21. As a user, I want the AI to estimate calories burned from my logged exercise based on my weight, so that I see a more accurate daily gap
22. As a user, I want my exercise to appear on the daily dashboard alongside my intake, so that I see the full picture

### 减脂计划
23. As a user, I want the AI to generate a weekly meal plan with daily calorie targets, so that I have a structured guide to follow
24. As a user, I want the weekly plan to include dietary suggestions suited to my local food options, so that the advice is practical and actionable
25. As a user, I want the AI to generate a weekly exercise suggestion, so that I have a simple fitness guide
26. As a user, I want the plan to update weekly based on my actual performance and progress, so that it stays relevant
27. As a user, I want to view my weight trend over time on a chart, so that I can see if the plan is working

### AI 个性化
28. As a user, I want the AI to remember my dietary preferences (e.g. no beef, loves spicy food), so that its suggestions feel personal
29. As a user, I want the AI to remember my common eating patterns (e.g. usually orders Grab for lunch), so that its advice fits my lifestyle
30. As a user, I want the AI's advice quality to improve the longer I use the app, so that I feel rewarded for consistent usage

## Implementation Decisions

### 技术栈
- **前端**: React Native + TypeScript（跨平台，一套代码覆盖 iOS 和 Android）
- **后端**: Supabase（提供 PostgreSQL 数据库、用户认证、文件存储）+ Node.js 边缘函数/独立后端服务
- **AI 引擎**: 统一多模态大模型（GPT-4o 或 Claude），同时处理图像识别和文本对话/建议生成
- **共享类型**: 前后端通过 TypeScript 类型定义共享数据契约

### 系统架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Native   │────▶│  Node.js Backend  │────▶│  LLM API        │
│  (Expo)         │     │  (API + Workers)  │     │  (GPT-4o/Claude)│
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │    Supabase       │
                        │  - Auth          │
                        │  - PostgreSQL    │
                        │  - Storage       │
                        └──────────────────┘
```

### 数据模型核心实体

- **User**: 认证信息 + 基础档案（gender, age, height, weight, goal, target_weight）
- **UserProfile**: 结构化 AI 档案（饮食偏好、过敏源、常吃食物、运动习惯等，由 AI 摘要持续更新）
- **MealLog**: 每次拍照记录（photo_url, identified_foods[], total_calories, nutrition_breakdown, ai_feedback, timestamp）
- **ExerciseLog**: 运动记录（type, duration_minutes, estimated_calories_burned, timestamp）
- **DailySummary**: 每日汇总（total_intake, total_expenditure, calorie_gap, ai_summary, ai_suggestions）
- **WeeklyPlan**: 周度计划（daily_targets[], meal_suggestions[], exercise_suggestions[], generated_at）
- **InteractionHistory**: 原始交互历史（用于 AI 摘要生成）

### 用户记忆系统

采用**结构化档案 + AI 摘要**混合方案：

1. 用户注册时创建结构化档案（来自 onboarding 的 5 个字段）
2. 每次拍照/交互记录存入 InteractionHistory
3. 每日结束时（或定时任务），AI 从当日交互历史中提炼摘要，更新 UserProfile
4. 每次调用 AI 时，prompt 中注入：UserProfile（精简档案）+ 当日 MealLog + 当日 ExerciseLog

Token 控制策略：UserProfile 限制在 500 token 以内，每日记录控制在 1000 token 以内，单次 AI 调用总输入不超过 3000 token。

### AI 接口设计

后端提供以下 AI 代理接口（客户端不直接调用 LLM API）：

- **POST /api/analyze-meal**: 接收图片 → 调用多模态 LLM → 返回食物识别结果 + 热量估算 + 营养评价 + 个性化反馈
- **POST /api/generate-daily-summary**: 汇总当日数据 → 生成 AI 日总结 + 明日建议
- **POST /api/generate-weekly-plan**: 基于用户档案和近期表现 → 生成周度饮食+运动计划
- **POST /api/log-exercise**: 接收运动输入 → 估算消耗 → 更新当日数据
- **POST /api/update-profile-summary**: 定时任务，AI 从历史记录中提炼摘要更新 UserProfile

### 页面结构（5 个页面）

| 页面 | 路由 | 核心功能 |
|------|------|---------|
| Onboarding | `/onboarding` | 注册/登录 + 5 个基础问题 |
| Home | `/home` | 今日热量仪表盘 + 餐食列表 + AI 日总结 |
| Camera | `/camera` | 拍照/选图 → AI 识别结果展示 → 确认保存 |
| Plan | `/plan` | 周度减脂计划 + 运动记录入口 |
| Profile | `/profile` | 用户档案查看/编辑 + 历史趋势图表 |

### 位置数据策略

MVP 阶段：用户可主动告诉 AI 所在位置（如「我在 KLCC 附近」），AI 结合常识给出附近常见餐饮的建议。支持拍照上传餐厅菜单让 AI 推荐点哪个菜。

后期：接入 Google Places API 实现自动定位和餐厅数据获取。

### 商业模式

MVP 阶段全免费，不实现支付/订阅系统。在 User 表中预留 `plan` 字段（默认值 `free`），为未来引入付费层做架构预留。

### 目标市场

东南亚（马来西亚、新加坡、泰国），英文界面。AI 需要特别适配东南亚本地食物（海南鸡饭、叻沙、椰浆饭、沙爹等）。

## Testing Decisions

### 测试原则
- 只测试外部行为（输入 → 输出），不测试实现细节
- AI 相关测试使用 snapshot/mocked 响应，不依赖真实 LLM API 调用
- 后端 API 接口进行集成测试，验证完整数据流

### 测试范围

| 模块 | 测试类型 | 说明 |
|------|---------|------|
| 用户认证 (Auth) | 集成测试 | 注册、登录、onboarding 数据保存 |
| 拍照识别 API | 集成测试 + Mock | Mock LLM 响应，验证请求格式和数据转换 |
| 每日汇总计算 | 单元测试 | 热量摄入/消耗/缺口的数学计算 |
| 用户档案摘要 | 集成测试 + Mock | 验证 AI 摘要正确更新 UserProfile |
| 周度计划生成 | 集成测试 + Mock | 验证计划基于用户档案和近期数据生成 |
| 前端页面 | 组件测试 | 核心 UI 组件渲染和交互逻辑 |

### 测试先行 (TDD) 优先级
1. 每日热量计算逻辑（纯数学，最容易测试）
2. AI 代理 API 接口（验证请求/响应格式）
3. 用户档案摘要更新逻辑

## Out of Scope

以下功能明确不在 MVP 范围内：

- **社交功能**: 好友系统、排行榜、分享、社区
- **食物数据库手动搜索**: 用户只能通过拍照识别，不能手动搜索食物库
- **多语言支持**: MVP 仅英文界面
- **支付/订阅系统**: MVP 全免费
- **健康设备同步**: 不对接 Apple HealthKit、Google Fit、智能手环等
- **GPS 自动餐厅推荐**: 不自动获取附近餐厅数据
- **实时聊天/客服**: 不提供人工客服功能
- **Push 通知**: MVP 不实现推送提醒（如提醒拍照记录）
- **食物条码扫描**: 不支持扫描包装食品条码

## Further Notes

### 关于 App 命名
App 名称尚未确定，需在开发前决定。建议选择一个简短、易记、与健康/饮食相关的英文名。

### AI 成本控制
每次 AI 调用都有成本。MVP 阶段需要监控：
- 单用户日均 AI 调用次数
- 单次调用的 token 消耗
- 建议设定软限制：每用户每日最多 10 次拍照识别

### 隐私与合规
- 食物照片存储在 Supabase Storage，需设置合理的保留策略（如 90 天自动清理）
- 用户健康数据属于敏感信息，需符合基本的数据保护要求
- 目标市场为东南亚，需关注 PDPA（马来西亚/新加坡个人数据保护法）的基本要求

### 后续迭代方向（MVP 之后）
- 接入 Google Places API 实现位置感知推荐
- 对接 Apple HealthKit / Google Fit 自动获取运动数据
- 引入社交功能（好友挑战、排行榜）
- 添加订阅付费层（无限识别 + 高级分析）
- Push 通知（定时提醒记录饮食）
- 多语言支持（中文、马来语、泰语）
