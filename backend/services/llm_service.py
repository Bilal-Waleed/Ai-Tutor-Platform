from llama_cpp import Llama
import os
import multiprocessing
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
        # Use available CPU cores for lower latency; keep a core free if many cores exist
        cpu_cores = max(2, (multiprocessing.cpu_count() or 2) - 1)
        _llm_instance = Llama(
            model_path,
            n_ctx=1024,
            n_batch=512,
            n_threads=cpu_cores,
            verbose=False
        )
    return _llm_instance

class LLMSService:
    def __init__(self):
        self.model = get_llm()
        self.safety_prompts = ["kill", "bomb", "hate", "illegal", "hack", "drug"]  # Enhanced
        self.datasets = self.load_datasets()

    def retrieve_context(self, subject: str, prompt: str, max_chars: int = 1200) -> str:
        """Lightweight RAG: select 1-3 dataset Q/A pairs most similar to the prompt.
        Uses simple token overlap to avoid heavy RAM/CPU.
        """
        try:
            data = self.datasets.get(subject.lower()) or []
            if not data:
                return ""
            query_tokens = set(re.findall(r"[a-zA-Z0-9_]+", prompt.lower()))
            scored = []
            for ex in data[:2000]:  # cap to avoid high CPU
                text = f"{ex.get('prompt','')}\n{ex.get('answer','')}".lower()
                tokens = set(re.findall(r"[a-zA-Z0-9_]+", text))
                score = len(query_tokens & tokens)
                if score:
                    scored.append((score, ex))
            scored.sort(key=lambda x: x[0], reverse=True)
            selected = []
            total = 0
            for _, ex in scored[:3]:
                chunk = f"Q: {ex.get('prompt','').strip()}\nA: {ex.get('answer','').strip()}"
                if total + len(chunk) > max_chars:
                    break
                selected.append(chunk)
                total += len(chunk)
            return "\n\n".join(selected)
        except Exception:
            return ""

    def load_datasets(self):
        datasets = {}
        base_path = "datasets/"
        for subject in ["coding", "math", "ielts", "physics"]:
            # Prefer JSONL if JSON not present
            json_path = os.path.join(base_path, subject, "train_clean.json")
            jsonl_path = os.path.join(base_path, subject, "train_clean.jsonl")
            loaded = []
            if os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    loaded = json.load(f)
            elif os.path.exists(jsonl_path):
                with open(jsonl_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        try:
                            rec = json.loads(line)
                            # Normalize keys
                            prompt = rec.get('prompt') or rec.get('question') or rec.get('instruction') or ""
                            answer = rec.get('answer') or rec.get('output') or rec.get('response') or ""
                            if prompt and answer:
                                loaded.append({"prompt": prompt, "answer": answer})
                        except Exception:
                            continue
            if loaded:
                datasets[subject] = loaded
        return datasets

    def is_safe(self, prompt):
        return not any(word in prompt.lower() for word in self.safety_prompts)

    def generate_response(self, prompt, subject="general", language="auto"):
        if not self.is_safe(prompt):
            return "Sorry, educational questions only."

        # Simple heuristic to detect Roman Urdu vs English
        lowered = prompt.lower()
        # Handle very short casual greetings without invoking the model (fast + concise)
        greeting_markers = ["hi", "hey", "hello", "salam", "salaam", "asl", "assalam", "asalam", "yo", "hi!", "hey!", "hello!", "salaam!", "ok", "okay", "thanks", "thx"]
        if len(lowered.split()) <= 2 and any(lowered.strip("!., ") == g for g in greeting_markers):
            # Detect Roman Urdu tone
            roman_markers = ["salam", "salaam", "asl", "assalam", "asalam"]
            is_roman_urdu_greet = any(m in lowered for m in roman_markers)
            return (
                "Salam! Main madad ke liye yahan hoon. Aap ko kis topic par guidance chahiye?"
                if is_roman_urdu_greet else
                "Hi! How can I help you today? Which topic do you want to learn?"
            )

        roman_urdu_markers = [
            "kya", "kyun", "kais", "kaise", "krdo", "kerdo", "mujhe", "ap", "aap",
            "tum", "hain", "hun", "hy", "ha", "kia", "kerna", "krna", "sahi",
            "galat", "masla", "problem", "samjha", "btao", "batao", "seekho", "seekhna",
            "detail", "tafsil", "kaise seekho", "kesi seekho"
        ]
        is_roman_urdu = any(w in lowered for w in roman_urdu_markers)

        # Choose reply language
        reply_language = "Roman Urdu (Latin script)" if (language == "auto" and is_roman_urdu) else (language if language != "auto" else "English")

        # Inject dataset examples for better accuracy (few-shot)
        # Lightweight retrieval context (instead of few-shot examples)
        context = self.retrieve_context(subject, prompt)

        short_markers = [
            "short", "brief", "one line", "one-line", "tl;dr", "define", "definition",
            "what is", "who is", "synonym", "antonym"
        ]
        detailed_markers = ["detail", "detailed", "steps", "step by step", "kaise", "kesi", "explain", "roadmap", "plan"]
        is_short = any(m in lowered for m in short_markers) or ("?" in prompt and len(prompt.split()) <= 15)
        is_detailed = any(m in lowered for m in detailed_markers) or (not is_short and len(prompt.split()) > 12)
        style = "concise (1-2 sentences)" if is_short else "step-by-step explanation with examples when helpful"

        full_prompt = (
            f"[INST] You are a helpful {subject} tutor." +
            (f" Use this context (if relevant):\n{context}\n\n" if context else "\n\n") +
            "Instructions:\n"
            "- Reply strictly and entirely in the user's language. If the user is using Roman Urdu, reply in Roman Urdu using Latin letters ONLY.\n"
            "- Do NOT use Urdu (Arabic) or Hindi (Devanagari) scripts; use ASCII/Latin transliteration only.\n"
            f"- Keep the response {style}. Provide clear, actionable steps when the user asks for details.\n"
            "- Do not repeat system or instruction text. Do not echo the prompt.\n"
            "- Do not include meta text like 'You are a tutor' in the answer.\n\n"
            f"User (in {reply_language}): {prompt} [/INST]"
        )

        output = self.model(
            full_prompt,
            max_tokens=96 if is_short else (220 if is_detailed else 180),
            temperature=0.5,
            top_p=0.9,
            top_k=40,
            repeat_penalty=1.1,
            # Avoid stopping on generic newlines which can truncate answers prematurely
            stop=["[/INST]", "User:"],
            echo=False
        )

        response = output['choices'][0]['text'].strip()

        # Sanitize: remove any leaked instruction/prompt lines at the start
        leakage_prefixes = [
            "you are a helpful", "instructions:", "use these few-shot", "user (in", "assistant:", "system:", "[inst]", "[/inst]"
        ]
        lines = [l for l in response.splitlines() if l.strip() != ""]
        # Drop leading lines that look like instruction leakage
        while lines and any(lines[0].lower().startswith(p) for p in leakage_prefixes):
            lines.pop(0)
        response = "\n".join(lines).strip()

        # Deduplicate sentences conservatively
        sentences = re.split(r'(?<=[.!?])\s+', response)
        seen = set()
        unique_sentences = [s for s in sentences if s not in seen and not seen.add(s)]
        cleaned = ' '.join(unique_sentences).strip()

        final = cleaned if cleaned else response

        # If detailed was requested but answer looks too short, do a refinement pass
        if is_detailed and len(final.split()) < 60:
            try:
                refine_prompt = (
                    "[INST] Rewrite the following answer to be clearer for a student. "
                    "Keep the same language as the user (Roman Urdu if detected). "
                    "Provide a numbered, step-by-step plan with 5-8 steps, each with 1-2 concrete actions. "
                    "Keep it under 250 words. Do not add meta text.\n\n"
                    f"Answer:\n{final} [/INST]"
                )
                refine_out = self.model(
                    refine_prompt,
                    max_tokens=240,
                    temperature=0.45,
                    top_p=0.9,
                    top_k=40,
                    repeat_penalty=1.1,
                    stop=["[/INST]", "User:"],
                    echo=False
                )
                refined = refine_out['choices'][0]['text'].strip()
                if len(refined.split()) > len(final.split()) * 0.8:
                    final = refined
            except Exception:
                pass

        return final