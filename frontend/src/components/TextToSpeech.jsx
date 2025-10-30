import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { toast } from 'react-toastify';

const TextToSpeech = ({ text, autoPlay = false }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    if (autoPlay && text && isSupported) {
      speak();
    }
  }, [text, autoPlay]);

  const speak = () => {
    if (!isSupported) {
      toast.error('Text-to-speech not supported in your browser');
      return;
    }

    if (!text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Remove markdown formatting for better speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'code block') // Replace code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code markers
      .replace(/[#*_>\[\]]/g, '') // Remove markdown symbols
      .replace(/\n+/g, '. '); // Replace newlines with periods

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

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
    window.speechSynthesis.cancel();
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

