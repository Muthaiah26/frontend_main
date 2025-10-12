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

const callAIVisualize = async (code) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const allSteps = [];
    const activeStyle = { background: '#3b82f6', color: 'white' };
    const stepStyle = { background: '#6b7280', color: 'white' };
    const startStyle = { background: '#10b981', color: 'white' };
    const endStyle = { background: '#ef4444', color: 'white' };

    if (code.includes("sum +=") && (code.includes("int[] arr") || code.includes("arr = ["))) {
        let arrData = code.match(/(\[|\{)\s*(\d+\s*,\s*)*\d+\s*(\]|\})/)?.[0]?.match(/\d+/g)?.map(Number) || [4, 1, 9, 2];
        let currentSum = 0;
        allSteps.push({
            nodes: [
                { id: 'S1', data: { label: 'Start' }, position: { x: 100, y: 0 }, style: startStyle },
                { id: 'A', data: { label: `Init: sum = 0` }, position: { x: 100, y: 70 }, style: activeStyle },
            ]
        });
        arrData.forEach((element, index) => {
            const previousSum = currentSum;
            currentSum += element;
            allSteps.push({
                nodes: [
                    { id: 'S1', data: { label: 'Start' }, position: { x: 100, y: 0 }, style: startStyle },
                    { id: 'A', data: { label: 'Init Done' }, position: { x: 100, y: 70 }, style: stepStyle },
                    { id: `C${index}`, data: { label: `sum = ${previousSum} + ${element}` }, position: { x: 100, y: 140 }, style: activeStyle },
                ]
            });
        });
        allSteps.push({
            nodes: [
                { id: 'S1', data: { label: 'Start' }, position: { x: 100, y: 0 }, style: stepStyle },
                { id: 'End', data: { label: `Output: Sum is ${currentSum}` }, position: { x: 100, y: 70 }, style: endStyle },
            ]
        });
    } else {
        return "Not a supported structure";
    }
    return allSteps;
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
          {totalSteps > 0 && (
            <div className="progress-container">
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="progress-text">
                {currentStepIndex + 1}/{totalSteps}
              </span>
            </div>
          )}
        </div>
  
        {isVisualizing ? (
          <motion.div className="visualizer-spinner">
             <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="spinner-circle"
            />
            <p>Analyzing Code...</p>
          </motion.div>
        ) : currentStepData ? (
          <motion.div
            key={currentStepIndex}
            className="diagram-container"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="diagram-content">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
              >
                {currentStepData.nodes.map((node, idx) => (
                  <motion.div
                    key={node.id}
                    className="diagram-node"
                    style={{ background: node.style.background, color: node.style.color }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1, type: 'spring', stiffness: 400 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {node.data.label}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <div className="visualizer-empty">
            <Box className="w-8 h-8 mx-auto mb-2 text-gray-500"/>
            <p>AI visualization will appear for supported code patterns (e.g., array loops).</p>
            </div>
        )}
  
        <motion.pre
          className="code-snapshot"
        >
          <code>{code.substring(0, 150)}{code.length > 150 && '...'}</code>
        </motion.pre>
      </motion.div>
    );
};
  
const AIPanel = ({ isOpen, onClose, messages, isAILoading, onSend }) => {
    const [userInput, setUserInput] = useState('');
    const chatEndRef = useRef(null);
    const hasConversation = messages.length > 0;
  
    useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
  
    const handleSend = () => {
      if (userInput.trim() && !isAILoading) {
        onSend(userInput.trim());
        setUserInput('');
      }
    };
  
    const renderMessage = (msg, index) => {
      const isAI = msg.sender === 'ai';
      return (
        <motion.div
          key={index}
          className={`chat-message ${isAI ? 'ai' : 'user'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="message-header">
            {isAI ? <Zap className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            <span>{isAI ? 'AI Assistant' : 'You'}</span>
          </div>
          <div className="message-content" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}/>
        </motion.div>
      );
    };
  
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ai-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="ai-header">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">AI Assistant</span>
              </div>
              <motion.button onClick={onClose} className="close-btn" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <X className="w-4 h-4" />
              </motion.button>
            </div>
  
            <div className="ai-content">
              {!hasConversation && !isAILoading ? (
                <motion.div
                  className="ai-welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Zap className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <p className="ai-welcome-title">AI Code Assistant</p>
                  <p className="ai-welcome-text">
                    Click 'AI Debug' to start a conversation about your code.
                  </p>
                </motion.div>
              ) : (
                <div className="chat-history">
                  {messages.map(renderMessage)}
                  {isAILoading && (
                    <motion.div className="chat-message ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                       <div className="message-header"><Zap className="w-4 h-4"/><span>AI Assistant</span></div>
                       <div className="message-content flex items-center gap-2">
                         <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                         <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                         <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                       </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
              )}
            </div>
  
            <div className="ai-input">
              <input
                type="text"
                placeholder={hasConversation ? "Ask a follow-up..." : "Start with AI Debug"}
                className="ai-input-field"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={!hasConversation || isAILoading}
              />
              <motion.button
                onClick={handleSend}
                className="ai-send-btn"
                whileHover={{ scale: 1.05 }}
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
        setCurrentStepIndex(-1);
        return;
    }
    setIsVisualizing(true);
    const response = await callAIVisualize(prepareCodeForBackend(currentCode));
    if (Array.isArray(response)) {
        setVisualizationSteps(response);
        setCurrentStepIndex(0);
    } else {
        setVisualizationSteps([]);
        setCurrentStepIndex(-1);
    }
    setIsVisualizing(false);
  }, [prepareCodeForBackend]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
        visualizeCode(code);
    }, 2000);
    return () => clearTimeout(debounceTimer.current);
  }, [code, visualizeCode]);

  useEffect(() => {
    let interval;
    if (visualizationSteps.length > 0 && !isRunning) {
        interval = setInterval(() => {
            setCurrentStepIndex(prev => (prev + 1) % visualizationSteps.length);
        }, 2500);
    }
    return () => clearInterval(interval);
  }, [visualizationSteps, isRunning]);

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