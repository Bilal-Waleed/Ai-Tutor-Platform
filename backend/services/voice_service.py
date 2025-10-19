# from faster_whisper import WhisperModel  # Use faster-whisper instead of whisper
# import librosa
# import soundfile as sf
# import numpy as np
# import torch
# import onnxruntime
# from silero_vad import SileroVAD
# from piper import PiperVoice
# 
# class VoiceService:
#     def __init__(self):
#         # Load faster-whisper model (base: CPU-friendly, ~150MB)
#         self.whisper_model = WhisperModel("base", device="cpu", compute_type="int8")  # int8 for CPU optimization
#         
#         # Load Silero VAD model (local JIT file)
#         vad_model_path = "C:\\Users\\ESHOP\\Desktop\\revotic ai\\Task 2\\ai-tutor-platform\\backend\\models\\silero\\silero_vad.jit"
#         self.vad_session = onnxruntime.InferenceSession(vad_model_path)
#         self.vad_threshold = 0.5  # Sensitivity for speech detection
#         
#         # Load Piper TTS (download voice from github.com/rhasspy/piper/releases)
#         self.tts = PiperVoice.load("en_US-lessac-medium.onnx")  # Hindi: hi_IN-kalpana-medium.onnx
# 
#     def stt_with_noise_remove(self, audio_file, language="en"):
#         # Code commented as voice is optional
#         return ""
# 
#     def tts_to_audio(self, text, output_file="response.wav", language="en"):
#         # Commented
#         pass
# 
# # Test example commented