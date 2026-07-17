# 知源后端

FastAPI 文档知识服务，负责文件解析与持久化、BM25/Embedding 混合检索、RRF 融合、回答生成和引用校验。

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8002
uv run pytest -q
```

完整配置和 API 说明见仓库根目录的 `README.md`。
