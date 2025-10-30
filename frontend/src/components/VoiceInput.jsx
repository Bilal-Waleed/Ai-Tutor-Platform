import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'react-toastify';

const VoiceInput = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');

  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;  // Keep listening until manually stopped
      recognitionInstance.interimResults = true;  // Show real-time transcripts
      recognitionInstance.lang = 'en-US'; // Can switch to 'ur-PK' for Urdu
      
      recognitionInstance.onresult = (event) => {
        // Get all transcripts (continuous mode gives multiple results)
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update current transcript with final + interim
        const fullTranscript = (currentTranscript + finalTranscript).trim();
        setCurrentTranscript(fullTranscript);
        
        // Send the full transcript to parent component
        onTranscript(fullTranscript + ' ' + interimTranscript);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Don't show warning in continuous mode - user might be pausing
        } else if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied');
          setIsListening(false);
        } else {
          toast.error('Voice input error: ' + event.error);
          setIsListening(false);
        }
      };
      
      recognitionInstance.onend = () => {
        // In continuous mode, only reset if user manually stopped
        // Otherwise, restart automatically
        if (!isListening) {
          setIsListening(false);
        }
      };
      
      setRecognition(recognitionInstance);
      setIsSupported(true);
    } else {
      setIsSupported(false);
      console.warn('Speech recognition not supported in this browser');
    }
  }, [onTranscript, currentTranscript, isListening]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error('Voice input not supported in your browser');
      return;
    }

    if (isListening) {
      // User manually stopped - stop recognition and finalize transcript
      recognition.stop();
      setIsListening(false);
      toast.success('Voice input stopped!');
      setCurrentTranscript(''); // Reset for next time
    } else {
      // Start listening
      try {
        setCurrentTranscript(''); // Clear previous transcript
        recognition.start();
        setIsListening(true);
        toast.info('🎤 Listening... Click again to stop', { autoClose: 2000 });
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsListening(false); // Ensure state resets on error
        toast.error('Failed to start microphone');
      }
    }
  };

  if (!isSupported) {
    return null; // Hide if not supported
  }

  return (
    <button
      onClick={toggleListening}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${
        isListening
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isListening ? 'Stop listening' : 'Voice input'}
    >
      {isListening ? <MicOff size={18} className="lg:w-5 lg:h-5" /> : <Mic size={18} className="lg:w-5 lg:h-5" />}
    </button>
  );
};

export default VoiceInput;

