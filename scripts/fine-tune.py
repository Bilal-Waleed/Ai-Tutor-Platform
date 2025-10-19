from services.llm_service import LLMSService
llm = LLMSService()
llm.fine_tune("datasets/coding/clean.jsonl") 