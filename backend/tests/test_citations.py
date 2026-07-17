from langchain_core.messages import AIMessage, HumanMessage

from app.models.schemas import ConversationTurn, DocumentChunk, SearchResult
from app.services.llm_service import LLMService


def result(doc_id: str, source: str, page: int) -> SearchResult:
    return SearchResult(
        doc=DocumentChunk(
            id=doc_id,
            content=f"{source}中的原文内容",
            source=source,
            page=page,
        ),
        score=0.02,
        rank=1,
        source_type="rrf",
    )


def test_citations_only_include_valid_ids_in_answer_order():
    search_results = [
        result("K_alpha_1", "alpha.pdf", 2),
        result("K_beta_3", "beta.pdf", 8),
    ]

    citations = LLMService._build_citations(
        "结论来自第二份资料 [K_beta_3]，也可由第一份支持 [K_alpha_1]。"
        "重复引用 [K_beta_3]，无效引用 [K_unknown_9]。",
        search_results,
    )

    assert [citation.doc_id for citation in citations] == ["K_beta_3", "K_alpha_1"]
    assert citations[0].page == 8
    assert citations[0].doc_source == "beta.pdf"


def test_answer_without_valid_source_has_no_citations():
    citations = LLMService._build_citations(
        "没有引用，或者引用不存在 [K_missing_1]。",
        [result("K_alpha_1", "alpha.pdf", 2)],
    )

    assert citations == []


def test_prompt_aliases_are_resolved_to_real_chunk_ids():
    search_results = [
        result("K_alpha_1", "alpha.pdf", 2),
        result("K_beta_3", "beta.pdf", 8),
    ]

    answer = LLMService._resolve_citation_aliases(
        "第一条结论 [Doc_2]，第二条结论 [Doc_1]，越界引用 [Doc_9]。",
        search_results,
    )

    assert answer == "第一条结论 [K_beta_3]，第二条结论 [K_alpha_1]，越界引用。"


def test_prompt_explicitly_limits_available_citation_aliases():
    prompt = LLMService.__new__(LLMService)._build_system_prompt(3)

    assert "[Doc_1]、[Doc_2]、[Doc_3]" in prompt
    assert "严禁输出不存在或超出上述范围" in prompt


def test_conversation_history_is_forwarded_without_stale_citation_ids():
    messages = LLMService._build_history_messages([
        ConversationTurn(role="user", content="上一轮问题是什么？"),
        ConversationTurn(role="assistant", content="上一轮结论 [K_alpha_1]。"),
    ])

    assert isinstance(messages[0], HumanMessage)
    assert isinstance(messages[1], AIMessage)
    assert messages[0].content == "上一轮问题是什么？"
    assert messages[1].content == "上一轮结论。"
