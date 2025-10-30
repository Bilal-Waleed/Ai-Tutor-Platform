import google.generativeai as genai
import os
import re
import json
import random
import time
from typing import Optional, Dict, List, Tuple
from dotenv import load_dotenv

# Optional RAG optimization (graceful fallback if not available)
try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import pickle
    SKLEARN_AVAILABLE = True
    print("✅ Optimized RAG enabled (TF-IDF semantic search)")
except ImportError as e:
    SKLEARN_AVAILABLE = False
    print(f"⚠️  Optimized RAG disabled (using basic search): {e}")
    print("   Install scikit-learn for better performance: pip install scikit-learn")

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

class GeminiService:
    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.safety_prompts = ["kill", "bomb", "hate", "illegal", "hack", "drug"]
        self.datasets = self.load_datasets()
        self.fallback_responses = self.load_fallback_responses()
        
        # Initialize optimized RAG components (if available)
        self.vectorizers = {}
        self.tfidf_matrices = {}
        if SKLEARN_AVAILABLE:
            try:
                self.initialize_rag()
            except Exception as e:
                print(f"⚠️  RAG initialization failed, using basic search: {e}")
                self.vectorizers = {}
                self.tfidf_matrices = {}

    def load_datasets(self) -> Dict[str, List[Dict]]:
        """Load ALL educational datasets for optimized RAG."""
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
                # Load ALL examples for better RAG (not just 100!)
                datasets[subject] = loaded  # Use all data!
                print(f"Loaded {len(loaded)} examples for {subject}")
        
        return datasets
    
    def initialize_rag(self):
        """Initialize TF-IDF based RAG for fast semantic search."""
        if not SKLEARN_AVAILABLE:
            print("⚠️  Scikit-learn not available, skipping RAG optimization")
            return
        
        for subject, data in self.datasets.items():
            if not data:
                continue
            
            cache_file = f"datasets/{subject}/rag_cache.pkl"
            
            try:
                # Try to load from cache
                if os.path.exists(cache_file):
                    with open(cache_file, 'rb') as f:
                        cache = pickle.load(f)
                        self.vectorizers[subject] = cache['vectorizer']
                        self.tfidf_matrices[subject] = cache['matrix']
                    print(f"✅ Loaded RAG cache for {subject}")
                else:
                    # Create TF-IDF vectors
                    texts = [f"{ex['prompt']} {ex['answer']}" for ex in data]
                    vectorizer = TfidfVectorizer(
                        max_features=1000,
                        stop_words='english',
                        ngram_range=(1, 2),  # Include bigrams for better matching
                        min_df=2,
                        max_df=0.8
                    )
                    tfidf_matrix = vectorizer.fit_transform(texts)
                    
                    self.vectorizers[subject] = vectorizer
                    self.tfidf_matrices[subject] = tfidf_matrix
                    
                    # Cache for next startup (faster!)
                    with open(cache_file, 'wb') as f:
                        pickle.dump({
                            'vectorizer': vectorizer,
                            'matrix': tfidf_matrix
                        }, f)
                    print(f"✅ Created and cached RAG for {subject} ({len(data)} examples)")
            except Exception as e:
                print(f"⚠️  RAG initialization failed for {subject}: {e}")
                # Fallback to basic method
                self.vectorizers[subject] = None
                self.tfidf_matrices[subject] = None

    def load_fallback_responses(self) -> Dict[str, List[str]]:
        """Load fallback responses for when API quota is exceeded."""
        return {
            "coding": [
                "Coding is the process of writing instructions for computers using programming languages like Python, JavaScript, or Java. It involves problem-solving, logic, and creativity to build software applications.",
                "Programming languages are tools that help us communicate with computers. Popular languages include Python (great for beginners), JavaScript (for web development), and Java (for enterprise applications).",
                "To start coding, choose a language like Python, practice basic concepts like variables and functions, and work on small projects. Online platforms like Codecademy or freeCodeCamp are excellent resources.",
                "Variables in programming store data values. Functions are reusable blocks of code that perform specific tasks. Loops help repeat actions, and conditions help make decisions in your code.",
                "Debugging is finding and fixing errors in your code. Use print statements, debuggers, and systematic testing to identify and resolve issues."
            ],
            "math": [
                "Mathematics is the study of numbers, shapes, patterns, and relationships. It helps develop logical thinking and problem-solving skills essential for many fields.",
                "Algebra involves working with variables and equations. Calculus deals with rates of change and accumulation. Geometry studies shapes and spatial relationships.",
                "To solve math problems, read carefully, identify what's given and what's needed, choose appropriate methods, and check your work. Practice regularly to improve.",
                "Derivatives measure how fast something changes. Integrals find the total accumulation. These concepts are fundamental in calculus and have many real-world applications.",
                "Trigonometry studies relationships between angles and sides of triangles. It's used in physics, engineering, and many other fields."
            ],
            "ielts": [
                "IELTS (International English Language Testing System) is an English proficiency test for study, work, or migration. It has four sections: Listening, Reading, Writing, and Speaking.",
                "For IELTS Writing Task 1, describe graphs, charts, or processes clearly. For Task 2, write essays with clear arguments, examples, and proper structure.",
                "IELTS Speaking has three parts: introduction/interview, individual long turn, and two-way discussion. Practice speaking clearly, use varied vocabulary, and express ideas fluently.",
                "Reading strategies include skimming for main ideas, scanning for specific information, and understanding different question types like multiple choice, matching, and true/false.",
                "Listening practice involves understanding different accents, note-taking, and following instructions. Practice with various audio materials and focus on key information."
            ],
            "physics": [
                "Physics is the study of matter, energy, and their interactions. It explains how the universe works through fundamental laws and principles.",
                "Newton's laws describe motion: 1) Objects at rest stay at rest unless acted upon, 2) Force equals mass times acceleration, 3) For every action there's an equal and opposite reaction.",
                "Energy comes in different forms: kinetic (motion), potential (stored), thermal (heat), and electrical. Energy is conserved - it can't be created or destroyed, only transformed.",
                "Waves transfer energy without transferring matter. Sound waves need a medium, while light waves can travel through vacuum. Frequency determines pitch in sound and color in light.",
                "Electricity involves the flow of electrons. Circuits have components like resistors, capacitors, and batteries. Understanding voltage, current, and resistance is fundamental."
            ],
            "general": [
                "Learning is a continuous process that helps you grow and develop new skills. Choose topics that interest you and practice regularly for best results.",
                "Effective learning involves understanding concepts, practicing regularly, asking questions, and applying knowledge to real-world situations.",
                "Break complex topics into smaller parts, use different learning methods (visual, auditory, hands-on), and review material regularly to improve retention.",
                "Don't be afraid to make mistakes - they're part of the learning process. Seek help when needed and stay curious about new topics.",
                "Consistent practice and patience are key to mastering any subject. Set realistic goals and celebrate your progress along the way."
            ]
        }

    def retrieve_context(self, subject: str, prompt: str, max_chars: int = 1500, top_k: int = 3) -> str:
        """Optimized RAG: Semantic search using TF-IDF across ALL dataset examples."""
        try:
            subject_lower = subject.lower()
            data = self.datasets.get(subject_lower) or []
            
            if not data:
                return ""
            
            # Use TF-IDF semantic search if available
            if SKLEARN_AVAILABLE and subject_lower in self.vectorizers and self.vectorizers[subject_lower] is not None:
                try:
                    # Transform query to TF-IDF vector
                    query_vec = self.vectorizers[subject_lower].transform([prompt])
                    
                    # Calculate cosine similarity with ALL examples (FAST!)
                    similarities = cosine_similarity(query_vec, self.tfidf_matrices[subject_lower])[0]
                    
                    # Get top K most similar indices
                    top_indices = similarities.argsort()[-top_k:][::-1]
                    
                    # Build context from top matches
                    selected = []
                    total = 0
                    
                    for idx in top_indices:
                        if idx >= len(data):
                            continue
                        ex = data[idx]
                        chunk = f"Q: {ex.get('prompt','').strip()}\nA: {ex.get('answer','').strip()}"
                        if total + len(chunk) > max_chars:
                            # Truncate answer to fit
                            remaining = max_chars - total
                            if remaining > 100:  # Only add if meaningful space left
                                truncated = chunk[:remaining] + "..."
                                selected.append(truncated)
                            break
                        selected.append(chunk)
                        total += len(chunk)
                    
                    return "\n\n".join(selected)
                    
                except Exception as e:
                    print(f"TF-IDF search failed: {e}, falling back to token matching")
                    # Fall through to basic method
            
            # Fallback: Enhanced token-based search (better than before)
            query_tokens = set(re.findall(r"[a-zA-Z0-9_]+", prompt.lower()))
            scored = []
            
            # Search ALL data (not just 50!)
            for i, ex in enumerate(data):
                text = f"{ex.get('prompt','')}\n{ex.get('answer','')}".lower()
                tokens = set(re.findall(r"[a-zA-Z0-9_]+", text))
                
                # Better scoring: weighted by uniqueness
                common = query_tokens & tokens
                if common:
                    # Score by TF-IDF style: rarer words = higher score
                    score = sum(1.0 / (1 + text.count(word)) for word in common)
                    scored.append((score, ex))
            
            scored.sort(key=lambda x: x[0], reverse=True)
            selected = []
            total = 0
            
            for _, ex in scored[:top_k]:  # Top K examples
                chunk = f"Q: {ex.get('prompt','').strip()}\nA: {ex.get('answer','').strip()}"
                if total + len(chunk) > max_chars:
                    break
                selected.append(chunk)
                total += len(chunk)
            
            return "\n\n".join(selected)
        except Exception as e:
            print(f"Context retrieval error: {e}")
            return ""

    def is_safe(self, prompt: str) -> bool:
        """Check if prompt is safe for educational use."""
        return not any(word in prompt.lower() for word in self.safety_prompts)
    
    def analyze_emotion(self, text: str) -> Tuple[str, float]:
        """
        Analyze user emotion from message.
        Returns: (emotion, confidence)
        """
        text_lower = text.lower()
        
        # Emotion patterns
        patterns = {
            'frustrated': ['dont understand', "don't understand", 'confused', 'stuck', 'help',
                          'difficult', 'hard', 'cant', "can't", 'samajh nahi', 'mushkil', 'masla'],
            'confident': ['easy', 'got it', 'understand', 'clear', 'makes sense',
                         'more', 'advanced', 'samajh gaya', 'theek', 'achha'],
            'curious': ['how', 'why', 'what', 'kaise', 'kya', 'kyun'],
            'positive': ['thank', 'thanks', 'great', 'awesome', 'shukriya'],
        }
        
        scores = {emotion: 0 for emotion in patterns}
        
        for emotion, keywords in patterns.items():
            for keyword in keywords:
                if keyword in text_lower:
                    scores[emotion] += 1
        
        # Question mark = curious
        if '?' in text:
            scores['curious'] += 1
        
        # Error keywords = frustrated
        if any(word in text_lower for word in ['error', 'bug', 'wrong', 'issue']):
            scores['frustrated'] += 1
        
        if max(scores.values()) == 0:
            return 'neutral', 0.5
        
        primary = max(scores, key=scores.get)
        total = sum(scores.values())
        confidence = scores[primary] / total if total > 0 else 0.5
        
        return primary, confidence
    
    def get_emotion_instructions(self, emotion: str, confidence: float) -> str:
        """Get tone instructions based on detected emotion."""
        if confidence < 0.3:
            return ""
        
        instructions = {
            'frustrated': """
STUDENT EMOTIONAL STATE: Frustrated/Struggling (needs encouragement)
TONE ADJUSTMENT: Be extra supportive, patient, and encouraging
- Start with: "I understand this can be challenging. Let me help you with a simpler explanation."
- Break down into VERY simple steps
- Use more examples and analogies
- Be reassuring and positive
- Avoid complex terminology""",
            
            'confident': """
STUDENT EMOTIONAL STATE: Confident (ready for more)
TONE ADJUSTMENT: Provide advanced content and challenges
- Start with: "Great! Since you understand the basics, let's explore advanced concepts."
- Include edge cases and best practices
- Suggest optimization techniques
- Add challenging examples
- Encourage experimentation""",
            
            'curious': """
STUDENT EMOTIONAL STATE: Curious (wants to learn deeply)
TONE ADJUSTMENT: Be thorough and exploratory
- Provide comprehensive explanations
- Include "why" and "how it works internally"
- Add related concepts
- Encourage further questions""",
            
            'positive': """
STUDENT EMOTIONAL STATE: Happy/Satisfied
TONE ADJUSTMENT: Maintain positive momentum
- Acknowledge progress
- Suggest next learning steps
- Build on success""",
        }
        
        return instructions.get(emotion, "")

    def detect_language(self, prompt: str) -> str:
        """Detect if user is using Roman Urdu or English."""
        lowered = prompt.lower().strip()
        
        # Roman Urdu specific words (words that ONLY appear in Roman Urdu, not English)
        roman_urdu_markers = [
            "kya", "kyun", "kaise", "kese", "krdo", "kerdo", "kro", "kero",
            "mujhe", "mujhy", "mera", "meri", "mere", "ap", "aap", "apko", "apka",
            "tum", "tumhe", "tumhara",
            "hain", "hun", "ho", "hy", "hai", "hoon",
            "kia", "kerna", "krna", "karna", "kren", "karen",
            "sahi", "galat", "theek", "thik",
            "masla", "mushkil",
            "samjha", "samjho", "samajh",
            "btao", "batao", "bata", "btayen", "bataye",
            "seekho", "seekhna", "sikho", "sikhna",
            "tafsil", "tafseel",
            "matlab", "mtlb", "yani",
            "achha", "acha", "theek",
            "chahiye", "chaiye", "chaye",
            "sy", "se", "ka", "ki", "ko", "yr", "yar", "dekh", "dekho", 
            "anlyze", "analyze", "ker", "kro", "kerna", "krna"
        ]
        
        # Count Roman Urdu words
        words = lowered.split()
        roman_count = sum(1 for word in words if any(marker == word or word.startswith(marker) for marker in roman_urdu_markers))
        
        # If more than 15% words are Roman Urdu markers, it's Roman Urdu (reduced from 20%)
        threshold = max(1, len(words) * 0.15)  # At least 1 word or 15% of words
        
        return "Roman Urdu" if roman_count >= threshold else "English"

    def get_fallback_response(self, prompt: str, subject: str = "general") -> str:
        """Get a fallback response when API quota is exceeded."""
        try:
            # Get subject-specific fallback responses
            responses = self.fallback_responses.get(subject.lower(), self.fallback_responses["general"])
            
            # Try to match prompt keywords to most relevant response
            prompt_lower = prompt.lower()
            
            # Keyword matching for better responses
            if subject.lower() == "coding":
                if any(word in prompt_lower for word in ["variable", "var", "store"]):
                    return "Variables in programming store data values. In Python, you can create variables like: name = 'John' or age = 25. Variables help you save and reuse data in your programs."
                elif any(word in prompt_lower for word in ["function", "def", "method"]):
                    return "Functions are reusable blocks of code. In Python, define functions with 'def': def greet(name): return f'Hello {name}'. Functions help organize code and avoid repetition."
                elif any(word in prompt_lower for word in ["loop", "for", "while", "repeat"]):
                    return "Loops repeat actions in your code. 'for' loops iterate through lists: for item in [1,2,3]: print(item). 'while' loops continue until a condition is false."
            
            elif subject.lower() == "math":
                if any(word in prompt_lower for word in ["derivative", "differentiation", "rate"]):
                    return "Derivatives measure how fast something changes. The derivative of x² is 2x. This tells us the slope of the curve at any point, useful in physics and engineering."
                elif any(word in prompt_lower for word in ["integral", "integration", "area"]):
                    return "Integrals find the area under curves or total accumulation. The integral of 2x is x² + C. Integrals are used to calculate areas, volumes, and solve differential equations."
                elif any(word in prompt_lower for word in ["equation", "solve", "quadratic"]):
                    return "To solve equations, isolate the variable. For quadratic equations ax² + bx + c = 0, use the quadratic formula: x = (-b ± √(b²-4ac)) / 2a."
            
            elif subject.lower() == "ielts":
                if any(word in prompt_lower for word in ["writing", "essay", "task"]):
                    return "IELTS Writing Task 2 requires a clear essay structure: Introduction (state your position), Body paragraphs (with examples), Conclusion (summarize). Use formal language and varied vocabulary."
                elif any(word in prompt_lower for word in ["speaking", "talk", "discuss"]):
                    return "IELTS Speaking tests fluency, vocabulary, grammar, and pronunciation. Practice speaking clearly, use varied vocabulary, and express ideas with examples. Don't worry about perfect grammar - focus on communication."
                elif any(word in prompt_lower for word in ["reading", "comprehension", "passage"]):
                    return "IELTS Reading strategies: 1) Skim for main ideas, 2) Scan for specific information, 3) Read questions first, 4) Look for keywords, 5) Don't spend too much time on difficult questions."
            
            elif subject.lower() == "physics":
                if any(word in prompt_lower for word in ["newton", "law", "motion", "force"]):
                    return "Newton's laws: 1) Objects at rest stay at rest (inertia), 2) F = ma (force equals mass times acceleration), 3) Action and reaction are equal and opposite. These explain most motion in everyday life."
                elif any(word in prompt_lower for word in ["energy", "kinetic", "potential"]):
                    return "Energy comes in forms: Kinetic (motion) = ½mv², Potential (stored) = mgh. Energy is conserved - it transforms but never disappears. This principle explains many physical phenomena."
                elif any(word in prompt_lower for word in ["wave", "frequency", "amplitude"]):
                    return "Waves transfer energy without transferring matter. Frequency determines pitch (sound) or color (light). Amplitude determines volume (sound) or brightness (light). Waves can interfere constructively or destructively."
            
            # Return a random relevant response
            return random.choice(responses)
            
        except Exception:
            return "I'm currently experiencing high demand. Please try again in a few minutes, or feel free to ask about basic concepts in your chosen subject!"

    def is_quota_exceeded_error(self, error_msg: str) -> bool:
        """Check if the error is due to quota exceeded."""
        quota_indicators = [
            "quota exceeded",
            "429",
            "rate limit",
            "too many requests",
            "billing",
            "free tier"
        ]
        return any(indicator in error_msg.lower() for indicator in quota_indicators)

    def generate_response(self, prompt: str, subject: str = "general", language: str = "auto", max_retries: int = 2) -> str:
        """Generate educational response using Gemini with retry mechanism."""
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

        # Analyze emotion for adaptive tutoring
        emotion, emotion_confidence = self.analyze_emotion(prompt)
        emotion_instructions = self.get_emotion_instructions(emotion, emotion_confidence)

        # Get context
        context = self.retrieve_context(subject, prompt)

        # Determine response style
        short_markers = ["short", "brief", "one line", "one-line", "tl;dr", "define", "definition", "what is", "who is"]
        detailed_markers = ["detail", "detailed", "steps", "step by step", "kaise", "kesi", "explain", "roadmap", "plan"]
        
        is_short = any(m in lowered for m in short_markers) or ("?" in prompt and len(prompt.split()) <= 15)
        is_detailed = any(m in lowered for m in detailed_markers) or (not is_short and len(prompt.split()) > 12)

        # Build system prompt
        system_prompt = f"""You are an expert {subject} tutor. Your role is to provide clear, educational responses.

{emotion_instructions}

IMPORTANT INSTRUCTIONS:
1. Reply ONLY in {reply_language} - use Latin script for Roman Urdu, NO Arabic/Urdu script
2. Be educational and helpful
3. **Use Markdown formatting** for better readability:
   - Use **bold** for important terms
   - Use `code` for inline code or technical terms
   - Use ```language for code blocks (e.g., ```python, ```javascript)
   - Use # for main headings, ## for subheadings, ### for smaller headings
   - Use numbered lists (1. 2. 3.) for steps
   - Use bullet points (-) for lists
   - Use > for important notes or quotes
4. Provide step-by-step explanations when detailed answers are requested
5. Keep responses concise for simple questions
6. Do NOT repeat instructions or add meta-commentary
7. Focus on the student's learning needs
8. **CRITICAL**: Provide COMPLETE response - do NOT truncate or stop mid-sentence!

{"Context from educational examples:" if context else ""}
{context if context else ""}

{"Keep response brief (1-2 sentences)" if is_short else "Provide COMPLETE detailed step-by-step explanation with examples in markdown format. Finish all sections completely!" if is_detailed else "Provide clear, helpful COMPLETE explanation using markdown formatting"}

Student Question: {prompt}

**Remember**: Complete your entire response, do not stop in the middle!"""

        # Retry mechanism with exponential backoff
        for attempt in range(max_retries + 1):
            try:
                # Generate response with Gemini
                response = self.model.generate_content(
                    system_prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=8192,  # Maximum allowed by Gemini
                        temperature=0.7,
                        top_p=0.95,
                        top_k=40,
                    ),
                    safety_settings={
                        'HARASSMENT': 'block_none',
                        'HATE': 'block_none', 
                        'SEXUAL': 'block_none',
                        'DANGEROUS': 'block_none'
                    }
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
                if is_detailed and len(cleaned.split()) < 80:
                    try:
                        enhance_prompt = f"""Enhance this answer to be more detailed and educational. 
                        Provide COMPLETE detailed explanation with 5-10 numbered steps.
                        Keep the same language ({reply_language}).
                        
                        **CRITICAL**: Provide COMPLETE enhanced response, do not truncate!
                        
                        Original answer: {cleaned}
                        
                        Enhanced COMPLETE detailed answer:"""
                        
                        enhanced = self.model.generate_content(
                            enhance_prompt,
                            generation_config=genai.types.GenerationConfig(
                                max_output_tokens=8192,
                                temperature=0.6,
                            ),
                            safety_settings={
                                'HARASSMENT': 'block_none',
                                'HATE': 'block_none',
                                'SEXUAL': 'block_none',
                                'DANGEROUS': 'block_none'
                            }
                        )
                        
                        enhanced_text = enhanced.text.strip()
                        if len(enhanced_text.split()) > len(cleaned.split()) * 0.8:
                            cleaned = enhanced_text
                    except Exception:
                        pass
                
                return cleaned if cleaned else "I apologize, but I couldn't generate a proper response. Please try rephrasing your question."
                
            except Exception as e:
                error_msg = str(e)
                
                # Check if it's a quota exceeded error
                if self.is_quota_exceeded_error(error_msg):
                    # If this is the last attempt, return fallback response
                    if attempt == max_retries:
                        fallback_response = self.get_fallback_response(prompt, subject)
                        return fallback_response
                    else:
                        # Wait before retrying (exponential backoff)
                        wait_time = (2 ** attempt) + random.uniform(0, 1)
                        time.sleep(wait_time)
                        continue
                else:
                    # For other errors, return immediately
                    return f"I apologize, but I encountered an error: {error_msg}. Please try again."
        
        # This should never be reached, but just in case
        return "I apologize, but I couldn't generate a proper response. Please try again."

    def analyze_code(self, code: str, language: str = "python") -> Dict[str, str]:
        """Analyze code for errors and provide suggestions."""
        try:
            prompt = f"""Analyze this {language} code and provide a detailed, COMPLETE analysis.

**IMPORTANT**: Use **Markdown formatting** for better readability:
- Use **bold** for important terms (errors, warnings, etc.)
- Use `code` for inline code references
- Use ```{language} for code blocks with proper syntax
- Use ## for main sections, ### for subsections
- Use numbered lists (1. 2. 3.) for steps
- Use bullet points (-) for suggestions
- Use > for important notes

Code to analyze:
```{language}
{code}
```

**CRITICAL**: Provide your response in this EXACT order:

## ✅ Corrected Code
```{language}
(Show the fully corrected, working version here - COMPLETE code, not truncated)
```

## 📊 Analysis Summary
Brief overview of what was found and fixed.

## ❌ Errors Found
List all syntax or logical errors with line numbers if applicable.

## 💡 Suggestions for Improvement
Provide specific, actionable suggestions.

## 🎯 Best Practices
Recommend best practices for this code.

## 📝 Explanation
Detailed explanation of changes made and why.

**Make sure to provide COMPLETE response, do not truncate!**"""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=8192,
                    temperature=0.3,
                ),
                safety_settings={
                    'HARASSMENT': 'block_none',
                    'HATE': 'block_none',
                    'SEXUAL': 'block_none',
                    'DANGEROUS': 'block_none'
                }
            )
            
            analysis = response.text.strip()
            
            # Generate Roman Urdu version
            roman_prompt = f"""Translate this code analysis to Roman Urdu (Latin script only, no Arabic script).

**IMPORTANT**: 
1. Use **Markdown formatting** in Roman Urdu
2. Keep the SAME order (Corrected Code first, then explanation)
3. Provide COMPLETE translation, do not truncate
4. Use **bold** for important terms
5. Use `code` for inline code
6. Use ```{language} for code blocks
7. Use ## for sections, ### for subsections

Original Analysis:
{analysis}

Provide the COMPLETE detailed analysis in Roman Urdu with markdown formatting.
**CRITICAL**: Response must be COMPLETE, not truncated!"""

            try:
                roman_response = self.model.generate_content(
                    roman_prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=8192,
                        temperature=0.4,
                    ),
                    safety_settings={
                        'HARASSMENT': 'block_none',
                        'HATE': 'block_none',
                        'SEXUAL': 'block_none',
                        'DANGEROUS': 'block_none'
                    }
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
            error_msg = str(e)
            
            # Check if it's a quota exceeded error
            if self.is_quota_exceeded_error(error_msg):
                # Return fallback code analysis
                fallback_analysis = f"""Code Analysis (Fallback Mode):

This appears to be {language} code. Here are some general tips:

1. Check for syntax errors (missing brackets, semicolons, etc.)
2. Ensure proper indentation and formatting
3. Verify variable names are correctly spelled
4. Check that all functions are properly defined
5. Look for logical errors in your algorithm

For detailed analysis, please try again when API limits reset, or consider upgrading your plan for unlimited access.

💡 Note: I'm currently experiencing high demand but still providing helpful guidance!"""
                
                return {
                    "analysis": fallback_analysis,
                    "roman_analysis": f"Code analysis mein high demand ki wajah se detailed response nahi de sakta, lekin basic tips de sakta hun. Syntax errors check karein, proper indentation rakhein, aur variable names sahi spell karein.",
                    "has_error": True,
                    "language": language
                }
            else:
                return {
                    "analysis": f"Error analyzing code: {error_msg}",
                    "roman_analysis": f"Code analysis mein error: {error_msg}",
                    "has_error": True,
                    "language": language
                }
