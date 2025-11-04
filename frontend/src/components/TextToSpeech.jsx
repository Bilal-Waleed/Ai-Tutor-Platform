import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { toast } from 'react-toastify';

const TextToSpeech = ({ text, autoPlay = false }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef(null); // Track this component's utterance

  useEffect(() => {
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      
      // Load voices (some browsers need this)
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      
      // Load voices on mount and when voices change
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
    
    // Cleanup: Stop speech when component unmounts (page change, chat change, etc.)
    return () => {
      // Only cancel if THIS component started speech
      if (window.speechSynthesis && utteranceRef.current) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(() => {
    if (!isSupported) {
      toast.error('Text-to-speech not supported in your browser');
      return;
    }

    if (!text) {
      console.warn('TextToSpeech: No text provided');
      return;
    }

    // Cancel any ongoing speech from THIS component
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
    }

    // Remove markdown formatting for better speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'code block') // Replace code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code markers
      .replace(/[#*_>\[\]]/g, '') // Remove markdown symbols
      .replace(/\n+/g, '. '); // Replace newlines with periods

    if (!cleanText.trim()) {
      console.warn('TextToSpeech: Clean text is empty');
      return;
    }

    // Split text into chunks if too long (browser limit is ~32k chars, we use 200 chars for safety)
    const MAX_CHUNK_LENGTH = 200;
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > MAX_CHUNK_LENGTH && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    console.log(`TextToSpeech: Split into ${chunks.length} chunks`);

    // Speak first chunk
    const utterance = new SpeechSynthesisUtterance(chunks[0]);
    
    // Store reference to this utterance
    utteranceRef.current = utterance;
    
    // Get available voices (with retry for browser compatibility)
    let voices = window.speechSynthesis.getVoices();
    
    // Some browsers need a moment to load voices
    if (voices.length === 0) {
      window.speechSynthesis.getVoices(); // Trigger voice loading
      voices = window.speechSynthesis.getVoices();
    }
    
    // Try to find the best voice for Roman Urdu
    // Priority: Hindi > Urdu > English(India) > English(UK) > English(US)
    let selectedVoice = voices.find(voice => voice.lang.includes('hi')) || // Hindi
                       voices.find(voice => voice.lang.includes('ur')) || // Urdu
                       voices.find(voice => voice.lang === 'en-IN') ||    // English India
                       voices.find(voice => voice.lang === 'en-GB') ||    // English UK (clearer pronunciation)
                       voices.find(voice => voice.lang === 'en-US');      // English US fallback
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      // Fallback to en-US if no voice found
      utterance.lang = 'en-US';
    }
    
    // Slower rate for better comprehension of Roman Urdu
    utterance.rate = 0.85; // Much slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    let currentChunkIndex = 0;

    utterance.onstart = () => {
      console.log('TextToSpeech: Speech started - chunk', currentChunkIndex + 1, 'of', chunks.length);
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      console.log('TextToSpeech: Chunk', currentChunkIndex + 1, 'ended');
      currentChunkIndex++;
      
      // If there are more chunks, speak the next one
      if (currentChunkIndex < chunks.length) {
        const nextUtterance = new SpeechSynthesisUtterance(chunks[currentChunkIndex]);
        
        // Copy settings
        nextUtterance.voice = utterance.voice;
        nextUtterance.lang = utterance.lang;
        nextUtterance.rate = utterance.rate;
        nextUtterance.pitch = utterance.pitch;
        nextUtterance.volume = utterance.volume;
        
        // Copy event handlers (recursive)
        nextUtterance.onstart = utterance.onstart;
        nextUtterance.onend = utterance.onend;
        nextUtterance.onerror = utterance.onerror;
        
        utteranceRef.current = nextUtterance;
        window.speechSynthesis.speak(nextUtterance);
      } else {
        // All chunks done
        console.log('TextToSpeech: All chunks completed');
        setIsSpeaking(false);
        setIsPaused(false);
        utteranceRef.current = null;
      }
    };

    utterance.onerror = (event) => {
      console.error('TextToSpeech error:', event.error, event);
      // Only show toast for critical errors
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        toast.error(`Speech error: ${event.error}`);
      }
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    console.log('TextToSpeech: Starting speech with voice:', selectedVoice?.name || 'default', '- Total chunks:', chunks.length);
    window.speechSynthesis.speak(utterance);
  }, [text, isSupported]);

  // Stop speech on browser refresh, close, or tab switch
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    const handleVisibilityChange = () => {
      // Stop speech when user switches to another tab (only if this component is speaking)
      if (document.hidden && window.speechSynthesis && window.speechSynthesis.speaking && utteranceRef.current) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
        setIsSpeaking(false);
        setIsPaused(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (autoPlay && text && isSupported) {
      speak();
    }
    
    // Cleanup: Only stop THIS component's speech when it unmounts or text changes
    return () => {
      // Only cancel if THIS component is speaking
      if (utteranceRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
        setIsSpeaking(false);
        setIsPaused(false);
      }
    };
  }, [text, autoPlay, isSupported, speak]);

  const pause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stop = () => {
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  if (!isSupported) {
    return null; // Hide if not supported
  }

  return (
    <div className="flex items-center space-x-1">
      {!isSpeaking ? (
        <button
          onClick={speak}
          className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded"
          title="Listen to response"
        >
          <Volume2 size={14} />
        </button>
      ) : (
        <>
          {isPaused ? (
            <button
              onClick={resume}
              className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors rounded"
              title="Resume"
            >
              <Play size={14} />
            </button>
          ) : (
            <button
              onClick={pause}
              className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors rounded"
              title="Pause"
            >
              <Pause size={14} />
            </button>
          )}
          <button
            onClick={stop}
            className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded"
            title="Stop"
          >
            <VolumeX size={14} />
          </button>
        </>
      )}
    </div>
  );
};

export default TextToSpeech;

