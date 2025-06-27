'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Sample question suggestions
const QUESTION_SUGGESTIONS = [
  "What are the main topics covered in the documents?",
  "Summarize the key findings from some policies",
  "What is shift allowance policy?",
  "Explain the different policies"
];

export default function ChatPage() {
  const router = useRouter();
  const [chatPages, setChatPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef(null);

  // Speech recognition state
  const [listening, setListening] = useState(false);
  const [browserSupportsRecognition, setBrowserSupportsRecognition] = useState(false);
  const recognitionRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);

  // Handle mounting and speech recognition initialization
  useEffect(() => {
    setMounted(true);
    
    // Check for browser speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setBrowserSupportsRecognition(true);
    }
  }, []);

  // Load chat pages from localStorage on component mount
  useEffect(() => {
    if (!mounted) return;

    const savedPages = localStorage.getItem('chatPages');
    if (savedPages) {
      const pages = JSON.parse(savedPages);
      setChatPages(pages);
      if (pages.length > 0) {
        const lastPage = pages[pages.length - 1];
        setCurrentPageId(lastPage.id);
        setMessages(lastPage.messages || []);
      }
    } else {
      // Create first page if none exist
      createNewPage();
    }
  }, [mounted]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save pages to localStorage whenever chatPages changes
  useEffect(() => {
    if (chatPages.length > 0 && mounted) {
      localStorage.setItem('chatPages', JSON.stringify(chatPages));
    }
  }, [chatPages, mounted]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen bg-zinc-900 text-white items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const createNewPage = () => {
    const newPage = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    setChatPages(prev => [...prev, newPage]);
    setCurrentPageId(newPage.id);
    setMessages([]);
    setInputValue('');
  };

  const deletePage = (pageId) => {
    const updatedPages = chatPages.filter(page => page.id !== pageId);
    setChatPages(updatedPages);
    
    if (pageId === currentPageId) {
      if (updatedPages.length > 0) {
        const newCurrentPage = updatedPages[updatedPages.length - 1];
        setCurrentPageId(newCurrentPage.id);
        setMessages(newCurrentPage.messages || []);
      } else {
        createNewPage();
      }
    }
  };

  const selectPage = (pageId) => {
    const page = chatPages.find(p => p.id === pageId);
    if (page) {
      setCurrentPageId(pageId);
      setMessages(page.messages || []);
    }
  };

  const updatePageTitle = (pageId, title) => {
    setChatPages(prev => 
      prev.map(page => 
        page.id === pageId 
          ? { ...page, title: title.slice(0, 50) } 
          : page
      )
    );
  };

  const updatePageMessages = (pageId, newMessages) => {
    setChatPages(prev => 
      prev.map(page => 
        page.id === pageId 
          ? { ...page, messages: newMessages } 
          : page
      )
    );
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    setListening(false);
  };

  const handleVoiceInput = async () => {
    if (!browserSupportsRecognition) {
      alert('Your browser does not support speech recognition. Please try Chrome, Safari, or Edge.');
      return;
    }

    if (listening) {
      stopListening();
      return;
    }

    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately after permission check

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      // Configure recognition settings for better performance
      recognition.continuous = false; // Don't continue after user stops talking
      recognition.interimResults = true; // Show results as user speaks
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let hasSpoken = false;

      recognition.onstart = () => {
        console.log('Voice recognition started');
        setListening(true);
        
        // Set a maximum duration timer (15 seconds)
        recognitionTimeoutRef.current = setTimeout(() => {
          stopListening();
        }, 15000);
      };
      
      recognition.onresult = (event) => {
        hasSpoken = true;
        let interimTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update input with current transcript (show interim results)
        const currentText = (finalTranscript + interimTranscript).trim();
        setInputValue(currentText);
      };

      recognition.onnomatch = () => {
        console.log('No speech was recognized');
        if (!hasSpoken) {
          setInputValue('');
        }
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setListening(false);
        recognitionRef.current = null;
        
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }
        
        // Clean up the final transcript
        if (finalTranscript.trim()) {
          setInputValue(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
        recognitionRef.current = null;
        
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
          recognitionTimeoutRef.current = null;
        }
        
        // Handle specific errors
        switch (event.error) {
          case 'no-speech':
            if (!hasSpoken) {
              console.log('No speech detected - keeping current input');
            }
            break;
          case 'not-allowed':
            alert('Microphone access denied. Please allow microphone access and try again.');
            break;
          case 'network':
            alert('Network error occurred. Please check your internet connection.');
            break;
          case 'aborted':
            console.log('Speech recognition was aborted');
            break;
          default:
            console.log('Speech recognition error:', event.error);
        }
      };
      
      // Start recognition
      recognition.start();
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setListening(false);
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        alert('Failed to access microphone. Please check your browser settings.');
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updatePageMessages(currentPageId, newMessages);

    // Update page title if it's the first message
    const currentPage = chatPages.find(p => p.id === currentPageId);
    if (currentPage && currentPage.title === 'New Chat') {
      updatePageTitle(currentPageId, inputValue);
    }

    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: inputValue }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.answer,
        context: data.context,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      updatePageMessages(currentPageId, finalMessages);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Failed to get response. Please check if the server is running and documents are ingested.',
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      updatePageMessages(currentPageId, finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentPage = chatPages.find(p => p.id === currentPageId);

  return (
    <>
      <Head>
        <title>Document Chat</title>
        <meta name="description" content="Chat with your documents" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen bg-zinc-900 text-white">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-black-800 border-r border-zinc-700 flex flex-col overflow-hidden`}>
          <div className="p-4 border-b border-zinc-700">
            <h2 className="text-2xl font-bold italic text-white mb-4">
              Policy<span className="text-blue-400">Pal</span>📝
            </h2>
            <button
              onClick={createNewPage}
              className="w-full bg-sky-700 hover:bg-sky-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-bold"
            >
              <span>+</span>
              New Chat
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {chatPages.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-400 px-2 mb-2">Recents</h3>
              </div>
            )}
            {chatPages.slice().reverse().map((page) => (
              <div
                key={page.id}
                className={`group flex items-center justify-between p-2 mb-2 rounded-lg cursor-pointer transition-colors ${
                  page.id === currentPageId ? 'bg-zinc-700' : 'bg-black-800 hover:bg-zinc-700'
                }`}
                onClick={() => selectPage(page.id)}
              >
                <div className="flex-1 truncate">
                  <div className="text-sm font-medium truncate">{page.title}</div>
                  {/* <div className="text-xs text-zinc-400">
                    {page.messages.length} messages
                  </div> */}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(page.id);
                  }}
                  className="
                    opacity-0 group-hover:opacity-100 
                    text-zinc-400 
                    hover:text-red-400 
                    transition-all 
                    p-1
                    w-8 h-8
                    flex items-center justify-center
                    text-xl
                    rounded-lg
                    hover:bg-zinc-800
                    hover:shadow
                  "
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-zinc-700">
            <button
              onClick={() => router.push('/ingest')}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white p-2 rounded-lg transition-colors"
            >
              Ingest Documents
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-zinc-800 border-b border-zinc-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                ☰
              </button>
              <h1 className="text-lg font-semibold">
                {currentPage?.title || 'Document Chat'}
              </h1>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-zinc-400">
                <div className="mt-20 mb-8">
                  <h2 className="text-2xl text-sky-600 font-bold mb-4">What can I help with?</h2>
                  <p>Ask questions about our policies..😊</p>
                </div>
                
                {/* Question Suggestions */}
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-md font-medium mb-4 text-zinc-300">Tap below:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {QUESTION_SUGGESTIONS.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-left p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all duration-200 text-zinc-300 hover:text-white"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-sky-400 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-sky-600 text-white'
                        : message.type === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-700 text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.context && (
                      <details className="mt-2 opacity-75">
                        <summary className="cursor-pointer text-sm">View Context</summary>
                        <div className="mt-2 text-xs bg-zinc-600 p-2 rounded max-h-32 overflow-y-auto">
                          {message.context}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-700 text-white p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-zinc-700 p-4">
            <div className="flex gap-4 items-center">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything..."
                className="flex-1 bg-zinc-800 text-white border border-zinc-600 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                rows={1}
                disabled={isLoading}
              />
              {/* Voice Button - only show if browser supports it */}
              {browserSupportsRecognition && (
                <button
                  onClick={handleVoiceInput}
                  className={`
                    flex items-center justify-center
                    w-12 h-12
                    rounded-full
                    transition-all duration-200
                    border-2
                    ${listening
                      ? 'bg-red-600 border-red-700 animate-pulse shadow-lg shadow-red-500/25'
                      : 'bg-zinc-700 border-zinc-600 hover:bg-sky-700 hover:border-sky-600'}
                    text-white
                    focus:outline-none
                    focus:ring-2
                    focus:ring-sky-500
                  `}
                  aria-label={listening ? "Stop voice input" : "Start voice input"}
                  disabled={isLoading}
                >
                  {listening ? (
                    // Stop/Recording icon when listening
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    // Microphone icon when not listening
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-sky-600 hover:bg-sky-700 disabled:bg-zinc-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}