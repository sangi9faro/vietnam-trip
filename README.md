# 越南跨年 2026–2027

> **已搬家（2026-10-17）**：页面已经合并到主页仓库的通用旅行页 `/t/?id=vietnam-2026`（`sangi9faro.github.io` 仓库的 `t/`）。
> 这里的 `index.html`、`guide.html`、`vote.html` 只负责跳转；旧数据和顶层规则保留到旅行结束后一个月。
> `firestore.rules`、模拟器测试（`npm run test:rules`、`scripts/seed-emulator.mjs`）仍在本仓库。

四个人共用的旅行小站（GitHub Pages + Firebase `vietnam-trip-10761`）。

| 页面 | 内容 |
|---|---|
| `guide.html` | 攻略：地图 + 每天行程，可在线编辑（Firestore `days/d1–d6`） |
| `index.html` | 工具箱：基础信息、准备清单、攻略收藏、行李（`#packing`）；AA 账单（`#aa`） |
| `vote.html` | 投票合集 |

共享代码：`ui.css`（和 sangi9faro.github.io 的那份必须一模一样）、`trip-nav.js`（导航）、`trip-data.js` + `flights.js`（航班卡片）、`packing.js`（行李）、`routes.js`（地图路线）。

## 地图路线

- 每个地点可以有 `via` 字段（`walk` / `taxi` / `bus` / `flight` / `none`），表示从上一站怎么过来；不填就按距离和名称自动判断（规则在 `routes.js` 的 `classify`）。
- 打车和大巴的真实路线预先算好放在 `routes.json`；网页上新加的地点会实时向 OSRM 公共服务请求，失败时画虚线直线。

**行程改了以后**，重新生成路线并提交：

```bash
node scripts/build-routes.mjs   # 读 Firestore 的行程（连不上时读 guide.html 里的备用数据），每段间隔 1 秒请求 OSRM
git add routes.json && git commit -m "chore(data): rebuild routes" && git push
```

## Firestore 规则

规则在 `firestore.rules`，改完运行：

```bash
firebase deploy --only firestore:rules --project vietnam-trip-10761
```
