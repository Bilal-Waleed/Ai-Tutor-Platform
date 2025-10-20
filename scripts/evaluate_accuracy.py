#!/usr/bin/env python3
"""
AI Tutor Accuracy Evaluation Script
Tests the AI tutor's performance across different subjects and question types.
"""

import os
import sys
import json
import time
import asyncio
from typing import Dict, List, Tuple
from dataclasses import dataclass
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.gemini_service import GeminiService

# Load environment variables
load_dotenv()

@dataclass
class TestQuestion:
    question: str
    expected_keywords: List[str]
    subject: str
    difficulty: str
    question_type: str

@dataclass
class EvaluationResult:
    question: str
    response: str
    score: float
    keywords_found: List[str]
    keywords_missing: List[str]
    response_time: float
    subject: str
    difficulty: str
    question_type: str

class AIAccuracyEvaluator:
    def __init__(self):
        self.llm_service = GeminiService()
        self.test_questions = self.load_test_questions()
        
    def load_test_questions(self) -> List[TestQuestion]:
        """Load test questions from datasets or create sample questions."""
        questions = []
        
        # Sample questions for each subject
        sample_questions = [
            # Coding Questions
            TestQuestion(
                question="What is a variable in Python?",
                expected_keywords=["variable", "store", "data", "value", "assignment", "="],
                subject="coding",
                difficulty="beginner",
                question_type="definition"
            ),
            TestQuestion(
                question="How do you create a for loop in Python?",
                expected_keywords=["for", "in", "range", "loop", "iteration", ":"],
                subject="coding",
                difficulty="intermediate",
                question_type="syntax"
            ),
            TestQuestion(
                question="What is the difference between a list and a tuple in Python?",
                expected_keywords=["list", "tuple", "mutable", "immutable", "brackets", "parentheses"],
                subject="coding",
                difficulty="intermediate",
                question_type="comparison"
            ),
            
            # Math Questions
            TestQuestion(
                question="What is the derivative of x^2?",
                expected_keywords=["derivative", "2x", "power rule", "differentiation"],
                subject="math",
                difficulty="intermediate",
                question_type="calculation"
            ),
            TestQuestion(
                question="How do you solve a quadratic equation?",
                expected_keywords=["quadratic", "formula", "discriminant", "roots", "ax^2", "bx", "c"],
                subject="math",
                difficulty="intermediate",
                question_type="method"
            ),
            TestQuestion(
                question="What is the Pythagorean theorem?",
                expected_keywords=["pythagorean", "theorem", "a^2", "b^2", "c^2", "right triangle", "hypotenuse"],
                subject="math",
                difficulty="beginner",
                question_type="definition"
            ),
            
            # IELTS Questions
            TestQuestion(
                question="How can I improve my IELTS writing score?",
                expected_keywords=["writing", "improve", "practice", "structure", "vocabulary", "grammar", "coherence"],
                subject="ielts",
                difficulty="intermediate",
                question_type="advice"
            ),
            TestQuestion(
                question="What is the difference between IELTS Academic and General?",
                expected_keywords=["academic", "general", "difference", "purpose", "university", "immigration"],
                subject="ielts",
                difficulty="beginner",
                question_type="comparison"
            ),
            TestQuestion(
                question="How long is the IELTS speaking test?",
                expected_keywords=["speaking", "test", "duration", "time", "minutes", "11-14"],
                subject="ielts",
                difficulty="beginner",
                question_type="factual"
            ),
            
            # Physics Questions
            TestQuestion(
                question="What is Newton's first law of motion?",
                expected_keywords=["newton", "first law", "inertia", "rest", "motion", "force"],
                subject="physics",
                difficulty="beginner",
                question_type="definition"
            ),
            TestQuestion(
                question="How do you calculate kinetic energy?",
                expected_keywords=["kinetic energy", "formula", "1/2", "mv^2", "mass", "velocity"],
                subject="physics",
                difficulty="intermediate",
                question_type="formula"
            ),
            TestQuestion(
                question="What is the difference between speed and velocity?",
                expected_keywords=["speed", "velocity", "difference", "scalar", "vector", "direction"],
                subject="physics",
                difficulty="intermediate",
                question_type="comparison"
            ),
        ]
        
        return sample_questions
    
    def evaluate_response(self, question: TestQuestion, response: str) -> Tuple[float, List[str], List[str]]:
        """Evaluate a response against expected keywords."""
        response_lower = response.lower()
        keywords_found = []
        keywords_missing = []
        
        for keyword in question.expected_keywords:
            if keyword.lower() in response_lower:
                keywords_found.append(keyword)
            else:
                keywords_missing.append(keyword)
        
        # Calculate score based on keyword coverage
        score = len(keywords_found) / len(question.expected_keywords) * 100
        
        return score, keywords_found, keywords_missing
    
    async def test_question(self, question: TestQuestion) -> EvaluationResult:
        """Test a single question and return evaluation result."""
        start_time = time.time()
        
        try:
            response = self.llm_service.generate_response(
                question.question, 
                question.subject, 
                language="auto"
            )
        except Exception as e:
            response = f"Error generating response: {str(e)}"
        
        response_time = time.time() - start_time
        
        score, keywords_found, keywords_missing = self.evaluate_response(question, response)
        
        return EvaluationResult(
            question=question.question,
            response=response,
            score=score,
            keywords_found=keywords_found,
            keywords_missing=keywords_missing,
            response_time=response_time,
            subject=question.subject,
            difficulty=question.difficulty,
            question_type=question.question_type
        )
    
    async def run_evaluation(self) -> List[EvaluationResult]:
        """Run evaluation on all test questions."""
        print("🧪 Starting AI Tutor Accuracy Evaluation...")
        print(f"📝 Testing {len(self.test_questions)} questions across {len(set(q.subject for q in self.test_questions))} subjects")
        print("=" * 60)
        
        results = []
        
        for i, question in enumerate(self.test_questions, 1):
            print(f"\n🔍 Question {i}/{len(self.test_questions)}: {question.subject.upper()}")
            print(f"   Q: {question.question}")
            print(f"   Type: {question.question_type} | Difficulty: {question.difficulty}")
            
            result = await self.test_question(question)
            results.append(result)
            
            print(f"   ✅ Score: {result.score:.1f}%")
            print(f"   ⏱️  Response Time: {result.response_time:.2f}s")
            print(f"   📊 Keywords Found: {len(result.keywords_found)}/{len(question.expected_keywords)}")
            
            if result.keywords_missing:
                print(f"   ❌ Missing: {', '.join(result.keywords_missing[:3])}{'...' if len(result.keywords_missing) > 3 else ''}")
        
        return results
    
    def generate_report(self, results: List[EvaluationResult]) -> Dict:
        """Generate comprehensive evaluation report."""
        if not results:
            return {}
        
        # Overall statistics
        total_questions = len(results)
        average_score = sum(r.score for r in results) / total_questions
        average_response_time = sum(r.response_time for r in results) / total_questions
        
        # Subject-wise statistics
        subject_stats = {}
        for subject in set(r.subject for r in results):
            subject_results = [r for r in results if r.subject == subject]
            subject_stats[subject] = {
                "total_questions": len(subject_results),
                "average_score": sum(r.score for r in subject_results) / len(subject_results),
                "average_response_time": sum(r.response_time for r in subject_results) / len(subject_results),
                "questions": [
                    {
                        "question": r.question,
                        "score": r.score,
                        "response_time": r.response_time,
                        "keywords_found": len(r.keywords_found),
                        "keywords_total": len(r.keywords_found) + len(r.keywords_missing)
                    }
                    for r in subject_results
                ]
            }
        
        # Difficulty-wise statistics
        difficulty_stats = {}
        for difficulty in set(r.difficulty for r in results):
            difficulty_results = [r for r in results if r.difficulty == difficulty]
            difficulty_stats[difficulty] = {
                "total_questions": len(difficulty_results),
                "average_score": sum(r.score for r in difficulty_results) / len(difficulty_results),
                "average_response_time": sum(r.response_time for r in difficulty_results) / len(difficulty_results)
            }
        
        # Question type statistics
        type_stats = {}
        for q_type in set(r.question_type for r in results):
            type_results = [r for r in results if r.question_type == q_type]
            type_stats[q_type] = {
                "total_questions": len(type_results),
                "average_score": sum(r.score for r in type_results) / len(type_results),
                "average_response_time": sum(r.response_time for r in type_results) / len(type_results)
            }
        
        # Performance analysis
        high_performing = [r for r in results if r.score >= 80]
        medium_performing = [r for r in results if 60 <= r.score < 80]
        low_performing = [r for r in results if r.score < 60]
        
        report = {
            "evaluation_summary": {
                "total_questions": total_questions,
                "average_score": round(average_score, 2),
                "average_response_time": round(average_response_time, 2),
                "accuracy_target_met": average_score >= 70,
                "performance_distribution": {
                    "high_performing": len(high_performing),
                    "medium_performing": len(medium_performing),
                    "low_performing": len(low_performing)
                }
            },
            "subject_performance": subject_stats,
            "difficulty_performance": difficulty_stats,
            "question_type_performance": type_stats,
            "detailed_results": [
                {
                    "question": r.question,
                    "subject": r.subject,
                    "difficulty": r.difficulty,
                    "question_type": r.question_type,
                    "score": round(r.score, 2),
                    "response_time": round(r.response_time, 2),
                    "keywords_found": r.keywords_found,
                    "keywords_missing": r.keywords_missing,
                    "response_preview": r.response[:200] + "..." if len(r.response) > 200 else r.response
                }
                for r in results
            ]
        }
        
        return report
    
    def print_report(self, report: Dict):
        """Print evaluation report to console."""
        print("\n" + "=" * 60)
        print("📊 AI TUTOR ACCURACY EVALUATION REPORT")
        print("=" * 60)
        
        summary = report["evaluation_summary"]
        print(f"\n🎯 OVERALL PERFORMANCE:")
        print(f"   Total Questions: {summary['total_questions']}")
        print(f"   Average Score: {summary['average_score']}%")
        print(f"   Average Response Time: {summary['average_response_time']:.2f}s")
        print(f"   Target Met (70%+): {'✅ YES' if summary['accuracy_target_met'] else '❌ NO'}")
        
        print(f"\n📈 PERFORMANCE DISTRIBUTION:")
        perf = summary['performance_distribution']
        print(f"   High Performing (80%+): {perf['high_performing']} questions")
        print(f"   Medium Performing (60-79%): {perf['medium_performing']} questions")
        print(f"   Low Performing (<60%): {perf['low_performing']} questions")
        
        print(f"\n📚 SUBJECT PERFORMANCE:")
        for subject, stats in report["subject_performance"].items():
            print(f"   {subject.upper()}:")
            print(f"     Average Score: {stats['average_score']:.1f}%")
            print(f"     Response Time: {stats['average_response_time']:.2f}s")
            print(f"     Questions: {stats['total_questions']}")
        
        print(f"\n🎚️ DIFFICULTY PERFORMANCE:")
        for difficulty, stats in report["difficulty_performance"].items():
            print(f"   {difficulty.upper()}:")
            print(f"     Average Score: {stats['average_score']:.1f}%")
            print(f"     Response Time: {stats['average_response_time']:.2f}s")
            print(f"     Questions: {stats['total_questions']}")
        
        print(f"\n📝 QUESTION TYPE PERFORMANCE:")
        for q_type, stats in report["question_type_performance"].items():
            print(f"   {q_type.upper()}:")
            print(f"     Average Score: {stats['average_score']:.1f}%")
            print(f"     Response Time: {stats['average_response_time']:.2f}s")
            print(f"     Questions: {stats['total_questions']}")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if summary['average_score'] < 70:
            print("   ⚠️  Overall accuracy below target. Consider:")
            print("      - Improving dataset quality and coverage")
            print("      - Fine-tuning prompts for better responses")
            print("      - Adding more context to questions")
        
        if summary['average_response_time'] > 5:
            print("   ⚠️  Response times are slow. Consider:")
            print("      - Optimizing model parameters")
            print("      - Implementing response caching")
            print("      - Using faster model variants")
        
        worst_subject = min(report["subject_performance"].items(), key=lambda x: x[1]['average_score'])
        if worst_subject[1]['average_score'] < 60:
            print(f"   ⚠️  {worst_subject[0].upper()} needs improvement:")
            print("      - Review subject-specific datasets")
            print("      - Adjust prompts for better subject understanding")
        
        print(f"\n✅ Evaluation completed successfully!")
        print(f"📄 Detailed results saved to: evaluation_report.json")

async def main():
    """Main evaluation function."""
    evaluator = AIAccuracyEvaluator()
    
    try:
        results = await evaluator.run_evaluation()
        report = evaluator.generate_report(results)
        
        # Save report to file
        with open('evaluation_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Print report
        evaluator.print_report(report)
        
        # Return success/failure based on target
        if report["evaluation_summary"]["accuracy_target_met"]:
            print("\n🎉 SUCCESS: AI Tutor meets accuracy requirements!")
            sys.exit(0)
        else:
            print("\n⚠️  WARNING: AI Tutor needs improvement to meet accuracy requirements.")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
