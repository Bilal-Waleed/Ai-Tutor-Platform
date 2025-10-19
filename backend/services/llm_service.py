from llama_cpp import Llama
import os
import re
import json
import random

_llm_instance = None

def get_llm():
    global _llm_instance
    if _llm_instance is None:
        model_path = r"C:\Users\ESHOP\Desktop\revotic ai\Task 2\ai-tutor-platform\backend\data\llama\Meta-Llama-3.1-8B-Instruct-Q2_K.gguf"
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")
        _llm_instance = Llama(model_path, n_ctx=2048, n_batch=256, n_threads=2, verbose=False)
    return _llm_instance

class LLMSService:
    def __init__(self):
        self.model = get_llm()
        self.safety_prompts = ["kill", "bomb", "hate", "illegal", "hack", "drug"]  # Enhanced
        self.datasets = self.load_datasets()

    def load_datasets(self):
        datasets = {}
        base_path = "datasets/"
        for subject in ["coding", "math", "ielts", "physics"]:
            path = os.path.join(base_path, subject, "train_clean.json")
            if os.path.exists(path):
                with open(path, 'r') as f:
                    datasets[subject] = json.load(f)  # Assume list of {"prompt": "", "answer": ""}
        return datasets

    def is_safe(self, prompt):
        return not any(word in prompt.lower() for word in self.safety_prompts)

    def generate_response(self, prompt, subject="general", language="en"):
        if not self.is_safe(prompt):
            return "Sorry, educational questions only."
        
        # Inject dataset examples for better accuracy (few-shot)
        examples = ""
        if subject in self.datasets:
            sample = random.sample(self.datasets[subject], min(3, len(self.datasets[subject])))  # 3 examples
            examples = "\n".join([f"Example: Q: {ex['prompt']} A: {ex['answer']}" for ex in sample])
        
        style = "concise (1-2 sentences)" if "short answer" in prompt.lower() else "step-by-step explanation"
        full_prompt = f"[INST] You are a {subject} tutor. Use examples: {examples}. Answer in {language}, {style}, educational. User: {prompt} [/INST]"
        
        output = self.model(
            full_prompt,
            max_tokens=100 if "short answer" in prompt.lower() else 250,
            temperature=0.7,
            stop=["[/INST]", "User:", "\n\n"],
            echo=False
        )
        
        response = output['choices'][0]['text'].strip()
        # Deduplicate
        sentences = re.split(r'(?<=[.!?])\s+', response)
        seen = set()
        unique_sentences = [s for s in sentences if s not in seen and not seen.add(s)]
        return ' '.join(unique_sentences)