from app.models.schemas import ProviderConfig
from app.services import dense_retriever, llm_service
from app.services.dense_retriever import DenseRetriever
from app.services.llm_service import LLMService


def test_frontend_llm_config_has_priority(monkeypatch):
    captured = {}

    class FakeChatOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(llm_service, "ChatOpenAI", FakeChatOpenAI)
    service = LLMService()
    config = ProviderConfig(
        llm_api_key="frontend-secret",
        llm_base_url="https://frontend.example/v1",
        llm_model="frontend-model",
    )

    instance = service._get_llm(config)

    assert isinstance(instance, FakeChatOpenAI)
    assert captured["openai_api_key"] == "frontend-secret"
    assert captured["openai_api_base"] == "https://frontend.example/v1"
    assert captured["model"] == "frontend-model"
    assert "frontend-secret" not in str(config)


def test_frontend_embedding_config_has_priority(monkeypatch):
    captured = {}

    class FakeEmbeddings:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(dense_retriever, "OpenAIEmbeddings", FakeEmbeddings)
    retriever = DenseRetriever()
    config = ProviderConfig(
        embedding_api_key="embedding-secret",
        embedding_base_url="https://embedding.example/v1",
        embedding_model="embedding-model",
    )

    instance = retriever._get_embeddings(config)

    assert isinstance(instance, FakeEmbeddings)
    assert captured["openai_api_key"] == "embedding-secret"
    assert captured["openai_api_base"] == "https://embedding.example/v1"
    assert captured["model"] == "embedding-model"
