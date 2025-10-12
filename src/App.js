import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Play,
  Terminal,
  FileText,
  Folder,
  Plus,
  FolderPlus,
  X,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Zap,
  Send,
  MessageSquare,
  Cpu,
  Box
} from 'lucide-react';
import './App.css';

// --- MOCK DATA & UTILS ---

const languages = [
  {
    id: 'python',
    name: 'Python',
    extension: '.py',
    defaultCode:
      'def fib(n):\n\tif n <= 1:\n\t\treturn n\n\treturn fib(n-1) + fib(n-2)\n\nresult = fib(5)\nprint(f"Fib(5): {result}")'
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    defaultCode:
      'function greet(name) {\n\tconst message = `Hello, ${name}!`\n\tconsole.log(message);\n\treturn message.length;\n}\n\ngreet("World");'
  },
  {
    id: 'java',
    name: 'Java',
    extension: '.java',
    defaultCode:
      'public class Main {\n\tpublic static void main(String[] args) {\n\t\tint[] arr = {4, 1, 9, 2};\n\t\tint sum = 0;\n\t\tfor(int x : arr) {\n\t\t\tsum += x;\n\t\t}\n\t\tSystem.out.println("Array Sum: " + sum);\n\t}\n}'
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: '.cpp',
    defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n\tcout << "Hello World!" << endl;\n\treturn 0;\n}'
  }
];

const getFlowSteps = (language) => {
  return language === 'java' || language === 'cpp'
    ? [
        { id: 1, name: 'Source Code', icon: '📄', details: 'Code prepared for compilation.' },
        { id: 2, name: 'Compilation', icon: '⚙️', details: 'Translated to machine/bytecode.' },
        { id: 3, name: 'Linking/Loading', icon: '📦', details: 'Libraries connected, loaded into memory.' },
        { id: 4, name: 'Execution', icon: '▶️', details: 'VM/OS runs the executable.' },
        { id: 5, name: 'Output', icon: '📺', details: 'Results sent to console.' }
      ]
    : [
        { id: 1, name: 'Source Code', icon: '📄', details: 'Code prepared for execution.' },
        { id: 2, name: 'Interpretation', icon: '⚙️', details: 'Line-by-line or JIT compiled.' },
        { id: 3, name: 'Memory Allocation', icon: '📦', details: 'Variables assigned stack/heap space.' },
        { id: 4, name: 'Execution', icon: '▶️', details: 'Runtime executes instructions.' },
        { id: 5, name: 'Output', icon: '📺', details: 'Results sent to console.' }
      ];
};

// --- AI API & VISUALIZATION LOGIC ---

const callAIAPI = async (messages) => {
  const apiKey = "AIzaSyCYDkTZgh13GV7d1-QR8Bq3YbjNNvcllmY"; // Replace with your actual key
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
  const contents = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
  }));
  const payload = { contents };
  try {
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response.";
  } catch (err) {
      console.error("AI API call failed:", err);
      return "### AI Assistant Failed\nCould not connect to the service. Please check your API key and network connection.";
  }
};

const callAIVisualize = async (code, language) => {
    // 1. Define the API Key and URL (as you have in callAIAPI)
    const apiKey = "AIzaSyCYDkTZgh13GV7d1-QR8Bq3YbjNNvcllmY"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // 2. Create a powerful, specific prompt for the AI
    const prompt = `
        You are a code execution visualizer. Your task is to analyze the provided code snippet and break it down into a series of execution steps. 
        For each step, describe what is happening and show the state of the key variables.
        The user's code is in the language: ${language}.
        
        Code to analyze:
        \`\`\`${language}
        ${code}
        \`\`\`

        Respond with ONLY a valid JSON array of objects. Do not include any other text, explanations, or markdown formatting like \`\`\`json.
        Each object in the array represents one execution step and must have the following structure:
        {
          "explanation": "A concise, present-tense explanation of what happens in this step.",
          "line_highlight": <line_number>,
          "variables": [
            { "name": "<var_name>", "value": "<var_value>" },
            { "name": "<var_name>", "value": "<var_value>" }
          ]
        }
        
        Example for a loop:
        - Step 1: Variable 'sum' is initialized.
        - Step 2: Loop starts, 'i' is 0.
        - Step 3: 'sum' is updated with the value of arr[0].
        - Step 4: 'i' increments to 1.
        - Step 5: 'sum' is updated with the value of arr[1].
        - etc.
        
        Analyze the provided code and generate the JSON array. If the code is not suitable for visualization (e.g., has syntax errors, is too complex, or doesn't have a clear execution flow like a simple "Hello World"), return an empty array [].
    `;

    // 3. Construct the payload for the Gemini API
    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        // Add safety settings and generation config for better JSON output
        safetySettings: [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ],
        generationConfig: {
            "responseMimeType": "application/json",
        }
    };

    // 4. Make the API call and handle the response
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("API Error Response:", await response.text());
            return "API_ERROR";
        }

        const result = await response.json();
        const aiResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiResponseText) {
             return []; // No valid steps returned
        }

        // The AI should return valid JSON directly, so we can parse it
        return JSON.parse(aiResponseText);

    } catch (err) {
        console.error("Failed to visualize code:", err);
        return "PARSE_ERROR"; // Return an error state
    }
};

// --- UI COMPONENTS ---

const ThemeToggle = ({ theme, toggleTheme }) => (
  <motion.button
    onClick={toggleTheme}
    className="theme-toggle-btn"
    whileHover={{ scale: 1.1, rotate: 180 }}
    whileTap={{ scale: 0.95 }}
  >
    {theme === 'dark' ? (
      <Sun className="w-5 h-5 text-yellow-400" />
    ) : (
      <Moon className="w-5 h-5 text-gray-700" />
    )}
  </motion.button>
);

const LanguageSelector = ({ languages, selectedLanguage, onLanguageChange }) => (
  <motion.select
    value={selectedLanguage}
    onChange={(e) => onLanguageChange(e.target.value)}
    className="language-select"
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
  >
    {languages.map((lang) => (
      <option key={lang.id} value={lang.id}>
        {lang.name}
      </option>
    ))}
  </motion.select>
);

const CodeEditor = ({ value, onChange }) => (
  <motion.textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="code-editor"
    placeholder="Write your code here..."
    spellCheck={false}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2 }}
  />
);

const CodeRunner = ({ isRunning, onRun }) => (
  <motion.button
    onClick={onRun}
    disabled={isRunning}
    className="run-button"
    whileHover={!isRunning ? { scale: 1.02 } : {}}
    whileTap={!isRunning ? { scale: 0.98 } : {}}
    animate={!isRunning ? { scale: [1, 1.02, 1] } : {}}
    transition={!isRunning ? { duration: 2, repeat: Infinity } : {}}
  >
    {isRunning ? (
      <>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="spinner"
        />
        Executing...
      </>
    ) : (
      <>
        <Play className="w-4 h-4" />
        Run Code
      </>
    )}
  </motion.button>
);

const AIDebugger = ({ isLoading, onDebug }) => (
  <motion.button
    onClick={onDebug}
    disabled={isLoading}
    className="ai-button"
    whileHover={!isLoading ? { scale: 1.02 } : {}}
    whileTap={!isLoading ? { scale: 0.98 } : {}}
  >
    {isLoading ? (
      <>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="spinner"
        />
        Analyzing...
      </>
    ) : (
      <>
        <Zap className="w-4 h-4" />
        AI Debug
      </>
    )}
  </motion.button>
);

const TerminalPanel = ({ result, isRunning, hasError }) => (
  <motion.div
    className="terminal-panel"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
  >
    <div className="terminal-header">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-400">Console Output</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono status-text">
          {isRunning ? 'Running' : hasError ? 'Error' : result ? 'Complete' : 'Idle'}
        </span>
        <motion.div
          className="status-dot"
          animate={isRunning ? { scale: [1, 1.5, 1] } : {}}
          transition={isRunning ? { duration: 0.6, repeat: Infinity } : {}}
          style={{
            background: isRunning ? '#f59e0b' : hasError ? '#ef4444' : result ? '#10b981' : '#9ca3af'
          }}
        />
      </div>
    </div>
    <div className="terminal-content">
      {isRunning ? (
        <div className="flex items-center gap-2 running-text">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
          />
          $ Executing code...
        </div>
      ) : result ? (
        <pre className={hasError ? 'error-text' : 'success-text'}>
          <span className="prompt-text">$ </span>
          {result}
        </pre>
      ) : (
        <div className="idle-text">
          <span className="prompt-text">$</span> Ready. Press 'Run Code' to execute.
        </div>
      )}
    </div>
  </motion.div>
);

const CodeFlowVisualizer = ({ language, isRunning }) => {
  const [activeStep, setActiveStep] = useState(0);
  const steps = getFlowSteps(language);

  useEffect(() => {
    let interval;
    if (isRunning) {
      setActiveStep(1);
      interval = setInterval(() => {
        setActiveStep((prev) => (prev >= 4 ? 4 : prev + 1));
      }, 800);
    } else {
      if (activeStep > 0) {
        setActiveStep(5);
        const timer = setTimeout(() => setActiveStep(0), 1000);
        return () => clearTimeout(timer);
      }
      setActiveStep(0);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <motion.div
      className="flow-visualizer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="flow-title">
        <Cpu className="w-4 h-4" />
        Code Execution Flow
      </h3>
      <div className="flow-steps">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = activeStep === stepNum;
          const isCompleted = stepNum < activeStep || (stepNum === steps.length && activeStep === 5);

          return (
            <motion.div
              key={step.id}
              className="flow-step"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <motion.div
                className={`flow-circle ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={isActive ? { duration: 0.6, repeat: Infinity } : {}}
              >
                {step.icon}
              </motion.div>
              <div className="flow-content">
                <p className={`flow-name ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}>
                  {step.name}
                </p>
                <AnimatePresence>
                  {isActive && (
                    <motion.p
                      className="flow-details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {step.details}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

const CodeVisualizerCard = ({ code, isVisualizing, currentStepData, totalSteps, currentStepIndex }) => {
    const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

    const renderContent = () => {
        if (isVisualizing) {
            return (
                <motion.div className="visualizer-spinner">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="spinner-circle"
                    />
                    <p>AI is analyzing your code...</p>
                </motion.div>
            );
        }

        if (currentStepData) {
            return (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStepIndex} // Keying this makes Framer Motion re-animate on change
                        className="diagram-container"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Main Explanation */}
                        <div className="explanation-box">
                            <p>{currentStepData.explanation}</p>
                        </div>
                        
                        {/* Variable State */}
                        {currentStepData.variables && currentStepData.variables.length > 0 && (
                             <div className="variables-box">
                                <h4 className="variables-title">Variable State</h4>
                                <motion.div layout className="variables-grid">
                                    {currentStepData.variables.map((variable, idx) => (
                                        <motion.div 
                                            key={variable.name} 
                                            className="variable-item"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.1 * idx }}
                                        >
                                            <span className="variable-name">{variable.name}</span>
                                            <span className="variable-value">{String(variable.value)}</span>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            );
        }

        // Empty/Default State
        return (
            <div className="visualizer-empty">
                <Box className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p>Type supported code (like loops or assignments) to see the AI visualization.</p>
            </div>
        );
    };

    return (
        <motion.div
            className="visualizer-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
        >
            <div className="visualizer-header">
                <h3 className="visualizer-title">
                    <Box className="w-4 h-4" />
                    AI Flow Visualizer
                </h3>
                {totalSteps > 0 && !isVisualizing && (
                    <div className="progress-container">
                        <div className="progress-bar">
                            <motion.div
                                className="progress-fill"
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <span className="progress-text">
                            Step {currentStepIndex + 1}/{totalSteps}
                        </span>
                    </div>
                )}
            </div>
            
            <div className="visualizer-content-area">
                {renderContent()}
            </div>

            {/* You can keep the code snapshot if you like */}
            <motion.pre className="code-snapshot">
                <code>{code.substring(0, 150)}{code.length > 150 && '...'}</code>
            </motion.pre>
        </motion.div>
    );
};
  
const AIPanel = ({ isOpen, onClose, messages, isAILoading, onSend }) => {
    const [userInput, setUserInput] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (userInput.trim() && !isAILoading) {
            onSend(userInput.trim());
            setUserInput('');
        }
    };
    
    // **NEW**: Improved function to parse and render messages with code blocks
    const renderMessageContent = (text) => {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Add the text before the code block
            if (match.index > lastIndex) {
                parts.push(<p key={lastIndex}>{text.substring(lastIndex, match.index)}</p>);
            }
            // Add the code block
            const language = match[1] || 'plaintext';
            const code = match[2];
            parts.push(
                <div key={match.index} className="code-block">
                    <div className="code-block-header">{language}</div>
                    <pre><code>{code}</code></pre>
                </div>
            );
            lastIndex = codeBlockRegex.lastIndex;
        }

        // Add any remaining text after the last code block
        if (lastIndex < text.length) {
            parts.push(<p key={lastIndex}>{text.substring(lastIndex)}</p>);
        }

        return parts;
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-panel"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    <div className="ai-header">
                       <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-400" />
                            <span className="text-lg font-medium text-blue-400">AI Assistant</span>
                        </div>
                        <motion.button onClick={onClose} className="close-btn" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>

                    <div className="ai-content">
                        {messages.length === 0 && !isAILoading ? (
                             <motion.div className="ai-welcome">
                                <Zap className="w-12 h-12 mx-auto mb-4 text-blue-400 opacity-50" />
                                <p className="ai-welcome-title">AI Code Assistant</p>
                                <p className="ai-welcome-text">
                                    Click 'AI Debug' to analyze your code, ask questions, or get suggestions.
                                </p>
                            </motion.div>
                        ) : (
                             <div className="chat-history">
                                {messages.map((msg, index) => (
                                    <motion.div
                                        key={index}
                                        className={`chat-message-wrapper ${msg.sender === 'ai' ? 'ai' : 'user'}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <div className="chat-bubble">
                                           {/* Use the new rendering function */}
                                           {renderMessageContent(msg.text)}
                                        </div>
                                    </motion.div>
                                ))}
                                {isAILoading && (
                                     <motion.div className="chat-message-wrapper ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                         <div className="chat-bubble">
                                            <div className="typing-indicator">
                                                <span></span><span></span><span></span>
                                            </div>
                                         </div>
                                     </motion.div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>

                    <div className="ai-input">
                        <input
                            type="text"
                            placeholder={isAILoading ? "AI is thinking..." : "Ask a follow-up..."}
                            className="ai-input-field"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isAILoading}
                        />
                        <motion.button
                            onClick={handleSend}
                            className="ai-send-btn"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={!userInput.trim() || isAILoading}
                        >
                            <Send className="w-5 h-5" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [code, setCode] = useState(languages.find((l) => l.id === 'java').defaultCode);
  const [result, setResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isFlowRunning, setIsFlowRunning] = useState(false);

  // Visualization State
  const [visualizationSteps, setVisualizationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const debounceTimer = useRef(null);

  const prepareCodeForBackend = useCallback((code) => code.replace(/\\/g, ''), []);
  const addMessage = useCallback((message) => setMessages(prev => [...prev, message]), []);


const visualizeCode = useCallback(async (currentCode) => {
  if (!currentCode.trim()) {
    setVisualizationSteps([]);
    setCurrentStepIndex(0); // Reset index
    return;
  }
  setIsVisualizing(true);
  // Pass the code AND the selected language
  const response = await callAIVisualize(prepareCodeForBackend(currentCode), selectedLanguage);

  if (Array.isArray(response)) {
    setVisualizationSteps(response);
    // Start from the first step
    setCurrentStepIndex(0); 
  } else {
    // Handle error cases or unsupported code
    console.error("Visualization failed:", response);
    setVisualizationSteps([]);
    setCurrentStepIndex(0);
  }
  setIsVisualizing(false);
}, [prepareCodeForBackend, selectedLanguage]); 

 useEffect(() => {
  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    visualizeCode(code); 
  }, 1500); 
  return () => clearTimeout(debounceTimer.current);
}, [code, visualizeCode]);

  useEffect(() => {
    let interval;
    // Only start the animation if we have steps and we are not currently running the code
    if (visualizationSteps.length > 0 && !isVisualizing && !isRunning) {
        interval = setInterval(() => {
            setCurrentStepIndex(prev => (prev + 1) % visualizationSteps.length);
        }, 2500);
    }
    // When steps change, reset to the beginning
    else if (visualizationSteps.length > 0) {
       setCurrentStepIndex(0);
    }
    return () => clearInterval(interval);
}, [visualizationSteps, isVisualizing, isRunning]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  const handleExecutionStart = () => setIsFlowRunning(true);
  const handleExecutionComplete = () => setTimeout(() => setIsFlowRunning(false), 500);
  const handleResult = (newResult, error) => {
    setResult(newResult);
    setHasError(error);
  };

  const handleRun = async () => {
    setIsRunning(true);
    handleResult('', false);
    handleExecutionStart();

    try {
        const codeToSend = prepareCodeForBackend(code);
        const requestData = {
            language: selectedLanguage,
            code: codeToSend,
        };

        const apiUrl ='http://localhost:8080/run';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const resultData = await response.json();
        const isBackendError = resultData.error || (resultData.output && (resultData.output.includes("Error:") || resultData.output.includes("Compilation Error:")));

        if (isBackendError) {
            handleResult(resultData.output, true);
        } else {
            handleResult(resultData.output, false);
        }
    } catch (err) {
        handleResult(
            `Failed to connect to backend: ${err.message}. Please ensure the execution environment is running.`,
            true
        );
    } finally {
        handleExecutionComplete();
        setIsRunning(false);
    }
  };


  const sendFollowUp = async (userText) => {
    addMessage({ sender: 'user', text: userText });
    setIsAILoading(true);
    const aiResponse = await callAIAPI([...messages, { sender: 'user', text: userText }]);
    addMessage({ sender: 'ai', text: aiResponse });
    setIsAILoading(false);
  };

  const handleAIDebug = async () => {
    setIsAIOpen(true);
    setIsAILoading(true);
    const initialQuery = `Review the following ${selectedLanguage} code and provide debugging tips and improvements:\n\n\`\`\`${selectedLanguage}\n${code}\n\`\`\``;
    const firstUserMessage = { sender: 'user', text: `Please review my ${selectedLanguage} code.` };
    
    setMessages([firstUserMessage]);

    const aiResponse = await callAIAPI([{ sender: 'user', text: initialQuery }]);
    addMessage({ sender: 'ai', text: aiResponse });
    setIsAILoading(false);
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    const newLang = languages.find((l) => l.id === lang);
    setCode(newLang.defaultCode);
    setResult('');
    setHasError(false);
    setMessages([]);
    setVisualizationSteps([]);
    setCurrentStepIndex(-1);
  };
  
  const currentStepData = visualizationSteps[currentStepIndex];

  return (
    <div className="app-container">
      <motion.header
        className="app-header"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="header-content" whileHover={{ scale: 1.02 }}>
          <Code2 className="w-6 h-6 text-blue-400" />
          <h1 className="header-title">Your Own Compiler</h1>
        </motion.div>
        <div className="header-right">
          <span className="header-subtitle">Universal Code Executor</span>
          <ThemeToggle theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        </div>
      </motion.header>

      <div className="main-content">
        <motion.aside
          className="sidebar"
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.div className="sidebar-card" whileHover={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}>
            <label className="card-label">Select Language</label>
            <LanguageSelector
              languages={languages}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />
          </motion.div>

          <motion.div
            className="button-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="button-item">
              <label className="card-label">Run Code</label>
              <CodeRunner isRunning={isRunning} onRun={handleRun} />
            </div>
            <div className="button-item">
              <label className="card-label">AI Review</label>
              <AIDebugger isLoading={isAILoading} onDebug={handleAIDebug} />
            </div>
          </motion.div>

          <CodeFlowVisualizer language={selectedLanguage} isRunning={isFlowRunning} />

          <CodeVisualizerCard
            code={code}
            isVisualizing={isVisualizing}
            currentStepData={currentStepData}
            totalSteps={visualizationSteps.length}
            currentStepIndex={currentStepIndex}
          />
          
          <motion.div className="sidebar-card">
            <h3 className="card-detail-title">
              <FileText className="w-4 h-4" />
              Details
            </h3>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">Language:</span>
                <span className="detail-value">{languages.find((l) => l.id === selectedLanguage)?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Extension:</span>
                <span className="detail-value">{languages.find((l) => l.id === selectedLanguage)?.extension}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Lines:</span>
                <span className="detail-value">{code.split('\n').length}</span>
              </div>
            </div>
          </motion.div>
        </motion.aside>

        <motion.main
          className="editor-main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="editor-header">
            <div className="header-dots">
              <motion.div className="dot red" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <motion.div className="dot yellow" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} />
              <motion.div className="dot green" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} />
            </div>
            <span className="editor-label">
              {languages.find((l) => l.id === selectedLanguage)?.name} Editor
            </span>
            <div className="editor-stats">
              Lines: {code.split('\n').length} | Chars: {code.length}
            </div>
          </div>
          <div className="editor-wrapper">
            <CodeEditor value={code} onChange={setCode} />
          </div>
          <div className="terminal-wrapper">
            <TerminalPanel result={result} isRunning={isRunning} hasError={hasError} />
          </div>
        </motion.main>

        <AIPanel
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            messages={messages}
            isAILoading={isAILoading}
            onSend={sendFollowUp}
        />
      </div>
    </div>
  );
}