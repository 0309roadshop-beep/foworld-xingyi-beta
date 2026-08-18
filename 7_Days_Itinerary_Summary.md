# FOWORLD · 贵州兴义内测 — 七日任务行程汇总

> 数据来源：`src/config/day1Config.js` ~ `day7Config.js`、`dayConfigs.ts`、`spiritCatalog.ts`
> 提取时间：项目内测版本（只读汇总，非代码修改）

---

## 总览

| 天数 | 主题标题 | 罗盘指引 | 核心游玩区域 |
|------|----------|----------|--------------|
| Day 1 | 古国遗梦, 唤灵觉醒 | 黔西南州博物馆 | 博物馆 → 坝盘河畔 |
| Day 2 | 木石共生, 唤醒群山 | 万峰林半山观景台 | 观景台八卦田 → 跳花广场古榕王 |
| Day 3 | 云海破晓, 湖心蜃楼 | 玉皇顶 | 玉皇顶云海 → 万峰湖吉隆堡 |
| Day 4 | 深渊裂谷, 水之回响 | 马岭河峡谷底部 | 马岭河峡谷 |
| Day 5 | 千灯水寨, 非遗织梦 | 峰林布依景区 | 峰林布依水寨 |
| Day 6 | 幽邃地心, 人间烟火 | 地脉深处 | 探洞 → 阵核重铸 → 街心花园 |
| Day 7 | 百灵归巢, 绘卷飞升 | 最初的起点（寻灵公会基地） | 公会基地 · 终章合成 |

**玩法类型 → 组件映射（全局）**

| 配置 type | 玩法组件 |
|-----------|----------|
| `lbs` | GeoController（LBS 定位导航） |
| `story` | StoryPlayer（剧情对话） |
| `game-puzzle` | PuzzleGrid（九宫格拼图） |
| `game-scan` | ArtifactScan（文物图谱 AR 扫描） |
| `game-river-run` | RiverRunGame（江河御波试炼） |
| `game-camera` | AlignCamera（AR 框景对齐） |
| `game-zhongxing-ar` | ZhongXingAR（众星捧月 AR 共鸣） |
| `game-riyue-tracing` | RiYueTracing（日月田灵纹描摹） |
| `game-bagua-puzzle` | BaGuaTianPuzzle（八卦田八门三才） |
| `game-compass-anomaly` | CompassAnomaly（罗盘异动·灵韵找茬） |
| `game-wind-riding` | WindRiding（追风骑行过渡） |
| `game-leyline-match3` | LeylineMatch3（地脉消消乐） |
| `game-wind-balance` | WindBalanceGame（御风引气·重力平衡盘） |
| `game-cloud-leap` | CloudLeapGame（登云踏雾） |
| `game-matrix` | MatrixPuzzle（城堡实景矩阵还原） |
| `game-audio-catch` | AudioCatcher（飞瀑集音阵） |
| `game-simon` | PentatonicSimon（五音共鸣） |
| `game-gear` | GearPuzzle（水车齿轮动力连线） |
| `game-connect` | ConstellationConnect / OneStrokeConnect（星座/一笔连线） |
| `game-fossil-drag` | FossilDragPuzzle（沧海寻骨拼图） |
| `game-ar-rebirth` | FossilARRebirth（生命 AI 重塑 AR） |
| `game-scroll` | ScrollGenerator（百灵绘卷合成） |
| `game-sticker` | StickerCamera（表情包/胶片贴纸） |
| `game-photo` | PhotoUpload（实景拍照上传） |
| `game-match` | GeoMatch（图形匹配） |
| `game-pipe` | PipeConnect（水管连线） |
| `game-slider` | TimeSlider（时间滑块） |
| `game-scratch` | FossilScratch（化石刮刮乐） |
| `game-form` | FeedbackForm（寻灵感言表单） |

---

## Day 1 · 古国遗梦, 唤灵觉醒

**罗盘指引：** 罗盘指针正隐隐指向：黔西南州博物馆...

**当日主题路线：** 黔西南州博物馆巡礼 → 坝盘桨板体验点 → 御水试炼

### 主线任务（共 7 步，线性推进）

| Step | 任务标题 | 游玩地点 / 目标 | 玩法 type | 组件 | 备注 |
|------|----------|-----------------|-----------|------|------|
| 0 | 前序契约 | 亚朵公会基地（25.09, 104.89） | `lbs` | GeoController | 抵达灵域节点开启剧情 |
| 1 | 身份激活 | — | `story` | StoryPlayer | 罗盘灵开场对白 |
| 2 | 解密九宫格残卷 | 博物馆内 | `game-puzzle` | PuzzleGrid | 铜车马 3×3 拼图复原 |
| 3 | 古国器韵寻踪 | 黔西南州博物馆 | `game-scan` | ArtifactScan | 扫描 6 件文物 + 灵感校验码；解锁 **夜郎铜兽**；+50 灵源 |
| 4 | 御水之契 · 抵坝盘 | 坝盘桨板体验点（25.0882, 104.8978） | `lbs` | GeoController | 博物馆巡礼后前往河畔 |
| 5 | 御水之契 · 灵纹应召 | — | `story` | StoryPlayer | 御水试炼前剧情 |
| 6 | 御水之契 | 意念试炼场 | `game-river-run` | RiverRunGame | 江河御波，躲避浮木暗礁 45s；御水亲和；+50 灵源 |

### 支线任务

| 标题 | 玩法 type | 组件 | 奖励 |
|------|-----------|------|------|
| 支线：文物「显眼包」捕捉 | `game-sticker` | StickerCamera | +50 灵源 |
| 支线:图腾解密 | `game-connect` | OneStrokeConnect | 夜郎符号 × 布依民俗连线；+50 灵源 |

---

## Day 2 · 木石共生, 唤醒群山

**罗盘指引：** 罗盘指针正隐隐指向：万峰林半山观景台...

**当日真实路线：** 万峰林半山观景台（八卦田）→ 电瓶车骑行 → 跳花广场千年古榕王

### 主线任务（共 11 步，线性推进）

| Step | 任务标题 | 游玩地点 / 目标 | 玩法 type | 组件 | 备注 |
|------|----------|-----------------|-----------|------|------|
| 0 | 登临观景台 | 万峰林半山观景台（24.98, 104.92） | `lbs` | GeoController | 登高望远八卦田 |
| 1 | 八卦田传说 | — | `story` | StoryPlayer | 明代风水师布阵传说 |
| 2 | 众星捧月·灵韵共鸣 | 观景台 | `game-zhongxing-ar` | ZhongXingAR | AR 对准众星捧月地貌；+30 灵源 |
| 3 | 日月田·灵纹描摹 | 观景台 | `game-riyue-tracing` | RiYueTracing | 描摹三处日月梯田；+35 灵源 |
| 4 | 八卦田·八门三才 | 观景台 | `game-bagua-puzzle` | BaGuaTianPuzzle | 八门归位 + 三才连环；解锁 **万峰山神**；+100 灵源 |
| 5 | 罗盘异动·灵韵找茬 | — | `game-compass-anomaly` | CompassAnomaly | 净化 3 处灵韵异常；目标：跳花广场·千年古榕；+40 灵源 |
| 6 | 追风骑行·迎风旅途 | 万峰林 → 跳花广场 | `game-wind-riding` | WindRiding | 电瓶车迎风骑行过渡；乘风亲和；+30 灵源 |
| 7 | 寻踪榕树王 | 跳花广场 | `story` | StoryPlayer | 布依歌谣 + 树王指引 |
| 8 | 古榕树王对齐 | 跳花广场古榕王 | `game-camera` | AlignCamera | questType: `tree`；AR 框景对齐树王 |
| 9 | 地脉消消乐 | 古榕地脉 | `game-leyline-match3` | LeylineMatch3 | 7×7 三消疏通地脉；解锁 **古榕木灵**；+50 灵源 |
| 10 | 山岳守护 | — | `story` | StoryPlayer | Day 2 收官剧情 |

### 支线任务

| 标题 | 玩法 type | 组件 | 奖励 |
|------|-----------|------|------|
| 支线：布依织锦 | `game-connect` | OneStrokeConnect | 织锦几何纹路一笔连；+40 灵源 |
| 支线：地道风味补给 | `game-photo` | PhotoUpload | 蛋炒饭合影；+30 灵源 |
| 支线：几何框景 | `game-photo` | PhotoUpload | 方/圆窗框远山框景；+30 灵源 |

---

## Day 3 · 云海破晓, 湖心蜃楼

**罗盘指引：** 罗盘指针正隐隐指向：玉皇顶...

**当日主题路线：** 玉皇顶云海 → 万峰湖吉隆堡 · 虚实闭环

### 主线任务（共 8 步，线性推进）

| Step | 任务标题 | 游玩地点 / 目标 | 玩法 type | 组件 | 备注 |
|------|----------|-----------------|-----------|------|------|
| 0 | 登顶追光 | 玉皇顶最高处（25.01, 104.91） | `lbs` | GeoController | 破晓登顶云海 |
| 1 | 云海秘境 | — | `story` | StoryPlayer | 御风法阵引导 |
| 2 | 御风引气·重力平衡盘 | 玉皇顶 | `game-wind-balance` | WindBalanceGame | 陀螺仪平衡盘，3 光球入阵眼；+30 灵源 |
| 3 | 登云踏雾 | 云海（虚拟） | `game-cloud-leap` | CloudLeapGame | 踩云攀登 1000m 里程碑；解锁 **玉皇云灵**；+50 灵源 |
| 4 | 湖畔幻境 | 万峰湖畔/吉隆堡（24.95, 104.98） | `lbs` | GeoController | 前往湖心古堡节点 |
| 5 | 梦幻相框·城堡定格 | 吉隆堡 | `game-camera` | AlignCamera | questType: `castle`；城堡 AR 框景 |
| 6 | 城堡实景矩阵还原 | 湖畔 | `game-matrix` | MatrixPuzzle | 4×4 矩阵拼图；解锁 **湖心蜃灵**；+100 灵源 |
| 7 | 虚实闭环 | — | `story` | StoryPlayer | Day 3 收官剧情 |

### 支线任务

| 标题 | 玩法 type | 组件 | 奖励 |
|------|-----------|------|------|
| 支线：城堡之眼·咖香掠影 | `game-sticker` | StickerCamera | 咖啡杯 + 吉隆堡胶片感；+40 灵源 |
| 支线：水流轨迹 | `game-pipe` | PipeConnect | 古老水管引流连线；+40 灵源 |
| 支线：航线大片 | `game-photo` | PhotoUpload | 游船三分法构图；+30 灵源 |

---

## Day 4 · 深渊裂谷, 水之回响

**罗盘指引：** 罗盘指针正隐隐指向：马岭河峡谷底部...

**当日主题路线：** 马岭河峡谷栈道 → 珍珠瀑布集音 → 五音共鸣

### 主线任务（共 5 步，线性推进）

| Step | 任务标题 | 游玩地点 / 目标 | 玩法 type | 组件 | 备注 |
|------|----------|-----------------|-----------|------|------|
| 0 | 坠入深渊 | 马岭河峡谷核心观景台（25.1, 104.95） | `lbs` | GeoController | 沿栈道下行谷底 |
| 1 | 地质演变 | — | `story` | StoryPlayer | 「地球最美的伤疤」 |
| 2 | 飞瀑集音阵 | 珍珠瀑布 | `game-audio-catch` | AudioCatcher | 点击气泡收集自然之声 |
| 3 | 五音共鸣 | 峡谷 | `game-simon` | PentatonicSimon | 重奏峡谷之音；解锁 **峡谷水灵**；+100 灵源 |
| 4 | 深渊回响 | — | `story` | StoryPlayer | Day 4 收官剧情 |

### 支线任务

| 标题 | 玩法 type | 组件 | 奖励 |
|------|-----------|------|------|
| 支线:地质时间胶囊 | `game-match` | GeoMatch | 化石/层理图形匹配 3 项；+40 灵源 |
| 支线：峡谷绝佳视界 | `game-photo` | PhotoUpload | 悬崖观景桥峡谷飞瀑大片；+30 灵源 |

---

## Day 5 · 千灯水寨, 非遗织梦

**罗盘指引：** 罗盘指针正隐隐指向：峰林布依景区...

**当日主题路线：** 峰林布依水车 → 黄昏千灯 → 非遗烟火

### 主线任务（共 6 步，线性推进）

| Step | 任务标题 | 游玩地点 / 目标 | 玩法 type | 组件 | 备注 |
|------|----------|-----------------|-----------|------|------|
| 0 | 踏入水寨 | 峰林布依景区水车（24.97, 104.9） | `lbs` | GeoController | 抵达水寨核心水车 |
| 1 | 水车溯源 | — | `story` | StoryPlayer | 布依水寨千年水车 |
| 2 | 动力连线·水车重启 | 水寨 | `game-gear` | GearPuzzle | 齿轮动力连线重启水车；+50 灵源 |
| 3 | 夜幕降临 | — | `story` | StoryPlayer | 黄昏吊脚楼灯火 |
| 4 | 灯火连线·千灯唤灵 | 水寨夜景 | `game-connect` | ConstellationConnect | 勾勒千灯轮廓；解锁 **布依千灯灵**；+100 灵源 |
| 5 | 人间烟火 | — | `story` | StoryPlayer | Day 5 收官剧情 |

### 支线任务

| 标题 | 玩法 type | 组件 | 奖励 |
|------|-----------|------|------|
| 支线：霓裳变身 | `game-photo` | PhotoUpload | 布依传统服饰国风变装；+40 灵源 |
| 支线：非遗寻踪·匠人残片 | `game-photo` | PhotoUpload | 寻访手工坊非遗文创；+50 灵源 |
| 支线：铁花星落 | `game-photo` | PhotoUpload | 夜间打铁花表演全景；+50 灵源 |
| 支线：水寨百戏 | `game-photo` | PhotoUpload | 八音坐唱等民俗表演；+40 灵源 |

---

## Day 6 · 幽邃地心, 人间烟火

**罗盘指引：** 罗盘指针沉入地脉深处，信号即将中断...

**当日主题路线：** 探洞离线 → 阵核重铸 → 兴义街心花园

### 主线任务（共 5 步，线性推进）

| Step | 任务标题 | 游玩地点 / 目标 | 玩法 type | 组件 | 备注 |
|------|----------|-----------------|-----------|------|------|
| 0 | 地心结界 | 探洞途中 | `offline-cave` | OfflineCave | 锁屏专注探洞 |
| 1 | 阵核剥离 | 洞内 | `game-fragment-scanner` | FragmentScanner | 上传钟乳石照片扫描；+35 灵源 |
| 2 | 寻觅息壤 | 深层地脉 | `game-crystal-miner` | CrystalMinerGame | 土元素亲和；+50 灵源 |
| 3 | 阵核重铸 | — | `game-core-fusion` | CoreFusion | 重铸 Day 7 大阵阵核；+30 灵源 |
| 4 | 人间烟火 | 街心花园 | `game-jiexin-checkin` | JiexinCheckIn | LBS 打卡；+20 灵源 |

> Day 6 无主线幻兽解锁；七只核心幻兽已于 Day 1～5 全部收服。

### 支线任务

| 标题 | 玩法 type | 组件 | 奖励 |
|------|-----------|------|------|
| 支线：时间滑块 | `game-slider` | TimeSlider | 滑至「2.5亿年前古海洋」；+40 灵源 |
| 支线：化石修复模拟 | `game-scratch` | FossilScratch | 刮除化石表层泥土；+40 灵源 |

---

## Day 7 · 百灵归巢, 绘卷飞升（终章）

**罗盘指引：** 罗盘指针正剧烈颤动，指向最初的起点...

**当日主题路线：** 回归寻灵公会基地 → 凝结七日记忆 → 百灵绘卷飞升

### 主线任务（共 4 步，线性推进）

| Step | 任务标题 | 游玩地点 / 目标 | 玩法 type | 组件 | 备注 |
|------|----------|-----------------|-----------|------|------|
| 0 | 回归原点 | 寻灵公会基地（25.09, 104.89） | `lbs` | GeoController | 七日终章，回到契约之地 |
| 1 | 七日回响 | — | `story` | StoryPlayer | 博物馆青铜残影 → 峡谷飞瀑绝响回顾 |
| 2 | 终章·百灵绘卷合成 | 公会基地 | `game-scroll` | ScrollGenerator | 凝结七日灵韵长卷；+200 灵源 |
| 3 | 守护者的告别 | — | `story` | StoryPlayer | 罗盘灵告别，七日旅程圆满 |

### 支线任务

| 标题 | 玩法 type | 组件 | 奖励 |
|------|-----------|------|------|
| 支线：寻灵感言 | `game-form` | FeedbackForm | 内测感受反馈表单；+100 灵源 |

---

## 七日主线可解锁幻兽（图鉴）

| 幻兽名称 | 解锁天数 | 解锁任务 | 元素 |
|----------|----------|----------|------|
| 夜郎铜兽 | Day 1 | 古国器韵寻踪 | 金 |
| 万峰山神 | Day 2 | 八卦田·八门三才 | 土 |
| 古榕木灵 | Day 2 | 地脉消消乐 | 木 |
| 玉皇云灵 | Day 3 | 登云踏雾 | 风 |
| 湖心蜃灵 | Day 3 | 城堡实景矩阵还原 | 水 |
| 峡谷水灵 | Day 4 | 五音共鸣 | 水 |
| 布依千灯灵 | Day 5 | 灯火连线·千灯唤灵 | 火 |

---

## 行程统计

| 项目 | 数量 |
|------|------|
| 主线总步数 | 47 步 |
| 支线总任务 | 22 个 |
| 可解锁幻兽 | **7 只** |
| LBS 定位节点 | 14 处 |

---

## Web 应用概述（提示词）

> 以下内容可直接作为向 AI、设计或新成员介绍本项目的**系统提示词 / 产品说明**，描述 FOWORLD「寻灵记」H5 内测版的整体定位、页面与功能。

### 产品定位（Prompt 正文）

```
你是 FOWORLD「寻灵记」——一款面向贵州兴义万峰林景区的移动端 H5 实景沉浸式 RPG 内测产品。

【世界观】
玩家扮演「唤灵师」，手持数字化罗盘，在真实地理空间中完成七日寻灵之旅。从博物馆青铜文物、万峰林八卦田、玉皇顶云海、马岭河峡谷、布依水寨千灯，到地心阵核重铸，最终凝结「百灵绘卷」收官。山河、非遗、地质与神话以 LBS + AR + 轻游戏玩法串联。

【技术形态】
- React 19 + Vite + TypeScript 单页应用（SPA）
- 移动端优先（MobileShell 全屏壳层），HTTPS 本地开发（端口 5173）
- 依赖浏览器：GPS 定位、设备方向（罗盘/陀螺仪）、后置摄像头（AR/扫描）
- 进度持久化：gameStore（当前天数 currentDay、步骤 currentStep、灵源 lingyuan、已收集幻兽 collectedSpirits）
- 身份体系：PlayerContext（唤灵师注册、实体卡激活、背包/记录/兑换券）

【核心玩法循环】
1. 注册激活 → 进入罗盘主页 /compass
2. 罗盘指引当前 Day 的 LBS 目标点 → 抵达后推进主线 step
3. 主线 step 类型：剧情对话(story)、定位(lbs)、各类小游戏(game-*)
4. 完成任务获得灵源、解锁幻兽、推进 nextStep / nextDay
5. 支线可独立打开完成，不影响主线线性顺序
6. Day 7 合成百灵绘卷，七日旅程结束

【视觉基调】
深色「虚空」色盘 + 玉色/金色灵韵高光，万峰林喀斯特山水意象，温暖休闲的文旅叙事风格（非硬核科幻）。
```

### 页面与路由一览

| 路由 | 页面/组件 | 是否需要登录 | 功能说明 |
|------|-----------|--------------|----------|
| `/` | LandingPage | 否 | 品牌落地页「寻灵记」，入口引导注册/进入灵域 |
| `/register` | RegisterPage | 否 | 唤灵师注册：昵称、灵系选择、实体卡 4 位验证码激活 |
| `/compass` | CompassOS（罗盘主控） | 是 | **核心主页**：罗盘表盘、GPS、地图、七日主线任务窗口、支线入口、灵源显示 |
| `/profile` | ProfilePage | 是 | 唤灵师档案：背包碎片、寻灵记录、兑换券 |
| `/collection` | CollectionPage | 是 | 百灵收藏图鉴：已解锁幻兽、按 Day 分组、收集进度 |
| `/exchange` | ExchangePage | 是 | 灵源兑换：合作商户商品、灵源滴换礼券 |
| `/tasks` | TaskDetailPage | 是 | 开发者/遗留：任务列表 + 全量小游戏组件试玩面板 |
| `/camera` | CameraPage → AlignCamera | 是 | AR 框景对齐（quest=tree/bagua/castle） |
| `/sticker-camera` | StickerCameraPage | 是 | 贴纸相机（显眼包 meme / 胶片 film） |
| `/day1` | Day1Page | 是 | 独立 Day 1 流程页（调试/快测） |
| `/river-run` | RiverRunPage | 是 | 御水之契 · 江河御波试炼 |
| `/artifact-scan` | ArtifactScanPage | 是 | 古国器韵 · 博物馆文物 AR 扫描 |
| `/zhongxing-ar` | ZhongXingARPage | 是 | 众星捧月 · 观景台 AR 共鸣 |
| `/riyue-tracing` | RiYueTracingPage | 是 | 日月田 · 灵纹描摹 |
| `/bagua-puzzle` | BaGuaPuzzlePage | 是 | 八卦田 · 八门三才解密 |
| `/compass-anomaly` | CompassAnomalyPage | 是 | 罗盘异动 · 灵韵找茬 |
| `/wind-riding` | WindRidingPage | 是 | 追风骑行 · 迎风旅途过渡 |
| `/leyline-match3` | LeylineMatch3Page | 是 | 地脉消消乐 |
| `/wind-balance` | WindBalancePage | 是 | 御风引气 · 重力平衡盘（陀螺仪） |
| `/test/wind-balance` | WindBalancePage | **否** | 御风引气免登录真机试玩 |
| `/cloud-leap` | CloudLeapPage | 是 | 登云踏雾 · 云海跳跃 |
| `/test/cloud-leap` | CloudLeapPage | **否** | 登云踏雾免登录真机试玩 |

### 功能模块说明

#### 1. 身份与账户
- **落地页**：品牌展示、进入注册
- **注册激活**：三步流程（灵师信息 → 择灵系 earth/water/wind 等 → 实体卡验证）
- **ProtectedRoute**：未激活用户访问主功能时重定向至 `/`

#### 2. 罗盘主控 OS（`/compass`）
- **CompassDial**：结合设备方向与目标方位，显示当前 Day 的 `compassHint`
- **GeoController / LBS**：读取 GPS，计算与目标点距离，抵达后允许推进
- **TaskMap**：Leaflet 地图展示任务点与玩家位置（Mock 任务数据）
- **StoryQuestWindow + MainQuestStage**：按 `dayConfigs` 渲染当前 step 的剧情/小游戏
- **QuestJumpPanel**：玩家/调试模式下的环节快跳、七日 step 导航、进度重置
- **SpiritAwakenModal**：幻兽唤醒收服弹窗
- **gameStore**：灵源增减、幻兽解锁、亲和解锁、线索收录、支线完成标记、调试模式

#### 3. 小游戏玩法库（嵌入主线或独立路由）

| 类别 | 组件 | 典型场景 |
|------|------|----------|
| 拼图/矩阵 | PuzzleGrid, MatrixPuzzle, BaGuaTianPuzzle | 铜车马九宫格、城堡矩阵、八卦阵 |
| AR/相机 | AlignCamera, ZhongXingAR, FossilARRebirth, ArtifactScan | 树王/八卦/城堡框景、众星捧月、化石扫描、文物扫描 |
| 描摹/找茬 | RiYueTracing, CompassAnomaly | 日月田描摹、磁场干扰找茬 |
| 物理/体感 | WindBalanceGame, CloudLeapGame, RiverRunGame | 陀螺仪平衡盘、云海跳跃、江河御波 |
| 音律 | AudioCatcher, PentatonicSimon | 飞瀑集音、五音共鸣 |
| 连线/匹配 | OneStrokeConnect, ConstellationConnect, GeoMatch, PipeConnect, GearPuzzle | 图腾解密、千灯连线、地质匹配、水管、水车齿轮 |
| 三消/骑行 | LeylineMatch3, WindRiding | 古榕地脉、电瓶车过渡 |
| 化石/时间 | FossilDragPuzzle, FossilScratch, TimeSlider | 贵州龙拼图、刮刮乐、地质年代滑块 |
| 贴纸/拍照 | StickerCamera, PhotoUpload | 文物显眼包、胶片大片、支线实景上传 |
| 终章/反馈 | ScrollGenerator, FeedbackForm | 百灵绘卷合成、内测寻灵感言 |

#### 4. 收集与成长
- **灵源（lingyuan）**：完成任务奖励，用于兑换
- **幻兽图鉴（SPIRIT_CATALOG）**：7 只主线幻兽，按 Day 1～5 解锁
- **百灵收藏页**：查看已收服幻兽详情、 lore、稀有度
- **Profile 背包/记录**：碎片、AR 扫描记录、任务完成记录

#### 5. 商业与兑换（内测 Mock）
- **ExchangePage**：商户列表、灵源兑换商品、兑换成功券

#### 6. 开发者与试玩
- **调试模式**：罗盘页切换 DEBUG，显示环节快跳面板
- **devShortcuts**：`/tasks` 全组件面板、各游戏独立路由
- **免登录试玩**：`/test/wind-balance`、`/test/cloud-leap` 供真机扫码直测

### 数据与配置架构（给 AI 的上下文）

```
src/config/
  day1Config.js ~ day7Config.js   # 七日主线 + 支线 JSON 配置
  dayConfigs.ts                   # 天数注册表
  spiritCatalog.ts                # 幻兽图鉴元数据
  day1ArtifactScanData.ts         # 博物馆 6 件文物扫描数据
  devShortcuts.ts                 # 开发快捷路由

src/store/gameStore.ts            # 全局进度状态
src/context/PlayerContext.tsx     # 用户身份与背包
src/components/compass/           # 罗盘 OS、主线舞台、任务窗口
```

### 一句话电梯演讲

> **FOWORLD 寻灵记**是一款在贵州兴义万峰林实地游玩的 **7 天 LBS + AR 唤灵 H5**：用罗盘找路、用相机对齐灵纹、用轻游戏解锁七只山河幻兽，最终在公会基地合成百灵绘卷——把博物馆、峰林、云海、峡谷、水寨与地心探洞串成一条可走的数字文旅主线。

---

*本文件由项目配置自动提取生成，仅供查阅与策划对齐，不代表运行时文案的最终排版。*
