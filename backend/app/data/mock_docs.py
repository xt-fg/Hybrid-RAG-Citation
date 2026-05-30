"""Mock document chunks simulating MinerU parsed output"""
from app.models.schemas import DocumentChunk


def get_mock_documents() -> list[DocumentChunk]:
    """Return mock document chunks with metadata"""
    return [
        # 技术文档 - 跨页表格示例
        DocumentChunk(
            id="Doc_1",
            content="""Transformer架构核心参数对比表（续上页）：
| 参数 | BERT-base | GPT-3 | LLaMA-7B |
|------|-----------|-------|----------|
| 层数 | 12 | 96 | 32 |
| 隐藏维度 | 768 | 12288 | 4096 |
| 注意力头数 | 12 | 96 | 32 |
| 参数量 | 110M | 175B | 7B |

该表格展示了不同预训练模型的核心架构参数。BERT采用编码器架构，GPT采用解码器架构，而LLaMA采用了更高效的RMSNorm和SwiGLU激活函数。""",
            source="深度学习架构设计指南.pdf",
            page=42,
            chunk_type="table",
            metadata={"table_id": "table_3.2", "continued_from_page": 41}
        ),
        
        # 专业术语密集段落
        DocumentChunk(
            id="Doc_2",
            content="""3.2 混合检索中的稀疏检索模块

稀疏检索(Sparse Retrieval)基于词袋模型(Bag-of-Words)构建倒排索引(Inverted Index)。在中文场景下，需要先进行分词(Tokenization)处理。本系统采用jieba分词器，支持精确模式、全模式和搜索引擎模式三种切分策略。

BM25算法是稀疏检索的核心排序函数，其评分公式为：
score(D,Q) = Σ IDF(qi) · [f(qi,D) · (k1+1)] / [f(qi,D) + k1 · (1-b+b·|D|/avgdl)]

其中IDF为逆文档频率，f为词频，k1和b为调节参数。该算法对TF-IDF进行了改进，引入了文档长度归一化和词频饱和机制。""",
            source="信息检索系统原理与实现.pdf",
            page=87,
            chunk_type="text",
            metadata={"section": "3.2", "keywords": ["BM25", "稀疏检索", "倒排索引"]}
        ),
        
        # 向量检索技术文档
        DocumentChunk(
            id="Doc_3",
            content="""稠密检索(Dense Retrieval)使用预训练语言模型将文本编码为稠密向量表示。与稀疏检索不同，稠密检索能够捕捉语义相似性，解决词汇不匹配(Vocabulary Mismatch)问题。

Embedding模型选型对比：
- text-embedding-3-small: 维度1536，性能均衡，适合大多数场景
- text-embedding-3-large: 维度3072，精度更高，成本较高
- BGE-large-zh: 维度1024，中文优化，开源免费

余弦相似度计算公式：cosine_sim(A,B) = (A·B)/(||A||·||B||)
该度量对向量长度不敏感，适合比较不同长度文本的语义相似度。""",
            source="向量检索技术白皮书.pdf",
            page=15,
            chunk_type="text",
            metadata={"section": "2.1", "keywords": ["稠密检索", "Embedding", "余弦相似度"]}
        ),
        
        # RRF算法详解
        DocumentChunk(
            id="Doc_4",
            content="""Reciprocal Rank Fusion (RRF) 算法详解

RRF是一种高效的多路召回结果融合算法，由Cormack等学者在2009年提出。其核心思想是将不同检索器的排名列表(Rank List)进行加权融合。

算法公式：RRF_score(d) = Σ 1/(k + r(d,i))

其中：
- k: 平滑常数，默认取60，防止排名靠前的文档得分过高
- r(d,i): 文档d在第i个检索器中的排名
- 求和范围: 所有检索器

RRF的优势：
1. 无需训练，即插即用
2. 对不同检索器的得分尺度不敏感
3. 天然支持多路融合
4. 实现简单，计算开销小

实验表明，RRF在MS MARCO等基准数据集上相比单一检索器可提升5-15%的MRR指标。""",
            source="多路检索融合技术综述.pdf",
            page=23,
            chunk_type="text",
            metadata={"section": "4.1", "keywords": ["RRF", "排名融合", "多路检索"]}
        ),
        
        # 引用生成技术
        DocumentChunk(
            id="Doc_5",
            content="""RAG系统中的引用生成机制

引用(Citation)是增强RAG系统可信度的关键技术。通过要求LLM在生成回答时附带引用标识，用户可以追溯每个陈述的信息来源。

引用生成的Prompt设计要点：
1. 明确要求：在系统提示中明确要求"每个陈述句后必须附带[Doc_X]形式的引用"
2. 提供上下文：将检索到的文档片段以编号形式提供给LLM
3. 限制范围：要求LLM仅基于提供的文档生成回答，避免幻觉(Hallucination)
4. 格式规范：统一引用格式，便于前端解析和展示

引用质量评估指标：
- 引用覆盖率(Citation Coverage): 被引用句子占总句子数的比例
- 引用准确率(Citation Accuracy): 引用指向正确文档的比例
- 引用召回率(Citation Recall): 应被引用的句子中实际被引用的比例""",
            source="可信AI系统设计实践.pdf",
            page=156,
            chunk_type="text",
            metadata={"section": "7.3", "keywords": ["引用生成", "可信AI", "Prompt设计"]}
        ),
        
        # 行业应用案例
        DocumentChunk(
            id="Doc_6",
            content="""金融领域RAG应用案例：智能研报问答系统

项目背景：某券商研究所需要构建智能研报分析系统，支持对海量研报进行自然语言问答。

技术方案：
- 文档处理：使用MinerU解析PDF研报，提取表格、图表和正文
- 检索策略：混合检索(BM25+向量检索) + RRF融合
- 引用溯源：每个回答附带原文引用，支持一键跳转

核心挑战与解决方案：
1. 跨页表格：通过表格检测和跨页合并算法解决
2. 专业术语：构建金融领域词典，优化jieba分词
3. 数据时效性：引入时间衰减因子，优先返回最新研报

系统效果：
- 问答准确率：92.3%（人工评估）
- 平均响应时间：1.2秒
- 用户满意度：4.6/5.0""",
            source="AI落地案例集2024.pdf",
            page=78,
            chunk_type="text",
            metadata={"section": "5.2", "domain": "金融", "keywords": ["研报分析", "行业应用"]}
        ),
        
        # 系统架构文档
        DocumentChunk(
            id="Doc_7",
            content="""混合检索系统架构设计

本系统采用分层架构设计，各模块职责清晰：

┌─────────────────────────────────────────┐
│           API Layer (FastAPI)            │
├─────────────────────────────────────────┤
│         Service Layer (RAG Pipeline)     │
├──────────┬──────────┬───────────────────┤
│ Sparse   │  Dense   │   RRF Fusion      │
│ (BM25)   │(Embedding)│   Algorithm       │
├──────────┴──────────┴───────────────────┤
│         Data Layer (Document Store)      │
└─────────────────────────────────────────┘

关键设计决策：
1. 向量计算使用numpy而非FAISS，降低依赖复杂度
2. 分词使用jieba，支持自定义词典扩展
3. Embedding通过langchain-openai调用，支持多provider切换
4. RRF融合权重可配置，支持A/B测试""",
            source="系统架构设计文档.pdf",
            page=8,
            chunk_type="text",
            metadata={"section": "2.1", "keywords": ["系统架构", "分层设计", "模块化"]}
        ),
        
        # 性能优化文档
        DocumentChunk(
            id="Doc_8",
            content="""检索性能优化策略

1. 预计算优化：
   - 文档Embedding离线计算并缓存
   - BM25索引预先构建
   - 使用numpy向量化运算替代循环

2. 查询优化：
   - 查询预处理：去停用词、纠错
   - 缓存热门查询结果
   - 异步并行执行稀疏和稠密检索

3. 资源优化：
   - Embedding批处理：batch_size=32
   - 连接池复用API调用
   - 结果懒加载：仅返回top_k结果

性能基准测试结果（10万文档规模）：
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| P50延迟 | 850ms | 120ms | 85.9% |
| P99延迟 | 2.1s | 380ms | 81.9% |
| QPS | 15 | 120 | 8x |""",
            source="性能优化实战手册.pdf",
            page=234,
            chunk_type="table",
            metadata={"section": "8.5", "keywords": ["性能优化", "缓存", "批处理"]}
        ),
    ]
