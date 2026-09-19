<p align="right">
  <a href="https://www.producthunt.com/products/arbiter-mcp?utm_source=badge-follow&utm_medium=badge&utm_source=badge-arbiter&#0045;mcp" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=1320651&theme=dark" alt="arbiter&#0045;mcp - AI&#0032;agent&#0032;that&#0032;triages&#0032;IT&#0032;tickets&#0044;&#0032;not&#0032;just&#0032;routes&#0032;them | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</p>

<p align="center">
  <img src="arbiter-mcp-ai-agent-icon-transparent.png" alt="شعار Arbiter MCP" width="200" />
</p>

<h1 align="center">Arbiter</h1>

<p align="center">
  <strong>محرك مستقل لتصنيف وفرز تذاكر دعم تقنية المعلومات وحلها مع الحفاظ على معايير الأمان القصوى.</strong>
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
  <img src="arbiter-ai-agent-it-ticket-triage-product-hunt-cover.png" alt="Arbiter — وكيل ذكاء اصطناعي لفرز وتصنيف تذاكر تقنية المعلومات" width="100%" />
</p>

<div dir="rtl">

يعتبر **Arbiter** وكيلاً برمجياً مفتوح المصدر ومستقلاً عن مزودي النماذج لحل تذاكر دعم تكنولوجيا المعلومات، تم بناؤه باستخدام LangGraph وFastAPI وChromaDB وStreamlit. يستعرض المشروع بنية معمارية احترافية للوكلاء تجمع بين الاسترجاع الدلالي (Semantic Retrieval)، ومعدلات النجاح التاريخية للفئات، والاستدلال متعدد المستويات عبر نماذج اللغة الكبيرة (LLMs) لأتمتة حل تذاكر الدعم الفني بأمان فائق، مع التوجيه الصارم للحالات الحساسة ومنخفضة الثقة إلى المراجعة البشرية.

> [!NOTE]
> **مشروع مفتوح المصدر / معرض أعمال (Portfolio)**: هذا المستودع هو استعراض تقني لأنماط الوكلاء المرنة والمستقلة عن المزود، ونظام حساب الثقة الحتمي، وسير عمل المراجعة البشرية (Human-in-the-Loop) — وليس منتج SaaS تجارياً.

---

## البنية المعمارية

يفصل Arbiter عملية الاستدلال والتفكير عن البنية التحتية الأساسية:
- **مصدر التذاكر (Ticketing Source)**: التكامل مع Jira عبر بروتوكول Rovo MCP عن بُعد الخاص بشركة Atlassian عبر المسار (`/v1/mcp`).
- **وجهة المحادثة (Chat Sink)**: إرسال بطاقات Block Kit تفاعلية إلى Slack مع التحقق من صحة التوقيع الخام باستخدام HMAC-SHA256.
- **طبقة نماذج اللغة المستقلة عن المزود (Provider-Agnostic LLM Layer)**: استخدام أوزان مفتوحة فائقة السرعة ومنخفضة التكلفة (Groq `openai/gpt-oss-20b`) للتصنيف؛ ونماذج متقدمة رائدة (Google Vertex AI `gemini-3.8-flash`) لملخصات التصعيد.
- **التنسيق وإدارة الحالة (Orchestration)**: رسم بياني ذو حالة مبني بـ LangGraph مع أداة الفحص `AsyncSqliteSaver` لدعم الإيقاف والاستئناف الآمن عبر العمليات البرمجية.
- **التدقيق والتحليلات (Audit & Analytics)**: سجل تدقيق SQLite للإضافة فقط (Append-only) ولوحة تحكم تشغيلية فورية عبر Streamlit.

![بنية وكيل Arbiter المعمارية](enterprise_ticket_agent_flow.png)

---

## كيف تعمل درجة الثقة (Trust Score)

يرتكز Arbiter على حساب حتمي وحرج للأمان لدرجة الثقة تم تنفيذه عبر دوال نقية (Pure Functions) (راجع [`scoring/trust_scorer.py`](scoring/trust_scorer.py)).

يتم تقييم كل تذكرة واردة عبر ثلاثة أبعاد موزونة:

$$\text{TrustScore} = w_{\text{retrieval}} \cdot S_{\text{retrieval}} + w_{\text{category}} \cdot S_{\text{category}} + w_{\text{llm}} \cdot S_{\text{llm}}$$

| المكون | الوزن الافتراضي | طريقة الحساب ومحددات الأمان |
|---|---|---|
| **مكون الاسترجاع** ($S_{\text{retrieval}}$) | `0.40` | تشابه جيب التمام (Cosine Similarity من $0.0$ إلى $1.0$) لأقرب حالة محلولة مطابقة من ChromaDB. يُرجع `0.0` في حال عدم وجود حالات مشابهة. |
| **مكون نجاح الفئة تاريخياً** ($S_{\text{category}}$) | `0.35` | معدل موافقة العنصر البشري التاريخي (`human_agreed_count / total_handled`). **حماية البدء البارد (Cold-Start Guard)**: إذا كان `total_handled < 20`، يتم افتراض القيمة بدقة عند `0.30` لمنع الحل التلقائي للفئات غير المجربة. |
| **مكون ثقة نموذج اللغة** ($S_{\text{llm}}$) | `0.25` | ثقة النموذج الذاتية المسجلة ($0.0 - 1.0$) من أمر التصنيف (Prompt). |

### حظر وتجاوز المخاطر الحرجة (Safety-Critical Risk Override)

يفرض Arbiter ضمان أمان مطلق: **لا يمكن أبداً حل أي تذكرة تحمل كلمات مفتاحية عالية الخطورة تلقائياً**، بصرف النظر عن درجتها الحسابية للثقة.

إذا اكتشف التصنيف أي مؤشرات خطر (`production` أو `security` أو `billing` أو `data_loss`):
1. يتم تعيين `risk_override` إلى `True`.
2. تقوم دالة القرار (`decide()`) دون قيد أو شرط بتوجيه التذكرة إلى `"escalate"` (تصعيد إلى إنسان).
3. يتم إرسال بطاقة تفاعلية إلى Slack للمراجعة البشرية.
4. يتم الاحتفاظ بالدرجة الحسابية كاملة في قاعدة البيانات وسجل التدقيق لاستخدامها في التحليلات التشغيلية.

---

## البدء السريع والإعداد المحلي

### 1. المتطلبات الأساسية
- Python 3.11 أو 3.12
- Git
- حسابات مجانية في Jira وSlack وGoogle Cloud / Groq (اختياري؛ تعمل الاختبارات محلياً بدون أي بيانات اعتماد خارجية)

### 2. استنساخ المشروع وإعداد البيئة
```bash
git clone https://github.com/4ciki/arbiter-mcp.git
cd arbiter-mcp

# إنشاء وتفعيل البيئة الافتراضية
python -m venv .venv
# على نظام Windows:
.\.venv\Scripts\Activate.ps1
# على أنظمة Linux/macOS:
source .venv/bin/activate

# تثبيت الحزم والمتطلبات
pip install -r requirements.txt
```

### 3. ضبط متغيرات البيئة `.env`
انسخ قالب الإعدادات:
```bash
cp .env.example .env
```
املأ ملف `.env` ببيانات اعتماد واجهات البرمجة الخاصة بك (راجع [.env.example](.env.example) للتعريف الدقيق لكل حقل):
- **Jira Rovo MCP**: `JIRA_SITE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- **Slack**: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- **Vertex AI**: `GOOGLE_APPLICATION_CREDENTIALS`, `GCP_PROJECT_ID`
- **Groq**: `GROQ_API_KEY`

---

## التشغيل باستخدام Docker

<img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" height="20" /> تشغيل النظام بالكامل (خلفية FastAPI + لوحة تحكم Streamlit + التخزين الدائم) بأمر واحد:

```bash
docker-compose up --build
```

الخدمات المتاحة:
- **خلفية FastAPI والـ Webhooks**: [http://localhost:8000](http://localhost:8000)
  - التوثيق التفاعلي للـ API: [http://localhost:8000/docs](http://localhost:8000/docs)
  - فحص صحة النظام: [http://localhost:8000/health](http://localhost:8000/health)
- **لوحة تحكم العمليات في Streamlit**: [http://localhost:8501](http://localhost:8501)

للتشغيل محلياً بدون Docker:
```bash
# نافذة الطرفية 1: تشغيل الـ API
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# نافذة الطرفية 2: تشغيل لوحة التحكم
streamlit run dashboard/app.py --server.port 8501
```

---

## تشغيل حزمة الاختبارات

<img src="https://img.shields.io/badge/pytest-51%20passed-22C55E?logo=pytest&logoColor=white" height="20" /> يحتوي Arbiter على حزمة اختبارات شاملة تغطي الحسابات الرياضية الدقيقة للثقة، واستمرارية ORM، وعزل استرجاع المتجهات، ونقاط فحص حالة LangGraph، وأمان توقيع الـ Webhook:

```bash
python -m pytest tests/ -v
```

تعمل جميع الاختبارات الـ 51 محلياً بالكامل دون الحاجة إلى بيانات اعتماد خارجية أو اتصال بالإنترنت.

---

## الأداء والمقاييس التشغيلية

تم قياس المقاييس التالية تجريبياً باستخدام أداة تقييم الأداء في Arbiter ([`run_benchmark.py`](run_benchmark.py)) على مجموعة بيانات التقييم الثابتة ([`benchmark_ground_truth.csv`](benchmark_ground_truth.csv)، $N = 40$) عبر المسار المباشر الكامل (Groq `openai/gpt-oss-20b` للتصنيف، ChromaDB `all-MiniLM-L6-v2` للاسترجاع الدلالي، حساب الثقة الحتمي، وتخزين SQLite):

| المقياس | القيمة المقاسة ($N = 40$) | السياق التشغيلي والملاحظات |
|---|---|---|
| **دقة التصنيف (Top-1)** | **31 / 40** (77.5%) | الدقة مقابل الحقيقة الأرضية المحددة. 5 حالات من أصل 9 حالات غير متطابقة كانت بسبب نسبة نجاح 0% على تصنيف "other" (من T36 إلى T40)؛ والحالات الأربع المتبقية كانت حالات حدية مزدوجة النطاق. |
| **معدل الحل التلقائي** | **8 / 40** (20.0%) | تم حل 8 تذاكر من أصل 40 تذكرة تلقائياً بموجب الأوامر الحالية، مع معالجة التذكرتين الروتينيتين T03 و T09 بنجاح دون إيقافهما بمؤشرات خطر خاطئة. |
| **معدل التصعيد للمراجعة البشرية** | **32 / 40** (80.0%) | التذاكر عالية الخطورة (8 تذاكر)، أو حالات البدء البارد (<20 عينة)، أو التذاكر ذات التشابه المنخفض، تم توجيهها جميعاً إلى Slack للمراجعة البشرية. |
| **متوسط زمن الفرز (MTTT)** | **1.19 ثانية** (الوسيط: 1.03 ثانية) | زمن الاستجابة الشامل من الاستلام عبر التصنيف واسترجاع المتجهات وحساب الثقة وحتى التوجيه على معالجات Groq LPU. |
| **الحل التلقائي الإيجابي الخاطئ** | **0 / 40** (0.0%) | **الحفاظ الكامل على معيار الأمان المطلق**. لم يتم حل أي تذكرة خطيرة أو غير متحقق منها تلقائياً. |

### معايرة المخاطر والقيود المعروفة
- **قيود معروفة — فئة التجميع العامة (`other`، نسبة نجاح 0/5)**: جميع التذاكر الـ 5 المصممة لفئة `other` (من `T36` إلى `T40`) تم تصنيفها بشكل خاطئ إلى فئات وظيفية أكثر تحديداً (`software` لتطبيقات Outlook/Teams، و `hardware` لحوامل الشاشات، و `access` لسياسة المصادقة الثنائية 2FA). يُظهر النموذج نسبة نجاح 0% على هذه الفئة عندما تتضمن التذكرة أي كلمة مفتاحية محددة. أما الحالات الأربع الأخرى (`T04`، `T05`، `T11`، `T33`) فكانت تقع على حدود مشتركة بين مجالين.
- **تجاوز فخاخ المخاطر بنجاح (6 / 6، 100%)**: نجحت حدود التعليمات الصريحة في `CLASSIFY_PROMPT` في منع التذاكر المفخخة الـ 6 (`T03`، `T09`، `T13`، `T20`، `T25`، `T32`) من إطلاق تجاوزات مخاطر زائفة. وخصوصاً التذكرتان `T03` و `T09` حيث حصلتا على درجات أعلى من 0.75 وتم حلهما بأمان تلقائياً.
- **رصد المخاطر الحقيقية بدقة (8 / 8، 100%)**: جميع التذاكر الـ 8 ذات المخاطر الحقيقية (`T04`، `T08`، `T14`، `T17`، `T21`، `T26`، `T31`، `T35` وتغطي اختراق الحسابات، وفشل خطوط الإنتاج، ومشكلات الفواتير، وخطر انتفاخ البطاريات، وفقدان البيانات) أطلقت بنجاح `risk_override = True` وتم تصعيدها فوراً للبشر.
- **حماية البدء البارد**: الفئات التي تفتقر إلى حجم تاريخي كافٍ (`access`، `network`، `other`) خضعت لعقوبة البدء البارد الإلزامية ($0.30$) لمنع الحل التلقائي المبكر.
- **إمكانية إعادة الإنتاج والتحقق**: شغّل الأمر `python run_benchmark.py` لإعادة تنفيذ تقييم الـ 40 تذكرة محلياً. يتم حفظ سجلات التذاكر والقياسات الكاملة في `benchmark_results.json`.

---

## الترخيص

مرخص تحت رخصة [Apache License 2.0](LICENSE). جميع الحقوق محفوظة © 2026 4ciki.

</div>
