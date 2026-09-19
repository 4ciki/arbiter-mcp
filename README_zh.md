<p align="right">
  <a href="https://www.producthunt.com/products/arbiter-mcp?utm_source=badge-follow&utm_medium=badge&utm_source=badge-arbiter&#0045;mcp" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=1320651&theme=dark" alt="arbiter&#0045;mcp - AI&#0032;agent&#0032;that&#0032;triages&#0032;IT&#0032;tickets&#0044;&#0032;not&#0032;just&#0032;routes&#0032;them | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</p>

<p align="center">
  <img src="arbiter-mcp-ai-agent-icon-transparent.png" alt="Arbiter MCP Logo" width="200" />
</p>

<h1 align="center">Arbiter</h1>

<p align="center">
  <strong>自主式 IT 服务台工单分流与安全关键型解决引擎。</strong>
</p>

<p align="center">
  <a href="README.md"><b>English</b></a> | <a href="README_zh.md"><b>简体中文</b></a> | <a href="README_ar.md"><b>العربية</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/LangGraph-1.x-1C3C3C?logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Streamlit-1.38-FF4B4B?logo=streamlit&logoColor=white" alt="Streamlit" />
  <img src="https://img.shields.io/badge/ChromaDB-1.x-F97316?logoColor=white" alt="ChromaDB" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue?logo=apache&logoColor=white" alt="License" />
  <img src="https://img.shields.io/badge/Tests-51%20passed-22C55E?logo=pytest&logoColor=white" alt="Tests" />
</p>

<p align="center">
  <img src="arbiter-ai-agent-it-ticket-triage-product-hunt-cover.png" alt="Arbiter — 用于 IT 工单分流的人工智能智能体" width="100%" />
</p>

Arbiter 是一个基于 LangGraph、FastAPI、ChromaDB 和 Streamlit 构建的开源、跨模型供应商的 IT 工单解决智能体。它展示了一个企业级的智能体架构，通过结合语义检索、历史分类成功率以及多层次 LLM 推理，在安全实现 IT 支持工单自动化的同时，严格将高风险和低置信度的案例转交人工处理。

> [!NOTE]
> **作品集 / 开源项目**：本项目为具备弹性、跨模型供应商的智能体架构、确定性信任评分与人机协同（Human-in-the-Loop）工作流的技术演示，并非商用 SaaS 产品。

---

## 架构

Arbiter 将推理决策与基础设施完全解耦：
- **工单来源 (Ticketing Source)**：通过 Atlassian 远程 Rovo MCP 协议 (`/v1/mcp`) 与 Jira 集成。
- **即时通讯接口 (Chat Sink)**：向 Slack 推送交互式 Block Kit 卡片，支持 HMAC-SHA256 原始请求签名验证。
- **跨供应商 LLM 层 (Provider-Agnostic LLM Layer)**：分类采用低成本/极速的开源模型 (Groq `openai/gpt-oss-20b`)；升级摘要采用高能力前沿模型 (Google Vertex AI `gemini-3.8-flash`)。
- **工作流编排 (Orchestration)**：基于有状态 LangGraph 图结构，搭载 `AsyncSqliteSaver` 检查点保存器，支持跨进程安全暂停与恢复。
- **审计与指标分析 (Audit & Analytics)**：追加写入式 SQLite 审计日志，以及实时的 Streamlit 运维仪表板。

![Arbiter 智能体架构](enterprise_ticket_agent_flow.png)

---

## 信任评分工作原理

Arbiter 的核心是由纯函数实现的确定性、安全关键型信任度计算（详见 [`scoring/trust_scorer.py`](scoring/trust_scorer.py)）。

每张进入系统的工单都会通过三个加权维度进行综合评估：

$$\text{TrustScore} = w_{\text{retrieval}} \cdot S_{\text{retrieval}} + w_{\text{category}} \cdot S_{\text{category}} + w_{\text{llm}} \cdot S_{\text{llm}}$$

| 评估组件 | 默认权重 | 计算方式与安全不变量 |
|---|---|---|
| **检索相似度组件** ($S_{\text{retrieval}}$) | `0.40` | ChromaDB 中最匹配已解决案例的余弦相似度 ($0.0 - 1.0$)。若无相似历史案例则严格返回 `0.0`。 |
| **类别历史成功率组件** ($S_{\text{category}}$) | `0.35` | 历史人工认可率 (`human_agreed_count / total_handled`)。**冷启动保护**：若 `total_handled < 20`，强制默认取值 `0.30`，未经充分验证的类别无法触发自动解决。 |
| **LLM 自评置信度组件** ($S_{\text{llm}}$) | `0.25` | 分类提示词输出的自评模型置信度 ($0.0 - 1.0$)。 |

### 安全关键风险覆盖机制 (Risk Override)

Arbiter 强制执行绝对安全保证：**任何带有高风险关键词的工单绝不允许被自动解决**，无论其数值信任评分有多高。

若分类阶段检测到任何风险标识（`production`、`security`、`billing`、`data_loss`）：
1. `risk_override` 被置为 `True`。
2. 决策函数 (`decide()`) 无条件将工单路由至 `"escalate"`（人工升级）。
3. 交互式卡片推送至 Slack 供人工团队审核。
4. 数值评分依然完整保留在数据库及审计日志中，供运维数据分析使用。

---

## 快速上手与本地配置

### 1. 环境准备
- Python 3.11 或 3.12
- Git
- Jira、Slack 和 Google Cloud / Groq 的免费测试账号（可选；本地测试套件在零外部凭证下亦可全数通过）

### 2. 克隆项目与虚拟环境
```bash
git clone https://github.com/4ciki/arbiter-mcp.git
cd arbiter-mcp

# 创建并激活虚拟环境
python -m venv .venv
# Windows 系统:
.\.venv\Scripts\Activate.ps1
# Linux/macOS 系统:
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 配置环境变量 `.env`
复制模板配置文件：
```bash
cp .env.example .env
```
在 `.env` 中填写你的 API 凭据（各字段定义详见 [.env.example](.env.example)）：
- **Jira Rovo MCP**: `JIRA_SITE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- **Slack**: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- **Vertex AI**: `GOOGLE_APPLICATION_CREDENTIALS`, `GCP_PROJECT_ID`
- **Groq**: `GROQ_API_KEY`

---

## 使用 Docker 运行

<img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" height="20" /> 单条命令即可启动完整系统（FastAPI 后端 + Streamlit 仪表板 + 持久化存储）：

```bash
docker-compose up --build
```

对外开放的服务端口：
- **FastAPI 后端与 Webhooks**: [http://localhost:8000](http://localhost:8000)
  - 交互式 API 文档: [http://localhost:8000/docs](http://localhost:8000/docs)
  - 健康检查接口: [http://localhost:8000/health](http://localhost:8000/health)
- **Streamlit 运维仪表板**: [http://localhost:8501](http://localhost:8501)

不使用 Docker 直接本地运行：
```bash
# 终端 1: 运行 API 服务
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# 终端 2: 运行仪表板
streamlit run dashboard/app.py --server.port 8501
```

---

## 运行测试套件

<img src="https://img.shields.io/badge/pytest-51%20passed-22C55E?logo=pytest&logoColor=white" height="20" /> Arbiter 包含完整的自动化测试套件，全面覆盖纯函数评分数学逻辑、ORM 持久化、向量检索隔离性、LangGraph 状态检查点及 Webhook 签名安全校验：

```bash
python -m pytest tests/ -v
```

全部 51 项测试均可在本地独立执行，无需任何外部凭据或网络连接。

---

## 性能与基准评测数据

以下指标通过 Arbiter 的基准运行工具（[`run_benchmark.py`](run_benchmark.py)）针对固定评估数据集（[`benchmark_ground_truth.csv`](benchmark_ground_truth.csv)，$N = 40$）在完整实时流水线上实测得出（Groq `openai/gpt-oss-20b` 用于分类，ChromaDB `all-MiniLM-L6-v2` 语义检索，确定性信任评分，SQLite 持久化）：

| 评估指标 | 实测数值 ($N = 40$) | 说明与运维背景 |
|---|---|---|
| **分类准确率 (Top-1)** | **31 / 40** (77.5%) | 对照标准真值的 Top-1 准确率。9 例未匹配项中，有 5 例为 "other" 类别的 0% 成功率（T36–T40）；其余 4 例为双领域边界案例。 |
| **自动解决率** | **8 / 40** (20.0%) | 在当前提示词下，40 张工单中恰好有 8 张成功自动解决，其中常规工单 T03 和 T09 已不再被误报风险拦截。 |
| **人工升级率** | **32 / 40** (80.0%) | 包含高风险工单（8 张）、冷启动保护类别（<20 样本）或低相似度工单，均安全转交 Slack 供人工审核。 |
| **平均分流耗时 (MTTT)** | **1.19s** (中位数: 1.03s) | 从工单接收到分类、向量检索、信任评分及决策路由的全链路延迟（基于 Groq LPU 加速）。 |
| **错误自动解决数 (误报率)** | **0 / 40** (0.0%) | **绝对安全底线得以坚守**。没有任何包含风险或未验证的工单被错误自动解决。 |

### 风险校准、已知局限与陷阱分析
- **已知局限 — 兜底类别 (`other`, 0/5 成功率)**：所有 5 张原本归为 `other` 类的工单（`T36`–`T40`）均被误分类为更具体的功能类别（针对 Outlook/Teams/报销软件归入 `software`，工位显示器支架归入 `hardware`，2FA 政策归入 `access`）。当存在任何具体的业务领域关键词时，模型在兜底类标签上的准确率为 0%。其余 4 项不匹配案例（`T04`、`T05`、`T11`、`T33`）属于跨领域边界案例（例如 VPN 客户端密码、网线接口与网络连接区分）。
- **避开误报陷阱 (6 / 6, 100%)**：`CLASSIFY_PROMPT` 中明确设置的反向边界提示词成功阻止了全部 6 张陷阱工单（`T03`、`T09`、`T13`、`T20`、`T25`、`T32`）触发虚假风险覆盖。特别是常规工单 `T03`（账户锁定）和 `T09`（VPN 握手错误）不再被误判为风险，信任得分超过 0.75，从而安全地自动解决。
- **真风险完全拦截 (8 / 8, 100%)**：全部 8 张真实高危工单（`T04`、`T08`、`T14`、`T17`、`T21`、`T26`、`T31`、`T35`，涵盖账户劫持、生产流水线故障、账单异常、电池物理膨胀及数据丢失风险）均准确触发 `risk_override = True` 并转交人工。
- **冷启动防护机制**：针对样本量不足的历史分类（`access`、`network`、`other`），系统严格执行冷启动惩罚分（$0.30$），防止不成熟的类别过早自动解决。
- **实验可重现性**：在本地运行 `python run_benchmark.py` 即可随时重跑这 40 张基准工单测试。完整的单工单日志及遥测数据将保存至 `benchmark_results.json`。

---

## 开源许可证

本项目基于 [Apache License 2.0](LICENSE) 许可协议开源。版权所有 © 2026 4ciki。
