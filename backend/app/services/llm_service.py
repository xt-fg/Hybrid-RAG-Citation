"""LLM service for generating answers with citations"""
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.models.schemas import SearchResult, Citation
from app.core.config import get_settings


class LLMService:
    """Service for generating RAG answers with citations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.llm = ChatOpenAI(
            model=self.settings.LLM_MODEL,
            openai_api_key=self.settings.OPENAI_API_KEY,
            openai_api_base=self.settings.OPENAI_BASE_URL,
            temperature=0.3,
        )
        
    def _build_system_prompt(self) -> str:
        """Build system prompt for RAG with citations"""
        return """你是一个专业的文档问答助手。请根据提供的参考文档回答用户的问题。

## 回答规则：
1. 只基于提供的参考文档回答问题，不要编造信息
2. 在每个陈述句后必须附带引用标识，格式为 [Doc_X]
3. 如果文档中没有相关信息，请如实说明
4. 回答要准确、简洁、专业
5. 可以引用多个文档来支持一个观点

## 引用格式示例：
根据文档，Transformer架构采用了自注意力机制 [Doc_1]。BERT模型包含12层编码器 [Doc_1]，而GPT-3则有96层 [Doc_1]。

请严格按照以上规则生成回答。"""
        
    def _build_context(self, search_results: List[SearchResult]) -> str:
        """Build context from search results"""
        context_parts = ["## 参考文档：\n"]
        
        for result in search_results:
            doc = result.doc
            context_parts.append(
                f"### [{doc.id}] (来源: {doc.source})\n"
                f"{doc.content}\n"
            )
            
        return "\n".join(context_parts)
        
    def generate_answer(
        self,
        query: str,
        search_results: List[SearchResult]
    ) -> tuple[str, List[Citation]]:
        """Generate answer with citations
        
        Args:
            query: User query
            search_results: Retrieved documents
            
        Returns:
            Tuple of (answer, citations)
        """
        # Build messages
        system_prompt = self._build_system_prompt()
        context = self._build_context(search_results)
        
        user_message = f"""{context}

## 用户问题：
{query}

请根据以上参考文档回答问题，并在每个陈述句后附带 [Doc_X] 形式的引用。"""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        
        # Generate response
        response = self.llm.invoke(messages)
        answer = response.content
        
        # Extract citations from search results
        citations = []
        for result in search_results:
            doc = result.doc
            # Get first 200 chars as snippet
            snippet = doc.content[:200] + "..." if len(doc.content) > 200 else doc.content
            citations.append(Citation(
                doc_id=doc.id,
                doc_source=doc.source,
                snippet=snippet,
                relevance_score=result.score
            ))
            
        return answer, citations
