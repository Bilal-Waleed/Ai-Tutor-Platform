#!/usr/bin/env python3
"""
AI Tutor Performance Testing Script
Tests system performance under various loads and conditions.
"""

import os
import sys
import time
import asyncio
import psutil
import threading
from typing import List, Dict
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.gemini_service import GeminiService

# Load environment variables
load_dotenv()

@dataclass
class PerformanceMetrics:
    response_time: float
    memory_usage: float
    cpu_usage: float
    success: bool
    error_message: str = ""

class PerformanceTester:
    def __init__(self):
        self.llm_service = GeminiService()
        self.test_questions = [
            "What is Python?",
            "How do you create a variable?",
            "What is a function?",
            "Explain loops in programming",
            "What is object-oriented programming?"
        ]
        
    def get_system_metrics(self) -> Dict[str, float]:
        """Get current system resource usage."""
        return {
            "memory_percent": psutil.virtual_memory().percent,
            "memory_used_gb": psutil.virtual_memory().used / (1024**3),
            "memory_available_gb": psutil.virtual_memory().available / (1024**3),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "disk_usage_percent": psutil.disk_usage('/').percent
        }
    
    def test_single_request(self, question: str) -> PerformanceMetrics:
        """Test a single request and measure performance."""
        start_time = time.time()
        start_memory = psutil.virtual_memory().used / (1024**3)
        start_cpu = psutil.cpu_percent()
        
        try:
            response = self.llm_service.generate_response(question, "coding", "auto")
            success = True
            error_message = ""
        except Exception as e:
            response = ""
            success = False
            error_message = str(e)
        
        end_time = time.time()
        end_memory = psutil.virtual_memory().used / (1024**3)
        end_cpu = psutil.cpu_percent()
        
        return PerformanceMetrics(
            response_time=end_time - start_time,
            memory_usage=end_memory - start_memory,
            cpu_usage=(start_cpu + end_cpu) / 2,
            success=success,
            error_message=error_message
        )
    
    def test_concurrent_requests(self, num_requests: int = 5) -> List[PerformanceMetrics]:
        """Test multiple concurrent requests."""
        print(f"🔄 Testing {num_requests} concurrent requests...")
        
        with ThreadPoolExecutor(max_workers=num_requests) as executor:
            futures = [
                executor.submit(self.test_single_request, question)
                for question in self.test_questions[:num_requests]
            ]
            
            results = [future.result() for future in futures]
        
        return results
    
    def test_memory_stress(self, duration_seconds: int = 60) -> Dict:
        """Test system under memory stress."""
        print(f"💾 Running memory stress test for {duration_seconds} seconds...")
        
        start_metrics = self.get_system_metrics()
        results = []
        start_time = time.time()
        
        while time.time() - start_time < duration_seconds:
            # Run multiple requests rapidly
            batch_results = self.test_concurrent_requests(3)
            results.extend(batch_results)
            
            current_metrics = self.get_system_metrics()
            print(f"   Memory: {current_metrics['memory_percent']:.1f}% | "
                  f"CPU: {current_metrics['cpu_percent']:.1f}% | "
                  f"Requests: {len(results)}")
            
            time.sleep(2)  # Brief pause between batches
        
        end_metrics = self.get_system_metrics()
        
        return {
            "duration": duration_seconds,
            "total_requests": len(results),
            "successful_requests": sum(1 for r in results if r.success),
            "failed_requests": sum(1 for r in results if not r.success),
            "average_response_time": sum(r.response_time for r in results) / len(results),
            "max_response_time": max(r.response_time for r in results),
            "min_response_time": min(r.response_time for r in results),
            "start_memory_gb": start_metrics['memory_used_gb'],
            "end_memory_gb": end_metrics['memory_used_gb'],
            "memory_increase_gb": end_metrics['memory_used_gb'] - start_metrics['memory_used_gb'],
            "peak_memory_percent": max(self.get_system_metrics()['memory_percent'] for _ in range(10))
        }
    
    def test_response_time_consistency(self, num_tests: int = 20) -> Dict:
        """Test response time consistency over multiple requests."""
        print(f"⏱️  Testing response time consistency ({num_tests} requests)...")
        
        results = []
        for i in range(num_tests):
            question = self.test_questions[i % len(self.test_questions)]
            result = self.test_single_request(question)
            results.append(result)
            
            if (i + 1) % 5 == 0:
                print(f"   Completed {i + 1}/{num_tests} requests")
        
        response_times = [r.response_time for r in results if r.success]
        
        if not response_times:
            return {"error": "No successful requests"}
        
        return {
            "total_requests": len(results),
            "successful_requests": len(response_times),
            "average_response_time": sum(response_times) / len(response_times),
            "median_response_time": sorted(response_times)[len(response_times) // 2],
            "min_response_time": min(response_times),
            "max_response_time": max(response_times),
            "std_deviation": (sum((x - sum(response_times)/len(response_times))**2 for x in response_times) / len(response_times))**0.5
        }
    
    def test_ram_constraint(self) -> Dict:
        """Test if system stays within 16GB RAM constraint."""
        print("🧠 Testing RAM constraint compliance...")
        
        initial_memory = self.get_system_metrics()['memory_used_gb']
        print(f"   Initial memory usage: {initial_memory:.2f} GB")
        
        # Run multiple concurrent requests to stress test memory
        stress_results = self.test_memory_stress(30)
        
        final_memory = self.get_system_metrics()['memory_used_gb']
        peak_memory = stress_results['peak_memory_percent']
        
        ram_constraint_gb = 16
        memory_within_limit = final_memory < ram_constraint_gb
        peak_within_limit = (peak_memory / 100) * (psutil.virtual_memory().total / (1024**3)) < ram_constraint_gb
        
        return {
            "initial_memory_gb": initial_memory,
            "final_memory_gb": final_memory,
            "peak_memory_percent": peak_memory,
            "memory_increase_gb": final_memory - initial_memory,
            "ram_constraint_gb": ram_constraint_gb,
            "within_memory_limit": memory_within_limit,
            "peak_within_limit": peak_within_limit,
            "total_system_memory_gb": psutil.virtual_memory().total / (1024**3),
            "recommendation": "✅ System within RAM limits" if memory_within_limit else "⚠️  System approaching RAM limits"
        }
    
    def run_comprehensive_test(self) -> Dict:
        """Run comprehensive performance testing."""
        print("🚀 Starting Comprehensive Performance Testing")
        print("=" * 60)
        
        # System info
        system_info = {
            "cpu_count": psutil.cpu_count(),
            "total_memory_gb": psutil.virtual_memory().total / (1024**3),
            "available_memory_gb": psutil.virtual_memory().available / (1024**3),
            "python_version": sys.version,
            "platform": sys.platform
        }
        
        print(f"💻 System Information:")
        print(f"   CPU Cores: {system_info['cpu_count']}")
        print(f"   Total Memory: {system_info['total_memory_gb']:.2f} GB")
        print(f"   Available Memory: {system_info['available_memory_gb']:.2f} GB")
        print(f"   Platform: {system_info['platform']}")
        
        # Run tests
        tests_results = {}
        
        # 1. Single request test
        print(f"\n1️⃣ Single Request Test:")
        single_result = self.test_single_request(self.test_questions[0])
        tests_results["single_request"] = {
            "response_time": single_result.response_time,
            "success": single_result.success,
            "memory_usage": single_result.memory_usage,
            "cpu_usage": single_result.cpu_usage
        }
        print(f"   Response Time: {single_result.response_time:.2f}s")
        print(f"   Success: {'✅' if single_result.success else '❌'}")
        
        # 2. Concurrent requests test
        print(f"\n2️⃣ Concurrent Requests Test:")
        concurrent_results = self.test_concurrent_requests(5)
        tests_results["concurrent_requests"] = {
            "total_requests": len(concurrent_results),
            "successful_requests": sum(1 for r in concurrent_results if r.success),
            "average_response_time": sum(r.response_time for r in concurrent_results) / len(concurrent_results),
            "max_response_time": max(r.response_time for r in concurrent_results),
            "min_response_time": min(r.response_time for r in concurrent_results)
        }
        print(f"   Successful: {tests_results['concurrent_requests']['successful_requests']}/{tests_results['concurrent_requests']['total_requests']}")
        print(f"   Avg Response Time: {tests_results['concurrent_requests']['average_response_time']:.2f}s")
        
        # 3. Response time consistency test
        print(f"\n3️⃣ Response Time Consistency Test:")
        consistency_results = self.test_response_time_consistency(15)
        tests_results["consistency"] = consistency_results
        if "error" not in consistency_results:
            print(f"   Average: {consistency_results['average_response_time']:.2f}s")
            print(f"   Std Deviation: {consistency_results['std_deviation']:.2f}s")
            print(f"   Range: {consistency_results['min_response_time']:.2f}s - {consistency_results['max_response_time']:.2f}s")
        
        # 4. RAM constraint test
        print(f"\n4️⃣ RAM Constraint Test:")
        ram_results = self.test_ram_constraint()
        tests_results["ram_constraint"] = ram_results
        print(f"   Final Memory: {ram_results['final_memory_gb']:.2f} GB")
        print(f"   Peak Memory: {ram_results['peak_memory_percent']:.1f}%")
        print(f"   Status: {ram_results['recommendation']}")
        
        # 5. Memory stress test
        print(f"\n5️⃣ Memory Stress Test:")
        stress_results = self.test_memory_stress(30)
        tests_results["memory_stress"] = stress_results
        print(f"   Total Requests: {stress_results['total_requests']}")
        print(f"   Success Rate: {(stress_results['successful_requests']/stress_results['total_requests']*100):.1f}%")
        print(f"   Memory Increase: {stress_results['memory_increase_gb']:.2f} GB")
        
        # Generate final report
        report = {
            "system_info": system_info,
            "test_results": tests_results,
            "performance_summary": {
                "average_response_time": tests_results["single_request"]["response_time"],
                "concurrent_performance": tests_results["concurrent_requests"]["average_response_time"],
                "memory_efficiency": ram_results["memory_increase_gb"],
                "ram_compliance": ram_results["within_memory_limit"],
                "overall_performance": "Good" if (
                    tests_results["single_request"]["response_time"] < 5 and
                    ram_results["within_memory_limit"] and
                    tests_results["concurrent_requests"]["successful_requests"] == tests_results["concurrent_requests"]["total_requests"]
                ) else "Needs Improvement"
            }
        }
        
        return report
    
    def print_final_report(self, report: Dict):
        """Print final performance report."""
        print("\n" + "=" * 60)
        print("📊 PERFORMANCE TESTING REPORT")
        print("=" * 60)
        
        summary = report["performance_summary"]
        print(f"\n🎯 PERFORMANCE SUMMARY:")
        print(f"   Overall Performance: {summary['overall_performance']}")
        print(f"   Average Response Time: {summary['average_response_time']:.2f}s")
        print(f"   Concurrent Performance: {summary['concurrent_performance']:.2f}s")
        print(f"   Memory Efficiency: {summary['memory_efficiency']:.2f} GB increase")
        print(f"   RAM Compliance: {'✅ YES' if summary['ram_compliance'] else '❌ NO'}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        if summary['average_response_time'] > 5:
            print("   ⚠️  Response times are slow. Consider optimizing model parameters.")
        
        if not summary['ram_compliance']:
            print("   ⚠️  System exceeds RAM limits. Consider:")
            print("      - Reducing batch sizes")
            print("      - Implementing memory cleanup")
            print("      - Using lighter model variants")
        
        if summary['memory_efficiency'] > 2:
            print("   ⚠️  High memory usage. Consider implementing memory management.")
        
        print(f"\n✅ Performance testing completed!")
        print(f"📄 Detailed results saved to: performance_report.json")

def main():
    """Main performance testing function."""
    tester = PerformanceTester()
    
    try:
        report = tester.run_comprehensive_test()
        
        # Save report to file
        import json
        with open('performance_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Print report
        tester.print_final_report(report)
        
        # Return success/failure based on performance
        if report["performance_summary"]["overall_performance"] == "Good":
            print("\n🎉 SUCCESS: System performance meets requirements!")
            sys.exit(0)
        else:
            print("\n⚠️  WARNING: System performance needs improvement.")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Performance testing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
