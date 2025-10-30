"""
Emotion-Aware Tutoring Service
Analyzes user sentiment and adjusts AI response tone accordingly
"""

import re
from typing import Dict, Tuple

class EmotionAnalyzer:
    def __init__(self):
        # Emotion keywords and patterns
        self.emotion_patterns = {
            'frustrated': [
                'dont understand', "don't understand", 'confused', 'stuck', 'help',
                'difficult', 'hard', 'cant', "can't", 'not working', 'error',
                'samajh nahi aya', 'mushkil', 'masla', 'nahi samajh'
            ],
            'confident': [
                'easy', 'got it', 'understand', 'clear', 'makes sense',
                'challenge', 'more', 'advanced', 'next level',
                'samajh gaya', 'samajh gayi', 'theek hai', 'achha'
            ],
            'curious': [
                'how', 'why', 'what', 'when', 'where', 'which',
                'explain', 'tell me', 'show me', 'kaise', 'kya', 'kyun'
            ],
            'requesting_help': [
                'please', 'help', 'need', 'can you', 'could you',
                'madad', 'help karo', 'please btao'
            ],
            'positive': [
                'thank', 'thanks', 'great', 'awesome', 'perfect', 'excellent',
                'shukriya', 'bahut achha', 'zabardast'
            ]
        }
    
    def analyze_emotion(self, text: str) -> Tuple[str, float, Dict[str, str]]:
        """
        Analyze emotion from user text.
        
        Returns:
            emotion: Primary emotion detected
            confidence: Confidence score (0-1)
            tone_adjustments: Suggestions for AI response tone
        """
        text_lower = text.lower()
        emotion_scores = {emotion: 0 for emotion in self.emotion_patterns.keys()}
        
        # Count matches for each emotion
        for emotion, keywords in self.emotion_patterns.items():
            for keyword in keywords:
                if keyword in text_lower:
                    emotion_scores[emotion] += 1
        
        # Detect question marks (curiosity)
        if '?' in text:
            emotion_scores['curious'] += 1
        
        # Detect exclamation (strong emotion)
        if '!' in text:
            emotion_scores['frustrated'] += 0.5
            emotion_scores['confident'] += 0.5
        
        # Detect code errors (frustration)
        if any(word in text_lower for word in ['error', 'bug', 'wrong', 'issue', 'problem']):
            emotion_scores['frustrated'] += 1
        
        # Get primary emotion
        if max(emotion_scores.values()) == 0:
            primary_emotion = 'neutral'
            confidence = 0.5
        else:
            primary_emotion = max(emotion_scores, key=emotion_scores.get)
            total_score = sum(emotion_scores.values())
            confidence = emotion_scores[primary_emotion] / total_score if total_score > 0 else 0.5
        
        # Generate tone adjustments
        tone_adjustments = self.get_tone_adjustments(primary_emotion, confidence)
        
        return primary_emotion, confidence, tone_adjustments
    
    def get_tone_adjustments(self, emotion: str, confidence: float) -> Dict[str, str]:
        """Generate AI response tone adjustments based on user emotion."""
        
        adjustments = {
            'frustrated': {
                'tone': 'supportive and encouraging',
                'style': 'Break down concepts into simpler steps. Use more examples. Be patient and reassuring.',
                'prefix': 'I understand this can be challenging. Let me explain it step-by-step in a simpler way.',
                'emphasis': 'Focus on clarity over completeness. Use analogies and simple examples.'
            },
            'confident': {
                'tone': 'challenging and advanced',
                'style': 'Provide more advanced concepts. Add edge cases. Suggest best practices.',
                'prefix': 'Great! Since you understand the basics, let me show you some advanced concepts.',
                'emphasis': 'Include advanced techniques, optimization tips, and real-world scenarios.'
            },
            'curious': {
                'tone': 'informative and exploratory',
                'style': 'Provide comprehensive explanations. Include related concepts. Encourage exploration.',
                'prefix': 'That\'s a great question! Let me explain this in detail.',
                'emphasis': 'Provide context, related concepts, and encourage further questions.'
            },
            'requesting_help': {
                'tone': 'helpful and patient',
                'style': 'Direct assistance. Clear instructions. Step-by-step guidance.',
                'prefix': 'I\'m here to help! Here\'s what you need to know:',
                'emphasis': 'Be direct, clear, and actionable. Focus on solving the immediate problem.'
            },
            'positive': {
                'tone': 'encouraging and motivating',
                'style': 'Reinforce learning. Suggest next steps. Build confidence.',
                'prefix': 'Wonderful! You\'re making great progress. Let me help you with that.',
                'emphasis': 'Celebrate progress, suggest next challenges, maintain momentum.'
            },
            'neutral': {
                'tone': 'balanced and educational',
                'style': 'Standard educational approach. Clear and comprehensive.',
                'prefix': '',
                'emphasis': 'Provide balanced, educational content with examples.'
            }
        }
        
        return adjustments.get(emotion, adjustments['neutral'])
    
    def enhance_prompt_with_emotion(self, original_prompt: str, user_message: str) -> str:
        """Add emotion-aware instructions to the AI prompt."""
        emotion, confidence, adjustments = self.analyze_emotion(user_message)
        
        # Only apply if confidence is high enough
        if confidence < 0.3:
            return original_prompt
        
        emotion_context = f"""
EMOTION DETECTED: {emotion.upper()} (confidence: {confidence:.0%})

TONE ADJUSTMENT:
- Use {adjustments['tone']} tone
- Style: {adjustments['style']}
{f"- Start with: {adjustments['prefix']}" if adjustments['prefix'] else ""}
- Emphasis: {adjustments['emphasis']}
"""
        
        # Insert emotion context after main instructions
        enhanced = original_prompt.replace(
            "Student Question:",
            f"{emotion_context}\nStudent Question:"
        )
        
        return enhanced

