import google.generativeai as genai
import os
import re
import json
import random
from typing import Optional, Dict, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.safety_prompts = ["kill", "bomb", "hate", "illegal", "hack", "drug"]
        self.datasets = self.load_datasets()

    def load_datasets(self) -> Dict[str, List[Dict]]:
        """Load educational datasets for context."""
        datasets = {}
        base_path = "datasets/"
        
        for subject in ["coding", "math", "ielts", "physics"]:
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
                            prompt = rec.get('prompt') or rec.get('question') or rec.get('instruction') or ""
                            answer = rec.get('answer') or rec.get('output') or rec.get('response') or ""
                            if prompt and answer:
                                loaded.append({"prompt": prompt, "answer": answer})
                        except Exception:
                            continue
            
            if loaded:
                datasets[subject] = loaded[:100]  # Limit to 100 examples for faster processing
        
        return datasets

    def retrieve_context(self, subject: str, prompt: str, max_chars: int = 800) -> str:
        """Retrieve relevant context from datasets."""
        try:
            data = self.datasets.get(subject.lower()) or []
            if not data:
                return ""
            
            query_tokens = set(re.findall(r"[a-zA-Z0-9_]+", prompt.lower()))
            scored = []
            
            for ex in data[:50]:  # Limit for faster processing
                text = f"{ex.get('prompt','')}\n{ex.get('answer','')}".lower()
                tokens = set(re.findall(r"[a-zA-Z0-9_]+", text))
                score = len(query_tokens & tokens)
                if score:
                    scored.append((score, ex))
            
            scored.sort(key=lambda x: x[0], reverse=True)
            selected = []
            total = 0
            
            for _, ex in scored[:2]:  # Limit to 2 examples
                chunk = f"Q: {ex.get('prompt','').strip()}\nA: {ex.get('answer','').strip()}"
                if total + len(chunk) > max_chars:
                    break
                selected.append(chunk)
                total += len(chunk)
            
            return "\n\n".join(selected)
        except Exception:
            return ""

    def is_safe(self, prompt: str) -> bool:
        """Check if prompt is safe for educational use."""
        return not any(word in prompt.lower() for word in self.safety_prompts)

    def detect_language(self, prompt: str) -> str:
        """Detect if user is using Roman Urdu or English."""
        lowered = prompt.lower()
        
        roman_urdu_markers = [
            "kya", "kyun", "kais", "kaise", "krdo", "kerdo", "mujhe", "ap", "aap",
            "tum", "hain", "hun", "hy", "ha", "kia", "kerna", "krna", "sahi",
            "galat", "masla", "problem", "samjha", "btao", "batao", "seekho", "seekhna",
            "detail", "tafsil", "kaise seekho", "kesi seekho", "batao", "btao"
        ]
        
        return "Roman Urdu" if any(w in lowered for w in roman_urdu_markers) else "English"

    def generate_response(self, prompt: str, subject: str = "general", language: str = "auto") -> str:
        """Generate educational response using Gemini."""
        if not self.is_safe(prompt):
            return "Sorry, I can only help with educational questions."

        # Handle greetings quickly
        lowered = prompt.lower().strip()
        greeting_markers = ["hi", "hey", "hello", "salam", "salaam", "asl", "assalam", "asalam", "yo"]
        
        if len(lowered.split()) <= 2 and any(lowered.strip("!., ") == g for g in greeting_markers):
            roman_markers = ["salam", "salaam", "asl", "assalam", "asalam"]
            is_roman_urdu_greet = any(m in lowered for m in roman_markers)
            return (
                "Salam! Main madad ke liye yahan hoon. Aap ko kis topic par guidance chahiye?"
                if is_roman_urdu_greet else
                "Hi! How can I help you today? Which topic do you want to learn?"
            )

        # Detect language
        detected_lang = self.detect_language(prompt)
        reply_language = detected_lang if language == "auto" else language

        # Get context
        context = self.retrieve_context(subject, prompt)

        # Determine response style
        short_markers = ["short", "brief", "one line", "one-line", "tl;dr", "define", "definition", "what is", "who is"]
        detailed_markers = ["detail", "detailed", "steps", "step by step", "kaise", "kesi", "explain", "roadmap", "plan"]
        
        is_short = any(m in lowered for m in short_markers) or ("?" in prompt and len(prompt.split()) <= 15)
        is_detailed = any(m in lowered for m in detailed_markers) or (not is_short and len(prompt.split()) > 12)

        # Build system prompt
        system_prompt = f"""You are an expert {subject} tutor. Your role is to provide clear, educational responses.

IMPORTANT INSTRUCTIONS:
1. Reply ONLY in {reply_language} - use Latin script for Roman Urdu, NO Arabic/Urdu script
2. Be educational and helpful
3. Provide step-by-step explanations when detailed answers are requested
4. Keep responses concise for simple questions
5. Do NOT repeat instructions or add meta-commentary
6. Focus on the student's learning needs

{"Context (if relevant):" if context else ""}
{context if context else ""}

{"Keep response brief (1-2 sentences)" if is_short else "Provide detailed step-by-step explanation with examples" if is_detailed else "Provide clear, helpful explanation"}

Student Question: {prompt}"""

        try:
            # Generate response with Gemini
            response = self.model.generate_content(
                system_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=300 if is_short else (500 if is_detailed else 400),
                    temperature=0.7,
                    top_p=0.8,
                    top_k=40,
                )
            )
            
            result = response.text.strip()
            
            # Clean up response
            lines = [l for l in result.splitlines() if l.strip() != ""]
            while lines and any(lines[0].lower().startswith(p) for p in [
                "you are", "instructions:", "context:", "student question:", "reply only"
            ]):
                lines.pop(0)
            
            cleaned = "\n".join(lines).strip()
            
            # If detailed was requested but answer is too short, enhance it
            if is_detailed and len(cleaned.split()) < 50:
                try:
                    enhance_prompt = f"""Enhance this answer to be more detailed and educational. 
                    Provide 5-8 numbered steps with concrete actions. 
                    Keep the same language ({reply_language}).
                    
                    Original answer: {cleaned}
                    
                    Enhanced detailed answer:"""
                    
                    enhanced = self.model.generate_content(
                        enhance_prompt,
                        generation_config=genai.types.GenerationConfig(
                            max_output_tokens=400,
                            temperature=0.6,
                        )
                    )
                    
                    enhanced_text = enhanced.text.strip()
                    if len(enhanced_text.split()) > len(cleaned.split()) * 0.8:
                        cleaned = enhanced_text
                except Exception:
                    pass
            
            return cleaned if cleaned else "I apologize, but I couldn't generate a proper response. Please try rephrasing your question."
            
        except Exception as e:
            return f"I apologize, but I encountered an error: {str(e)}. Please try again."

    def analyze_code(self, code: str, language: str = "python") -> Dict[str, str]:
        """Analyze code for errors and provide suggestions."""
        try:
            prompt = f"""Analyze this {language} code and provide:
1. Any syntax or logical errors
2. Suggestions for improvement
3. Best practices recommendations
4. A corrected version if there are errors

Code to analyze:
```{language}
{code}
```

Provide your analysis in a clear, educational format."""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=600,
                    temperature=0.3,
                )
            )
            
            analysis = response.text.strip()
            
            # Generate Roman Urdu version
            roman_prompt = f"""Translate this code analysis to Roman Urdu (Latin script only, no Arabic script):

{analysis}

Provide the same detailed analysis in Roman Urdu:"""

            try:
                roman_response = self.model.generate_content(
                    roman_prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=600,
                        temperature=0.4,
                    )
                )
                roman_analysis = roman_response.text.strip()
            except Exception:
                roman_analysis = "Roman Urdu translation unavailable."
            
            return {
                "analysis": analysis,
                "roman_analysis": roman_analysis,
                "has_error": "error" in analysis.lower() or "incorrect" in analysis.lower(),
                "language": language
            }
            
        except Exception as e:
            return {
                "analysis": f"Error analyzing code: {str(e)}",
                "roman_analysis": f"Code analysis mein error: {str(e)}",
                "has_error": True,
                "language": language
            }
