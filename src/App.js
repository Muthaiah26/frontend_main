import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Code2, Play, Terminal, FileText, Folder, Plus, FolderPlus, X, ChevronRight, ChevronDown, Sun, Moon, Zap, ChevronLeft, Send, MessageSquare, Cpu, Box } from 'lucide-react';

// Add these imports at the top, along with React and Lucide icons
import { motion } from 'framer-motion';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css'; 
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; // Dark theme

// ----------------------------------------------------------------------
// --- MOCK DATA & UTILS (Updated for Step-by-Step Visualizer) ---
// ----------------------------------------------------------------------

// Mock data for languages
const languages = [
    { id: 'python', name: 'Python', extension: '.py', defaultCode: 'def fib(n):\n\tif n <= 1:\n\t\treturn n\n\treturn fib(n-1) + fib(n-2)\n\nresult = fib(5)\nprint(f"Fib(5): {result}")' },
    { id: 'javascript', name: 'JavaScript', extension: '.js', defaultCode:'function greet(name) {\n\tconst message = `Hello, ${name}!`\n\tconsole.log(message);\n\treturn message.length;\n}\n\ngreet("World");' },
    { id: 'java', name: 'Java', extension: '.java', defaultCode: 'public class Main {\n\tpublic static void main(String[] args) {\n\t\tint[] arr = {4, 1, 9, 2};\n\t\tint sum = 0;\n\t\tfor(int x : arr) {\n\t\t\tsum += x;\n\t\t}\n\t\tSystem.out.println("Array Sum: " + sum);\n\t}\n}' },
    { id: 'cpp', name: 'C++', extension: '.cpp', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n\tcout << "Hello World!" << endl;\treturn 0;\n}' }
];

// Mock Code Flow Data (Kept as is)
const getFlowSteps = (language) => {
    switch (language) {
        case 'java':
        case 'cpp':
            return [
                { id: 1, name: 'Source Code', icon: <FileText className="w-5 h-5" />, details: 'Code is prepared for compilation.' },
                { id: 2, name: 'Compilation', icon: <Cpu className="w-5 h-5" />, details: 'Source code is translated into machine/bytecode.' },
                { id: 3, name: 'Linking/Loading', icon: <Folder className="w-5 h-5" />, details: 'External libraries are connected, program loads into memory.' },
                { id: 4, name: 'Execution (VM/OS)', icon: <Play className="w-5 h-5" />, details: 'The virtual machine or operating system runs the executable.' },
                { id: 5, name: 'Output/Termination', icon: <Terminal className="w-5 h-5" />, details: 'Program finishes and results are sent to console.' }
            ];
        case 'python':
        case 'javascript':
        default:
            return [
                { id: 1, name: 'Source Code', icon: <FileText className="w-5 h-5" />, details: 'Code is prepared for execution.' },
                { id: 2, name: 'Interpretation/JIT', icon: <Cpu className="w-5 h-5" />, details: 'Code is read line-by-line or Just-In-Time compiled.' },
                { id: 3, name: 'Memory Allocation', icon: <Folder className="w-5 h-5" />, details: 'Variables and functions are assigned space (Stack/Heap).' },
                { id: 4, name: 'Execution', icon: <Play className="w-5 h-5" />, details: 'The runtime executes the instructions.' },
                { id: 5, name: 'Output/Termination', icon: <Terminal className="w-5 h-5" />, details: 'Script finishes and results are sent to console.' }
            ];
    }
};




// Utility function to call the AI API (Kept as is)
const callAIAPI = async (messages) => {
  
    const apiKey = "AIzaSyCYDkTZgh13GV7d1-QR8Bq3YbjNNvcllmY"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const contents = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const systemInstruction = {
        parts: [{ text: "You are a senior programming assistant focused on debugging and code review. Provide concise, clear, and actionable suggestions to fix bugs and improve the provided code snippet. Format the response clearly using Markdown, focusing on one 'Simple suggestion' and one 'Debugging Tip' for Improvement'. When responding to user follow-up questions, maintain the persona and use clear Markdown." }]
    };

    const payload = {
        contents: contents,
        systemInstruction: systemInstruction,
    };

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                return text;
            } else {
                throw new Error("Empty response from AI model.");
            }
        } catch (err) {
            attempt++;
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; 
                console.error(`AI Debug attempt ${attempt} failed. Retrying in ${delay / 1000}s.`, err);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error("AI Debugging failed after max retries:", err);
                return "### AI Assistant Failed\nCould not connect to the service or the request timed out. Please try again.";
            }
        }
    }
    return "### AI Assistant Failed\nCould not connect to the service or the request timed out. Please try again.";
};


// Example of the new structured output in callAIVisualize
// Utility function for AI Visualization (MOCK NOW HANDLES MULTIPLE CODE STRUCTURES)
const callAIVisualize = async (messages) => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing time

    const lastUserMessage = messages[messages.length - 1].text;
    const code = lastUserMessage.match(/Code:\s*```[a-z]+\n([\s\S]*?)\n```/i)?.[1] || '';
    const allSteps = [];
    
    // --- Styles for Highlighting ---
    const activeStyle = { background: '#569CD6', color: 'white', fontWeight: 'bold' };
    const stepStyle = { background: '#333333', color: '#D4D4D4', border: '1px solid #569CD6' };
    const startStyle = { background: '#6A9955', color: 'white' };
    const endStyle = { background: '#F44747', color: 'white' };

    // --- 1. Pattern Matching (Simulating AI Analysis) ---
    
    // Pattern A: Array Sum/Loop
    if (code.includes("sum +=") && (code.includes("int[] arr") || code.includes("arr = ["))) {
        let arrData = code.match(/(\[|\{)\s*(\d+\s*,\s*)*\d+\s*(\]|\})/)?.[0]?.match(/\d+/g)?.map(Number) || [4, 1];
        let currentSum = 0;
        
        // Initial Step
        allSteps.push({
            nodes: [
                { id: 'S1', data: { label: 'Start Program' }, position: { x: 100, y: 0 }, style: startStyle, type: 'input' },
                { id: 'A', data: { label: `Init: sum = 0, Array size = ${arrData.length}` }, position: { x: 100, y: 70 }, style: activeStyle },
            ],
            edges: [{ id: 'eS1-A', source: 'S1', target: 'A', animated: true }],
        });

        // Dynamic Loop Steps
        arrData.forEach((element, index) => {
            const previousSum = currentSum;
            currentSum += element;
            
            // Current Calculation Step
            allSteps.push({
                nodes: [
                    { id: 'A', data: { label: 'Initializations' }, position: { x: 100, y: 70 }, style: stepStyle },
                    { id: `L${index}`, data: { label: `Loop ${index + 1}: Check condition` }, position: { x: 100, y: 140 }, style: stepStyle, type: 'default' },
                    { id: `C${index}`, data: { label: `Sum: ${previousSum} + ${element} = ${currentSum}` }, position: { x: 100, y: 210 }, style: activeStyle },
                ],
                edges: [
                    { id: 'eA-L0', source: 'A', target: 'L0', animated: true, style: { stroke: '#9B9B9B' } },
                    { id: `eL${index}-C${index}`, source: `L${index}`, target: `C${index}`, label: 'True', animated: true, style: { stroke: '#569CD6' } }
                ]
            });
        });

        // Final Step
        allSteps.push({
            nodes: [
                { id: 'A', data: { label: 'Initializations' }, position: { x: 100, y: 70 }, style: stepStyle },
                { id: 'LFinal', data: { label: 'Loop: Check condition' }, position: { x: 100, y: 140 }, style: stepStyle, type: 'default' },
                { id: 'End', data: { label: `Output: Sum is ${currentSum}` }, position: { x: 100, y: 280 }, style: endStyle, type: 'output' },
            ],
            edges: [
                { id: 'eA-L0', source: 'A', target: 'LFinal', animated: false },
                { id: 'eLFinal-End', source: 'LFinal', target: 'End', label: 'False', animated: true, style: { stroke: '#F44747' } }
            ]
        });
        
    } 
    
    // Pattern B: Conditional Logic (if/else)
    else if (code.includes("if ") && code.includes("else")) {
        // Mock a single decision flow
        allSteps.push({
            nodes: [
                { id: 'S', data: { label: 'Start' }, position: { x: 100, y: 0 }, style: startStyle, type: 'input' },
                { id: 'D', data: { label: 'Check condition: if (n < 0)?' }, position: { x: 100, y: 80 }, type: 'default' },
                { id: 'P1', data: { label: 'TRUE: Execute if block' }, position: { x: 0, y: 180 }, style: stepStyle },
                { id: 'P2', data: { label: 'FALSE: Execute else block' }, position: { x: 200, y: 180 }, style: stepStyle },
                { id: 'E', data: { label: 'End Program' }, position: { x: 100, y: 300 }, style: endStyle, type: 'output' },
            ],
            edges: [
                { id: 'eS-D', source: 'S', target: 'D', animated: true, style: { stroke: '#569CD6' } },
                { id: 'eD-P1', source: 'D', target: 'P1', label: 'True', style: { stroke: '#6A9955' } },
                { id: 'eD-P2', source: 'D', target: 'P2', label: 'False', style: { stroke: '#F44747' } },
                { id: 'eP1-E', source: 'P1', target: 'E', animated: true },
                { id: 'eP2-E', source: 'P2', target: 'E', animated: true },
            ]
        });
    }

    // Pattern C: Simple Function Call
    else if (code.includes("def ") || code.includes("function ")) {
        // Mock a simple sequence flow
        allSteps.push({
            nodes: [
                { id: 'S', data: { label: 'Start Program' }, position: { x: 100, y: 0 }, style: startStyle, type: 'input' },
                { id: 'A', data: { label: 'Call Function: greet("World")' }, position: { x: 100, y: 80 }, style: activeStyle },
                { id: 'B', data: { label: 'Function Executes' }, position: { x: 100, y: 150 }, style: stepStyle },
                { id: 'C', data: { label: 'Return Value/Log Output' }, position: { x: 100, y: 220 }, style: stepStyle },
                { id: 'E', data: { label: 'End Program' }, position: { x: 100, y: 300 }, style: endStyle, type: 'output' },
            ],
            edges: [
                { id: 'eS-A', source: 'S', target: 'A', animated: true },
                { id: 'eA-B', source: 'A', target: 'B', animated: true },
                { id: 'eB-C', source: 'B', target: 'C' },
                { id: 'eC-E', source: 'C', target: 'E' },
            ]
        });
    }

    // Default: Return the steps if found, otherwise signal no diagram
    if (allSteps.length > 0) {
        return allSteps;
    } else {
        return "Not a supported structure for visualization";
    }
};


// ----------------------------------------------------------------------
// --- VISUALIZATION COMPONENTS (Kept as is - works with the single diagram string) ---
// ----------------------------------------------------------------------

const AnimatedVisualizer = ({ code, diagram, theme, language, isVisualizing }) => {
    // React Flow manages its own state for rendering the graph
    // We update this state whenever the 'diagram' prop (our JSON step) changes.
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    
    // Auto-fit the view to the new nodes/edges when the diagram changes
    const reactFlowWrapper = useRef(null);

    // Effect to handle updating React Flow when a new step/diagram is received
    useEffect(() => {
        // 'diagram' now holds the JSON object for the current step (nodes/edges)
        if (diagram && diagram !== "Not an array problem") {
            setNodes(diagram.nodes || []);
            setEdges(diagram.edges || []);
            
            // Optional: Log the current step data to verify the animation logic
            console.log("React Flow Updated. Nodes:", diagram.nodes);
        } else if (diagram === "Not an array problem") {
            setNodes([]);
            setEdges([]);
        }
    }, [diagram, setNodes, setEdges]); // Reruns whenever the active step changes

    // No longer need Prism.highlightAll() here if we assume the code box uses Prism's declarative rendering,
    // but keep the code section for context and consistency.

    if (!diagram && !isVisualizing) return null;

    return (
        <motion.div
            className="flex flex-col items-center gap-4 mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
           

            {/* REACT FLOW DIAGRAM CONTAINER */}
            <motion.div
    key={diagram?.nodes?.[0]?.id || 'initial'} 
    ref={reactFlowWrapper}
    className="p-4 bg-bg-secondary rounded-xl shadow-lg border border-border-color w-full 
               overflow-hidden flex items-center justify-center" // <-- Ensure overflow-hidden is here
    style={{ height: '300px' }} // <-- Ensure fixed height is here
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
>
                {isVisualizing ? (
                    <div className="flex items-center gap-2 text-warning absolute"> {/* Added 'absolute' for safety */}
            <div className="w-4 h-4 border-2 rounded-full animate-spin spinner"></div>
            Generating diagram...
        </div>
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange} // Required even if not interactive
                        onEdgesChange={onEdgesChange} // Required even if not interactive
                        fitView // Automatically center and fit the nodes
                        // React Flow background/theme based on your current theme
                        defaultMarkerColor={theme === 'dark' ? '#569CD6' : '#007ACC'} 
                        // Turn off interaction to make it purely presentational
                        elementsSelectable={false}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        zoomOnScroll={false}
                    >
                        <MiniMap style={{ background: 'var(--color-bg-tertiary)' }} />
                        <Controls showZoom={false} showFitView={true} showInteractive={false} />
                        <Background variant="dots" gap={12} size={1} color="var(--color-border)" />
                    </ReactFlow>
                )}
            </motion.div>
             {/* Code Snapshot (unchanged) */}
            <motion.div
                className="p-3 rounded-xl shadow-md bg-bg-tertiary w-full overflow-auto"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <h4 className="text-sm font-medium text-accent mb-2 flex items-center gap-2 font-mono border-b border-border-color pb-1">
                    <Code2 className="w-4 h-4" />
                    Code Snapshot ({language})
                </h4>
                {/* Note: Prism.highlightAll is called in the parent component/global script */}
                <pre className={`language-${language} p-2 text-sm`}>
                    <code className={`language-${language}`}>{code}</code>
                </pre>
            </motion.div>
        </motion.div>
    );
};


const CodeVisualizerCard = ({ code, language, visualization, isVisualizing, currentStepIndex }) => {
    // Check if visualization is the array of steps (dynamic mock now returns the whole array as visualization)
    const totalSteps = visualization && Array.isArray(visualization) ? visualization.length : 0;
    const currentStep = currentStepIndex > -1 ? currentStepIndex + 1 : 0;
    
    // Pass the current step's data object if it exists
    const diagramContent = visualization; 

    return (
        <div className="card-container p-4">
            <h3 className="text-sm font-bold text-accent mb-4 flex items-center gap-2 font-mono border-b border-border-color pb-2">
                <Box className="w-4 h-4" />
                Code Flow Visualizer 
                {currentStep > 0 && totalSteps > 0 && ` (Step ${currentStep} of ${totalSteps})`}
            </h3>
            
            {/* The AnimatedVisualizer expects the single JSON object (the current step) */}
            {diagramContent || isVisualizing ? (
                <AnimatedVisualizer
                    code={code}
                    diagram={diagramContent} 
                    theme={'dark'} 
                    language={language}
                    isVisualizing={isVisualizing}
                />
            ) : (
                <p className="text-text-secondary text-sm">
                    {isVisualizing ? "Generating visualization..." : "Real-time flow visualization will appear here for functions, loops, and conditionals."}
                </p>
            )}
        </div>
    );
};


// ----------------------------------------------------------------------
// --- REMAINING COMPONENTS (Unchanged) ---
// ----------------------------------------------------------------------

const ThemeToggle = ({ theme, toggleTheme }) => (
    <button
        onClick={toggleTheme}
        className="theme-toggle-button p-2 rounded-full transition-all duration-300"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
        {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-400" />
        ) : (
            <Moon className="w-5 h-5 text-gray-700" />
        )}
    </button>
);

const LanguageSelector = ({ languages, selectedLanguage, onLanguageChange }) => (
    <select
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="language-select w-full p-2 rounded-lg font-mono text-sm"
    >
        {languages.map((lang) => (
            <option key={lang.id} value={lang.id} className="language-option">
                {lang.name}
            </option>
        ))}
    </select>
);

const CodeEditor = ({ value, onChange }) => (
    <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="code-editor w-full h-full p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed border-none"
        placeholder="Write your code here..."
        spellCheck={false}
    />
);

const CodeRunner = ({ code, language, onResult, onRunningChange, isRunning, prepareCodeForBackend, onExecutionStart, onExecutionComplete }) => {
    const runCode = async () => {
        onRunningChange(true);
        onResult('', false); // Clear previous output
        onExecutionStart(); // START flow visualization

        try {
            const codeToSend = prepareCodeForBackend(code); 
            const requestData = {
                language: language,
                code: codeToSend,
            };
            
             const apiUrl = `/run`; 
            // Simulate processing time through the flow steps
            await new Promise(resolve => setTimeout(resolve, 500)); 

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
                onResult(resultData.output, true);
            } else {
                onResult(resultData.output, false);
            }
        } catch (err) {
            onResult(
                `Failed to connect to backend: ${err.message}. Please ensure the execution environment is running.`,
                true
            );
        } finally {
            onExecutionComplete(); // STOP flow visualization
            onRunningChange(false);
        }
    };

    return (
        <button
            onClick={runCode}
            disabled={isRunning}
            className="run-button w-full font-bold px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-md"
        >
            {isRunning ? (
                <>
                    <div className="spinner w-4 h-4 border-2 rounded-full animate-spin"></div>
                    Executing...
                </>
            ) : (
                <>
                    <Play className="w-4 h-4" />
                    Run Code
                </>
            )}
        </button>
    );
};

const AIDebugger = ({ code, language, setIsAILoading, addMessage, isAISidebarOpen, setIsAISidebarOpen, isAILoading, prepareCodeForBackend }) => {
    
    const debugCodeWithAI = async () => {
        if (isAILoading) return; // Prevent multiple clicks

        if (!isAISidebarOpen) {
            setIsAISidebarOpen(true);
        }

        setIsAILoading(true);
        
        const cleanCode = prepareCodeForBackend(code);
        
        const initialUserQuery = `Review the following ${language} code and provide debugging tips and improvements. Code: \n\`\`\`${language}\n${cleanCode}\n\`\`\``;

        // Add user's initial query to the displayed history
        addMessage({ sender: 'user', text: initialUserQuery, isCodePrompt: true });

        // Prepare context for the API call (this will include the code)
        const initialMessagesForAPI = [
            { sender: 'user', text: initialUserQuery }
        ];

        // 2. Call the AI
        const aiResponse = await callAIAPI(initialMessagesForAPI);

        // 3. Add AI response to history
        addMessage({ sender: 'ai', text: aiResponse, isCodePrompt: false });
        setIsAILoading(false);
    };

    return (
        <button
            onClick={debugCodeWithAI}
            disabled={isAILoading}
            className="ai-button w-full font-bold px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-md"
        >
            {isAILoading ? (
                <>
                    <div className="ai-spinner w-4 h-4 border-2 rounded-full animate-spin"></div>
                    Analyzing...
                </>
            ) : (
                <>
                    <Zap className="w-4 h-4" />
                    AI Debug
                </>
            )}
        </button>
    );
};


const FileManager = ({ currentFile, onFileSelect, onCodeUpdate }) => {
    const [files, setFiles] = useState([
        { id: 1, name: 'main.js', type: 'file', parent: null, content: 'console.log("Hello World!");' },
        { id: 2, name: 'src', type: 'folder', parent: null, expanded: false },
        { id: 3, name: 'utils.js', type: 'file', parent: 2, content: '// Utility functions\nfunction helper() {\n\treturn "Helper function";\n}' },
        // Added a Java file to match the default language
        { id: 4, name: 'Main.java', type: 'file', parent: null, content: languages.find(l => l.id === 'java').defaultCode },
    ]);
    const [newItemName, setNewItemName] = useState('');
    const [showCreateFile, setShowCreateFile] = useState(false);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [selectedParent, setSelectedParent] = useState(null);
    
    // Helper to find file object by its name/path
    const getFileByName = useCallback((fileName) => {
        return files.find(f => f.name === fileName && f.type === 'file');
    }, [files]);
    
    // Initial selection
    useEffect(() => {
        const defaultFile = getFileByName('Main.java') || getFileByName('main.js') || files.find(f => f.type === 'file');
        if (defaultFile && onFileSelect) {
            onFileSelect(defaultFile);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    const createFile = () => {
        if (newItemName.trim()) {
            const newFile = {
                id: Date.now(),
                name: newItemName.trim(),
                type: 'file',
                parent: selectedParent,
                content: `// New file: ${newItemName.trim()}`
            };
            setFiles(prev => [...prev, newFile]);
            onFileSelect(newFile);
            setNewItemName('');
            setShowCreateFile(false);
            setSelectedParent(null);
        }
    };

    const createFolder = () => {
        if (newItemName.trim()) {
            const newFolder = {
                id: Date.now(),
                name: newItemName.trim(),
                type: 'folder',
                parent: selectedParent,
                expanded: false
            };
            setFiles(prev => [...prev, newFolder]);
            setNewItemName('');
            setShowCreateFolder(false);
            setSelectedParent(null);
        }
    };

    const deleteItem = (id) => {
        const deleteRecursive = (itemId) => {
            const children = files.filter(file => file.parent === itemId);
            children.forEach(child => deleteRecursive(child.id));
            setFiles(prev => prev.filter(file => file.id !== itemId));
        };
        deleteRecursive(id);
        if (files.find(f => f.id === id)?.name === currentFile) {
            const rootFile = getFileByName('Main.java') || getFileByName('main.js') || files.find(f => f.type === 'file');
            if (rootFile) onFileSelect(rootFile);
        }
    };

    const toggleFolder = (id) => {
        setFiles(prev => prev.map(file => 
            file.id === id ? { ...file, expanded: !file.expanded } : file
        ));
    };

    const selectFile = (file) => {
        if (file.type === 'file' && onFileSelect) {
            onFileSelect(file);
        }
    };

    // New: Function to save the current code content back to the file manager state
    const updateFileContent = useCallback((fileName, newContent) => {
        setFiles(prevFiles => prevFiles.map(file => 
            file.name === fileName ? { ...file, content: newContent } : file
        ));
    }, []);

    useEffect(() => {
        // Ensure that when the code in the editor changes, it's saved back to the current file object in the state
        if (currentFile && onCodeUpdate) {
            updateFileContent(currentFile, onCodeUpdate);
        }
    }, [onCodeUpdate, currentFile, updateFileContent]);


    const renderFiles = (parentId = null, depth = 0) => {
        const currentItems = files.filter(file => file.parent === parentId).sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1; // Folders first
        });
        
        return currentItems.map(item => (
            <div key={item.id} className={`${depth > 0 ? 'ml-4' : ''}`}>
                <div 
                    className={`file-item flex items-center justify-between py-1 px-2 text-sm rounded cursor-pointer transition-all duration-200 group ${
                        currentFile === item.name 
                        ? 'selected' 
                        : 'hover-item'
                    }`}
                    onClick={() => {
                        if (item.type === 'folder') {
                            toggleFolder(item.id);
                        } else {
                            selectFile(item);
                        }
                    }}
                >
                    <div className="flex items-center gap-2 flex-1 truncate">
                        {item.type === 'folder' ? (
                            <>
                                {item.expanded ? (
                                    <ChevronDown className="w-3 h-3 text-accent" />
                                ) : (
                                    <ChevronRight className="w-3 h-3 text-accent" />
                                )}
                                <Folder className="w-4 h-4 text-accent" />
                            </>
                        ) : (
                            <FileText className="w-4 h-4 text-text-secondary" />
                        )}
                        <span className="truncate font-mono">{item.name}</span>
                    </div>
                    
                    <div className="file-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'folder' && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedParent(item.id);
                                        setShowCreateFile(true);
                                        setShowCreateFolder(false);
                                        setNewItemName('');
                                    }}
                                    className="action-button p-1 rounded text-xs"
                                    title="Add File"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedParent(item.id);
                                        setShowCreateFolder(true);
                                        setShowCreateFile(false);
                                        setNewItemName('');
                                    }}
                                    className="action-button p-1 rounded text-xs"
                                    title="Add Folder"
                                >
                                    <FolderPlus className="w-3 h-3" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteItem(item.id);
                            }}
                            className="delete-button p-1 rounded text-xs"
                            title="Delete"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                
                {item.type === 'folder' && item.expanded && (
                    <div className="ml-2 border-l border-border-color">
                        {renderFiles(item.id, depth + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="file-manager-container rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-border-color pb-2">
                <h3 className="text-sm font-medium text-accent flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    File Explorer
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            setSelectedParent(null);
                            setShowCreateFile(!showCreateFile);
                            setShowCreateFolder(false);
                            setNewItemName('');
                        }}
                        className="action-button p-1 rounded transition-colors"
                        title="New File"
                    >
                        <Plus className="w-4 h-4 text-accent" />
                    </button>
                    <button
                        onClick={() => {
                            setSelectedParent(null);
                            setShowCreateFolder(!showCreateFolder);
                            setShowCreateFile(false);
                            setNewItemName('');
                        }}
                        className="action-button p-1 rounded transition-colors"
                        title="New Folder"
                    >
                        <FolderPlus className="w-4 h-4 text-accent" />
                    </button>
                </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 mb-3 file-list">
                {renderFiles()}
            </div>

            {(showCreateFile || showCreateFolder) && (
                <div className="create-form pt-3">
                    <div className="text-xs text-text-secondary mb-2">
                        Creating {showCreateFile ? 'File' : 'Folder'} in: 
                        <span className='font-mono text-accent ml-1'>
                            {selectedParent ? files.find(f => f.id === selectedParent)?.name || 'Root' : 'Root'}
                        </span>
                    </div>
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={showCreateFile ? "Enter file name..." : "Enter folder name..."}
                        className="file-input w-full px-2 py-1 rounded text-xs font-mono"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                showCreateFile ? createFile() : createFolder();
                            }
                            if (e.key === 'Escape') {
                                setShowCreateFile(false);
                                setShowCreateFolder(false);
                                setNewItemName('');
                                setSelectedParent(null);
                            }
                        }}
                        autoFocus
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={showCreateFile ? createFile : createFolder}
                            className="create-button px-3 py-1 font-medium text-xs rounded transition-colors"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => {
                                setShowCreateFile(false);
                                setShowCreateFolder(false);
                                setNewItemName('');
                                setSelectedParent(null);
                            }}
                            className="cancel-button px-3 py-1 text-xs rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};




const TerminalPanel = ({ result, isRunning, hasError }) => (
    <div className="output-panel h-full flex flex-col shadow-2xl border-t border-border-color">
        <div className="output-header px-4 py-3 flex items-center gap-2 border-b border-border-color">
            <Terminal className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Console Output</span>
            <div className="ml-auto flex items-center gap-2">
                <span className={`text-xs font-mono ${isRunning ? 'text-warning' : hasError ? 'text-error' : result ? 'text-success' : 'text-text-secondary'}`}>
                    {isRunning ? 'Running' : hasError ? 'Error' : result ? 'Complete' : 'Idle'}
                </span>
                <div className={`status-indicator w-2 h-2 rounded-full ${isRunning ? 'animate-pulse bg-warning' : hasError ? 'bg-error' : result ? 'bg-success' : 'bg-text-secondary'}`}></div>
            </div>
        </div>
        <div className="flex-1 p-4 font-mono text-sm overflow-auto">
            {isRunning ? (
                <div className="flex items-center gap-2 text-warning">
                    <div className="w-3 h-3 border-2 rounded-full animate-spin spinner"></div>
                    <span>$ Executing code...</span>
                </div>
            ) : result ? (
                <pre className={`whitespace-pre-wrap ${hasError ? 'text-error' : 'text-text-primary'}`}>
                    <span className="text-accent">$ </span>{result}
                </pre>
            ) : (
                <div className="text-text-secondary italic">
                    <span className="text-accent">$</span> Ready. Press 'Run Code' to execute.
                </div>
            )}
        </div>
    </div>
);

const AIPanel = ({ messages, isAILoading, isAISidebarOpen, setIsAISidebarOpen, sendFollowUp, currentCode, currentLanguage }) => {
    const [userInput, setUserInput] = useState('');
    const chatEndRef = useRef(null);
    const hasConversation = messages.length > 0;

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (userInput.trim() === '' || isAILoading) return;
        sendFollowUp(userInput.trim(), currentCode, currentLanguage);
        setUserInput('');
    };

    const renderMessage = (message, index) => {
        const isAI = message.sender === 'ai';
        const icon = isAI ? <Zap className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
        const senderName = isAI ? 'AI Assistant' : 'You';

        // NOTE: The dangerouslySetInnerHTML is required here because the AI response is Markdown
        // and needs to be rendered as HTML (including code blocks, headers, etc.)
        return (
            <div key={index} className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
                <div className={`max-w-[90%] p-3 rounded-xl shadow-lg relative ${
                    isAI 
                    ? 'ai-message bg-bg-tertiary text-text-primary mr-10' 
                    : 'user-message bg-accent text-white ml-10'
                }`}>
                    <div className="flex items-center gap-2 mb-2 font-medium text-xs border-b border-border-color pb-1">
                        {icon}
                        <span className={`${isAI ? 'text-accent' : 'text-white'}`}>{senderName}</span>
                    </div>
                    {/* Render Markdown content */}
                    <div 
                        className={`text-sm markdown-content ${isAI ? 'text-text-primary' : 'text-white'}`} 
                        dangerouslySetInnerHTML={{ __html: message.text }}
                    ></div>
                </div>
            </div>
        );
    };

    return (
        <div className={`ai-sidebar-container p-0 ${isAISidebarOpen ? 'ai-sidebar-open' : 'ai-sidebar-closed'}`}>
            <div className="output-panel h-full flex flex-col shadow-2xl border-l border-border-color">
                <div className="output-header px-4 py-3 flex items-center gap-2 border-b border-border-color">
                    <Zap className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">AI Assistant</span>
                    
                    <div className="ml-auto flex items-center gap-2">
                        <span className={`text-xs font-mono ${isAILoading ? 'text-warning' : hasConversation ? 'text-success' : 'text-text-secondary'}`}>
                            {isAILoading ? 'Thinking' : hasConversation ? 'Active' : 'Idle'}
                        </span>
                        <button
                            onClick={() => setIsAISidebarOpen(false)}
                            className="p-1 rounded hover:bg-bg-primary text-text-secondary hover:text-accent transition-colors"
                            title="Close AI Assistant"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Chat Display Area */}
                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto ai-content chat-history">
                    {!hasConversation && !isAILoading ? (
                        <div className="text-text-secondary italic text-center p-4 h-full flex flex-col justify-center items-center">
                            <Zap className="w-8 h-8 mb-3 text-accent" />
                            <p className='mb-2'>**AI Code Assistant**</p>
                            <p className='text-sm text-text-secondary'>Click the **AI Debug** button to start a code review conversation. You can ask follow-up questions here!</p>
                        </div>
                    ) : (
                        messages.map(renderMessage)
                    )}
                    
                    {isAILoading && (
                               <div className="flex justify-start mb-4">
                                    <div className='ai-message bg-bg-tertiary text-text-primary p-3 rounded-xl shadow-lg flex items-center gap-3'>
                                        <div className="w-4 h-4 border-2 rounded-full animate-spin ai-spinner-color"></div>
                                        <span className='text-sm'>AI is thinking...</span>
                                    </div>
                                </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                
                {/* Chat Input Area */}
                <div className="chat-input p-4 border-t border-border-color bg-bg-secondary">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isAILoading) handleSend();
                            }}
                            placeholder={hasConversation ? "Ask a follow-up question..." : "Start a conversation with AI Debug"}
                            className="w-full px-3 py-2 rounded-lg text-sm font-mono file-input"
                            disabled={!hasConversation || isAILoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={userInput.trim() === '' || isAILoading || !hasConversation}
                            className={`send-button p-2 rounded-full transition-colors ${
                                userInput.trim() === '' || isAILoading || !hasConversation 
                                ? 'bg-bg-tertiary text-text-secondary cursor-not-allowed' 
                                : 'bg-accent hover:bg-accent-hover text-white'
                            }`}
                            title="Send Message"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            {/* Custom CSS for Markdown within the panel (Kept as is for styling) */}
            <style jsx>{`
                .ai-content p { margin-bottom: 0.75rem; }
                .ai-content h1, .ai-content h2, .ai-content h3 { font-size: 1em; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; color: var(--color-accent); border-bottom: 1px solid var(--color-border); padding-bottom: 0.25rem;}
                .ai-content pre { 
                    background-color: var(--color-bg-primary); 
                    border: 1px solid var(--color-border); 
                    padding: 0.75rem; 
                    border-radius: 0.5rem; 
                    white-space: pre-wrap; 
                    overflow-x: auto;
                    margin-bottom: 0.75rem;
                }
                .ai-content code { 
                    font-family: 'Fira Code', monospace; 
                    color: var(--color-warning); 
                }
                .ai-content pre code { 
                    color: var(--color-success); 
                    font-size: 0.85rem;
                }
                .ai-content ul, .ai-content ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
                .ai-content li { margin-bottom: 0.25rem; }
            `}</style>
        </div>
    );
};

const CodeFlowVisualizer = ({ language, isRunning }) => {
    // The language prop from the original code was 'code' which is wrong, changed it to 'language'
    const [activeStep, setActiveStep] = useState(0);
    const steps = getFlowSteps(language); // Use the correct prop

    useEffect(() => {
        let interval;
        if (isRunning) {
            // Start simulation from step 1
            setActiveStep(1); 
            
            // Cycle through steps 1-4 for visualization
            interval = setInterval(() => {
                setActiveStep(prevStep => {
                    // Stop at step 4 if it's the last stage before output (step 5)
                    return prevStep >= 4 ? 4 : prevStep + 1; 
                });
            }, 1000); // Highlight a new step every 1 second
        } else {
            // Reset state when execution stops, ensuring the final step (5: Output) is briefly shown
            if (activeStep > 0) {
                setActiveStep(5);
                const finalReset = setTimeout(() => setActiveStep(0), 1000);
                return () => clearTimeout(finalReset);
            }
            setActiveStep(0);
        }

        return () => clearInterval(interval);
    }, [isRunning]);

    return (
        <div className="card-container p-4">
            <h3 className="text-sm font-bold text-accent mb-4 flex items-center gap-2 font-mono border-b border-border-color pb-2">
                <Cpu className="w-4 h-4" />
                Code Execution Flow
            </h3>
            <div className="space-y-3">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = activeStep === stepNumber;
                    const isCompleted = stepNumber < activeStep;
                    // Special handling for the last step
                    const isFinalStep = stepNumber === steps.length;
                    const colorClass = isActive 
                        ? 'flow-active' 
                        : isCompleted || (isFinalStep && activeStep === 5)
                            ? 'flow-completed' 
                            : 'flow-pending';
                    
                    return (
                        <motion.div 
                            key={step.id} 
                            className="flex items-start gap-3"
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}>
                                {step.icon}
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className={`text-sm font-medium transition-colors duration-500 ${isActive ? 'text-accent' : isCompleted ? 'text-text-primary' : 'text-text-secondary'}`}>
                                    {step.name}
                                </p>
                                <motion.p 
                                    className={`text-xs mt-0.5 transition-colors duration-500 ${isActive ? 'text-text-primary font-mono' : 'text-text-secondary font-mono'}`}
                                    initial={{ height: isActive ? 'auto' : 0, opacity: isActive ? 1 : 0 }}
                                    animate={{ height: isActive ? 'auto' : 0, opacity: isActive ? 1 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {isActive ? step.details : ''}
                                </motion.p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            {/* Custom CSS for visualizer transitions */}
            <style jsx>{`
                .flow-active {
                    background-color: var(--color-accent);
                    color: white;
                    box-shadow: 0 0 10px rgba(86, 155, 214, 0.5);
                }
                .flow-completed {
                    background-color: var(--color-success);
                    color: white;
                }
                .flow-pending {
                    background-color: var(--color-bg-tertiary);
                    color: var(--color-text-secondary);
                }
            `}</style>
        </div>
    );
};



// ----------------------------------------------------------------------
// --- MAIN APP COMPONENT (Updated State and Effects) ---
// ----------------------------------------------------------------------

function App() {
    const initialLanguageId = 'java';
    const initialLanguage = languages.find(l => l.id === initialLanguageId);

    const [selectedLanguage, setSelectedLanguage] = useState(initialLanguageId);
    const [code, setCode] = useState(initialLanguage.defaultCode);
    const [result, setResult] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentFile, setCurrentFile] = useState('Main.java'); // Updated default file name
    const [theme, setTheme] = useState('dark');
    
    // AI States
    const [messages, setMessages] = useState([]); 
    const [isAILoading, setIsAILoading] = useState(false);
    const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);

    // Flow Visualizer State
    const [isFlowRunning, setIsFlowRunning] = useState(false);

    // --- UPDATED VISUALIZATION STATES ---
    const [visualizationSteps, setVisualizationSteps] = useState([]); 
    const [currentStepIndex, setCurrentStepIndex] = useState(-1); // Tracks the current animated step
    const [isVisualizing, setIsVisualizing] = useState(false);
    const debounceTimer = useRef(null);

    // Get the current diagram string from the array based on the index
   const currentVisualization = visualizationSteps[currentStepIndex];


    // NEW HELPER FUNCTION TO FIX BACKSLASH ISSUE (Unchanged)
    const prepareCodeForBackend = useCallback((code) => {
        if (!code) return '';
        // Aggressively remove all backslashes. 
        return code.replace(/\\/g, ''); 
    }, []);

    const addMessage = useCallback((message) => {
        setMessages(prev => [...prev, message]);
    }, []);

    // Function to handle flow visualization start (Unchanged)
    const handleExecutionStart = () => {
        setIsFlowRunning(true);
    };

    // Function to handle flow visualization stop (Unchanged)
    const handleExecutionComplete = () => {
        // A slight delay ensures the final step (Output/Termination) has a moment of visibility
        setTimeout(() => {
            setIsFlowRunning(false);
        }, 500);
    };

    // Function to handle follow-up queries (Unchanged)
    const sendFollowUp = async (userText, currentCode, currentLanguage) => {
        setIsAILoading(true);
        
        // 1. Add user message to history (to display immediately)
        addMessage({ sender: 'user', text: userText, isCodePrompt: false });

        // Clean the code before preparing the API message context
        const cleanCode = prepareCodeForBackend(currentCode);
        const initialQuery = `Review the following ${currentLanguage} code and provide debugging tips and improvements. Code: \n\`\`\`${currentLanguage}\n${cleanCode}\n\`\`\``;

        const conversationMessages = messages.filter(msg => !msg.isCodePrompt); 

        const fullMessages = [
            ...conversationMessages, 
            { sender: 'user', text: userText }
        ];
        
        // 3. Call AI API with full context
        const aiResponse = await callAIAPI(fullMessages);

        // 4. Add AI response to history
        addMessage({ sender: 'ai', text: aiResponse, isCodePrompt: false });
        setIsAILoading(false);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    // --- NEW EFFECT: ANIMATE DIAGRAM STEPS ---
    useEffect(() => {
        let interval;
        // Start animation only if we have steps and code is not actively running (avoid visual overlap)
        if (visualizationSteps.length > 0 && !isRunning) { 
            // Start animation after a brief delay to show the first step clearly
            interval = setInterval(() => {
                setCurrentStepIndex(prevIndex => {
                    // Check if we're at the last step
                    if (prevIndex >= visualizationSteps.length - 1) {
                        clearInterval(interval);
                        // Loop back to the first step (index 0) after a delay to keep the visualization running
                        setTimeout(() => setCurrentStepIndex(0), 4000); 
                        return prevIndex; // Stay on the last step until the reset delay is done
                    }
                    return prevIndex + 1; // Move to the next step
                });
            }, 3000); // Change step every 3 seconds
        } else if (visualizationSteps.length === 0 || isRunning) {
            // Clear the animation if no steps or if the main execution is running
            clearInterval(interval);
        }

        return () => clearInterval(interval); // Cleanup on unmount or dependency change
    }, [visualizationSteps, isRunning]);


    // Initialize code and visualization when language changes (Minor update to clear new states)
    useEffect(() => {
        const language = languages.find(lang => lang.id === selectedLanguage);
        if (language) {
            if (!code || code === languages.find(l => l.id === selectedLanguage).defaultCode) {
                    setCode(language.defaultCode);
            }
            setResult('');
            setHasError(false);
        }
        setVisualizationSteps([]); // Clear steps on language change
        setCurrentStepIndex(-1);
        setIsVisualizing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLanguage]);

    const handleResult = (newResult, error) => {
        setResult(newResult);
        setHasError(error);
    };

    const handleFileSelect = (file) => {
        setCode(file.content || ''); 
        setCurrentFile(file.name);
        // Infer language from file extension
        const lang = languages.find(l => file.name.endsWith(l.extension))?.id;
        setSelectedLanguage(lang || selectedLanguage);
        setResult('');
        setHasError(false);
        // Clear AI chat history and visualization on file change
        setMessages([]);
        setIsAILoading(false);
        setVisualizationSteps([]);
        setCurrentStepIndex(-1);
    };

    // --- UPDATED: Function to fetch array of visualization steps ---
    const visualizeCode = useCallback(async (currentCode, currentLanguage) => {
        if (!currentCode.trim()) {
            setVisualizationSteps([]);
            setCurrentStepIndex(-1);
            setIsVisualizing(false);
            return;
        }

        setIsVisualizing(true);
        const cleanCode = prepareCodeForBackend(currentCode);
        const query = `Analyze the following ${currentLanguage} code. If it involves array operations or is an array problem, generate a series of 5 Mermaid diagrams (e.g., flowchart) that visualizes the step-by-step logic. Output only an array of Mermaid code strings. If not an array problem, output exactly "Not an array problem".
Code:
\`\`\`${currentLanguage}
${cleanCode}
\`\`\``;
        
        // Call the mocked API
        const aiResponse = await callAIVisualize([{ sender: 'user', text: query }]);
        
        if (typeof aiResponse === 'string' && aiResponse.includes('Not an array problem')) {
            setVisualizationSteps([]);
            setCurrentStepIndex(-1);
        } else if (Array.isArray(aiResponse)) {
            setVisualizationSteps(aiResponse);
            setCurrentStepIndex(0); // Set to the first step to start the animation
        }
        setIsVisualizing(false);
    }, [prepareCodeForBackend]);

    // Debounce visualization on code change (Unchanged)
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            visualizeCode(code, selectedLanguage);
        }, 2000); // Visualize 2 seconds after typing stops

        return () => clearTimeout(debounceTimer.current);
    }, [code, selectedLanguage, visualizeCode]);

    // Initialize/Update Mermaid global settings (Unchanged)
    

    const currentLanguage = languages.find(lang => lang.id === selectedLanguage);
    const terminalHeightClass = isAISidebarOpen ? 'h-40-calc' : 'h-48-calc'; 

    return (
        <div className={`app-container ${theme} h-screen flex flex-col overflow-hidden`}>
            {/* Custom CSS (Kept as is for styling) */}
            <style>
                {/* ... (Your Custom CSS remains here) ... */}
                {`
                /* Import a professional monospace font */
                @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap');

                /* --- CSS Variable Definitions for Theming --- */
                :root {
                    /* DARK THEME (DEFAULT) */
                    --color-bg-primary: #1E1E1E; /* Main BG */
                    --color-bg-secondary: #252526; /* Sidebar/Panel BG */
                    --color-bg-tertiary: #333333; /* Input/Hover BG - Used for AI message bubble */
                    --color-text-primary: #D4D4D4; /* Main Text */
                    --color-text-secondary: #9B9B9B; /* Secondary Text/Placeholder */
                    --color-accent: #569CD6; /* VS Code Blue for primary accents, title, icons */
                    --color-accent-hover: #4C8CD0;
                    --color-border: #3C3C3C; /* Border lines */
                    --color-run-button: #6A9955; /* Green for run button (Success) */
                    --color-run-button-text: #1E1E1E;
                    --color-error: #F44747; /* Red for errors */
                    --color-warning: #DCDCAA; /* Yellow/Warning */
                    --color-success: #6A9955; /* Green/Success */
                }

                /* LIGHT THEME */
                .light {
                    --color-bg-primary: #F3F3F3;
                    --color-bg-secondary: #FFFFFF;
                    --color-bg-tertiary: #EBEBEB; /* Used for AI message bubble */
                    --color-text-primary: #1E1E1E;
                    --color-text-secondary: #6A6A6A;
                    --color-accent: #007ACC;
                    --color-accent-hover: #006BB5;
                    --color-border: #D0D0D0;
                    --color-run-button: #2AA198;
                    --color-run-button-text: #FFFFFF;
                    --color-error: #DC322F;
                    --color-warning: #B58900;
                    --color-success: #2AA198;
                }

                /* Base styles for the entire application */
                body {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Fira Code', monospace;
                    overflow: hidden;
                }

                /* Base container class for theme application */
                .app-container {
                    background-color: var(--color-bg-primary);
                    color: var(--color-text-primary);
                    transition: background-color 0.3s, color 0.3s;
                }

                /* --- Layout and Structure --- */

                .app-header, .sidebar, .output-panel {
                    background-color: var(--color-bg-secondary);
                    color: var(--color-text-primary);
                    transition: background-color 0.3s, border-color 0.3s;
                }

                .sidebar {
                    /* Tailwind w-80 (20rem) */
                    min-width: 20rem; 
                    max-width: 20rem; 
                    width: 20rem;
                    min-height: 0;
                }

                /* Card and component wrapper styling */
                .card-container {
                    background-color: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    border-radius: 0.5rem; /* rounded-lg */
                    padding: 1rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
                    transition: all 0.3s;
                }
                .light .card-container {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }

                /* --- Code Editor & Text Areas --- */

                .code-editor {
                    background-color: var(--color-bg-primary);
                    color: var(--color-text-primary);
                    /* Remove default focus border and use custom outline effect */
                    outline: none;
                    border: none;
                    line-height: 1.5; /* Slightly tighter than 'relaxed' for code */
                    /* Custom font styles */
                    font-weight: 400;
                    font-size: 0.9rem;
                    padding: 1.3rem;
                    tab-size: 4;
                    caret-color: var(--color-accent); /* Blinking cursor color */
                    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
                }

                .language-select, .file-input {
                    background-color: var(--color-bg-tertiary);
                    color: var(--color-text-primary);
                    border: 1px solid var(--color-border);
                    transition: all 0.2s;
                }
                .language-select:focus, .file-input:focus {
                    border-color: var(--color-accent);
                    box-shadow: 0 0 0 1px var(--color-accent);
                }
                .language-option {
                    background-color: var(--color-bg-secondary);
                }

                /* --- File Manager Styling --- */

                .file-manager-container {
                    background-color: var(--color-bg-secondary);
                    padding: 0; 
                    border: none;
                    box-shadow: none;
                }

                .file-list {
                    padding-right: 0.5rem; 
                }

                .file-item {
                    color: var(--color-text-primary);
                }

                .file-item:hover {
                    background-color: var(--color-bg-tertiary);
                }

                .file-item.selected {
                    background-color: rgba(86, 155, 214, 0.1); /* Accent blue with opacity */
                    border: 1px solid var(--color-accent);
                    color: var(--color-accent);
                }
                .light .file-item.selected {
                    background-color: rgba(0, 122, 204, 0.1);
                }

                .file-actions button {
                    color: var(--color-text-secondary);
                    background: transparent;
                }
                .file-actions button:hover {
                    background-color: var(--color-accent-hover);
                    color: var(--color-run-button-text); /* Black/White depending on theme */
                }

                .delete-button:hover {
                    background-color: var(--color-error);
                    color: var(--color-bg-secondary); /* White/Light text on red */
                }

                .create-form {
                    border-top: 1px solid var(--color-border);
                    padding-top: 0.75rem;
                }

                .create-button {
                    background-color: var(--color-accent);
                    color: var(--color-run-button-text);
                }
                .create-button:hover {
                    background-color: var(--color-accent-hover);
                }

                .cancel-button {
                    background-color: var(--color-bg-tertiary);
                    color: var(--color-text-primary);
                }
                .cancel-button:hover {
                    background-color: var(--color-text-secondary);
                    color: var(--color-bg-secondary);
                }


                /* --- Run Button --- */
                .run-button {
                    background-color: var(--color-run-button);
                    color: var(--color-run-button-text);
                    /* Neon glow effect for dark mode button */
                    box-shadow: 0 0 10px rgba(66, 107, 195, 0.5); 
                }
                .run-button:hover:not(:disabled) {
                    filter: brightness(1.1);
                }
                .run-button:disabled {
                    background-color: var(--color-bg-tertiary);
                    color: var(--color-text-secondary);
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .run-button .spinner {
                    border-top-color: var(--color-run-button-text);
                    border-left-color: var(--color-run-button-text);
                    border-right-color: var(--color-run-button-text);
                    border-bottom-color: transparent !important;
                }
                
                /* --- AI Debugger Button --- */
                .ai-button {
                    background-color: var(--color-accent);
                    color: white;
                    box-shadow: 0 0 10px rgba(86, 155, 214, 0.5);
                }
                .ai-button:hover:not(:disabled) {
                    filter: brightness(1.1);
                }
                .ai-button:disabled {
                    background-color: var(--color-bg-tertiary);
                    color: var(--color-text-secondary);
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .ai-spinner {
                    border-top-color: white;
                    border-left-color: white;
                    border-right-color: white;
                    border-bottom-color: transparent !important;
                }


                /* --- Output Panel --- */
                .output-panel {
                    background-color: var(--color-bg-secondary);
                    border-top: 1px solid var(--color-border);
                    transition: background-color 0.3s, border-color 0.3s;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    padding: 0%;
                }
                .output-content {
                    background-color: var(--color-bg-primary);
                    box-shadow: inset 0 10px 10px rgba(0, 0, 0, 0.2);
                }

                /* Special text colors for output */
                .text-error { color: var(--color-error); }
                .text-warning { color: var(--color-warning); }
                .text-success { color: var(--color-success); }
                .bg-error { background-color: var(--color-error); }
                .bg-warning-dot { 
                    background-color: var(--color-warning); 
                }
                .bg-success { background-color: var(--color-success); }
                .status-indicator.bg-warning { background-color: var(--color-warning); }
                .status-indicator.bg-error { background-color: var(--color-error); }
                .status-indicator.bg-success { background-color: var(--color-success); }
                .status-indicator.bg-text-secondary { background-color: var(--color-text-secondary); }

                /* --- Theme Toggle --- */
                .theme-toggle-button {
                    background-color: var(--color-bg-tertiary);
                    border: 1px solid var(--color-border);
                }
                .theme-toggle-button:hover {
                    background-color: var(--color-accent);
                    border-color: var(--color-accent);
                }

                /* --- AI Sidebar Container --- */
                .ai-sidebar-container {
                    width: 0;
                    transition: width 0.3s ease-in-out;
                    min-height: 0;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .ai-sidebar-open {
                    width: 24rem; /* 96 Tailwind unit */
                }
                
                .ai-sidebar-closed {
                    width: 0;
                    overflow: hidden;
                    min-width: 0;
                }

                /* --- HEIGHT UTILITY FIXES --- */

                /* New terminal heights: 12rem (default) and 10rem (minimized) */
                .h-48-calc { height: 12rem; } /* Default size */
                .h-40-calc { height: 10rem; } /* Minimized size */

                /* Editor heights (Header is approx 4rem) */
                /* AI Closed: h-screen - 4rem - 12rem = calc(100vh - 16rem) */
                .h-editor-default { height: calc(100vh - 16rem); } 
                /* AI Open: h-screen - 4rem - 10rem = calc(100vh - 14rem) */
                .h-editor-shrunk { height: calc(100vh - 14rem); }

                /* --- Chat Specific Styles --- */
                .user-message {
                    background-color: var(--color-accent);
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 0.5rem;
                    border-top-right-radius: 0;
                    border-top-left-radius: 0.5rem;
                    border-bottom-left-radius: 0.5rem;
                }

                .ai-message {
                    background-color: var(--color-bg-tertiary);
                    color: var(--color-text-primary);
                    align-self: flex-start;
                    border-top-left-radius: 0.5rem;
                    border-bottom-left-radius: 0.5rem;
                    border-top-right-radius: 0.5rem;
                    border-bottom-right-radius: 0;
                }
                .ai-message .text-accent {
                    color: var(--color-accent);
                }

                /* AI Spinner Color */
                .ai-spinner-color {
                    border-top-color: var(--color-accent);
                    border-left-color: var(--color-accent);
                    border-right-color: var(--color-accent);
                    border-bottom-color: transparent !important;
                }


                /* --- Global Utilities (Using variables instead of hardcoded Tailwind colors) --- */
                .flex { display: flex; }
                .flex-1 { flex: 1; }
                .flex-col { flex-direction: column; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .justify-center { justify-content: center; }
                .justify-start { justify-content: flex-start; }
                .justify-end { justify-content: flex-end; }
                .gap-1 { gap: 0.25rem; }
                .gap-2 { gap: 0.5rem; }
                .gap-3 { gap: 0.75rem; }
                .gap-4 { gap: 1rem; }
                .gap-6 { gap: 1.5rem; }
                .ml-auto { margin-left: auto; }
                .ml-1 { margin-left: 0.25rem; }
                .ml-2 { margin-left: 0.5rem; }
                .ml-4 { margin-left: 1rem; }
                .mr-10 { margin-right: 2.5rem; }
                .ml-10 { margin-left: 2.5rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-3 { margin-bottom: 0.75rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-4 { margin-top: 1rem; }
                .p-4 { padding: 1rem; }
                .p-6 { padding: 1.5rem; }
                .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
                .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                .px-4 { padding-left: 1rem; padding-right: 1rem; }
                .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
                .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
                .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
                .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
                .pt-3 { padding-top: 0.75rem; }
                .pb-2 { padding-bottom: 0.5rem; }
                .w-full { width: 100%; }
                .h-screen { height: 100vh; }
                .h-full { height: 100%; }
                .min-h-0 { min-height: 0; }
                .min-w-0 { min-width: 0; }
                .resize-none { resize: none; }
                .rounded { border-radius: 0.25rem; }
                .rounded-lg { border-radius: 0.5rem; }
                .rounded-full { border-radius: 9999px; }
                .rounded-xl { border-radius: 0.75rem; }
                .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
                .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
                .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
                .border { border-width: 1px; }
                .border-none { border-style: none; }
                .border-t { border-top-width: 1px; }
                .border-b { border-bottom-width: 1px; }
                .border-l { border-left-width: 1px; }
                .border-r { border-right-width: 1px; }
                .border-border-color { border-color: var(--color-border); }
                .border-t-transparent { border-top-color: transparent; }
                .font-mono { font-family: 'Fira Code', monospace; }
                .font-bold { font-weight: 700; }
                .font-medium { font-weight: 500; }
                .text-sm { font-size: 0.875rem; }
                .text-xs { font-size: 0.75rem; }
                .text-2xl { font-size: 1.5rem; }
                .tracking-wider { letter-spacing: 0.05em; }
                .italic { font-style: italic; }
                .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .whitespace-pre-wrap { white-space: pre-wrap; }
                .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
                .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
                .transition-all { transition-property: all; transition-duration: 300ms; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
                .transition-colors { transition-property: background-color, border-color, color, fill, stroke; transition-duration: 300ms; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
                .transform { transform: translate(0, 0) rotate(0) skew(0) scaleX(1) scaleY(1); }
                .hover\\:scale-105:hover { transform: scale(1.05); }
                .disabled\\:scale-100:disabled { transform: scale(1); }
                .focus\\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
                .opacity-0 { opacity: 0; }
                .group:hover .group-hover\\:opacity-100 { opacity: 1; }
                .cursor-pointer { cursor: pointer; }
                .text-accent { color: var(--color-accent); }
                .text-text-primary { color: var(--color-text-primary); }
                .text-text-secondary { color: var(--color-text-secondary); }

                /* Custom animations */
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes pulse {
                    50% { opacity: .5; }
                }

                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                /* Flicker effect on dark theme header */
                @keyframes neon-flicker {
                    0%, 19.99% { text-shadow: none; }
                    20%, 20.99% { text-shadow: 0 0 3px var(--color-accent), 0 0 6px var(--color-accent); opacity: 0.9; }
                    21%, 21.99% { text-shadow: none; opacity: 1; }
                    22%, 22.99% { text-shadow: 0 0 3px var(--color-accent), 0 0 6px var(--color-accent); opacity: 0.9; }
                    23%, 100% { text-shadow: none; opacity: 1; }
                }

                .dark .header-flicker {
                    animation: neon-flicker 4s infinite;
                }
                .light .header-flicker {
                    animation: none;
                    text-shadow: none;
                }

                /* Scrollbar styles for all elements, using theme colors */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }

                ::-webkit-scrollbar-track {
                    background: var(--color-bg-secondary);
                }

                ::-webkit-scrollbar-thumb {
                    background: var(--color-accent);
                    border-radius: 4px;
                    border: 2px solid var(--color-bg-secondary);
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: var(--color-accent-hover);
                }

                .overflow-y-auto {
                    overflow-y: auto;
                }
                
                /* Mermaid styling - ensure nodes have a smooth look */
                .mermaid g {
                    transition: transform 0.4s ease, opacity 0.4s ease;
                }
                .mermaid .node rect {
                    stroke: var(--color-accent);
                    stroke-width: 2px;
                    transition: fill 0.3s ease;
                    fill: var(--color-bg-tertiary);
                }
                .mermaid .node:hover rect {
                    fill: var(--color-accent-hover);
                }
                `}
            </style>
            
            {/* Header */}
            <header className="app-header px-6 py-4 shadow-lg border-b border-border-color">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Code2 className="w-6 h-6 text-accent" />
                        <h1 className="text-2xl font-bold font-mono tracking-wider header-flicker text-accent">
                            Your Own Compiler
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
                            <span className="hidden sm:inline">Universal Executor</span>
                        </div>
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    </div>
                </div>
            </header>

            {/* Main Content (3-Column Layout) */}
            <div className="flex flex-1 min-h-0">
                {/* 1. Sidebar (Fixed Width) */}
                <aside className="sidebar w-80 p-6 flex flex-col gap-6 shadow-xl border-r border-border-color overflow-y-auto">
                    
                    {/* Language Selector */}
                    <div className='card-container'>
                        <label className="block text-sm font-medium text-accent mb-3 font-mono">
                            Select Language
                        </label>
                        <LanguageSelector
                            languages={languages}
                            selectedLanguage={selectedLanguage}
                            onLanguageChange={setSelectedLanguage}
                        />
                    </div>

                    {/* Execution & AI Buttons */}
                    <div className='card-container flex gap-3'>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-accent mb-3 font-mono">
                                Run Code
                            </label>
                            <CodeRunner
                                code={code}
                                language={selectedLanguage}
                                onResult={handleResult}
                                onRunningChange={setIsRunning}
                                isRunning={isRunning}
                                prepareCodeForBackend={prepareCodeForBackend}
                                onExecutionStart={handleExecutionStart}
                                onExecutionComplete={handleExecutionComplete} 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-accent mb-3 font-mono">
                                AI Review
                            </label>
                            <AIDebugger
                                code={code}
                                language={selectedLanguage}
                                isAILoading={isAILoading}
                                setIsAILoading={setIsAILoading}
                                addMessage={addMessage} 
                                isAISidebarOpen={isAISidebarOpen}
                                setIsAISidebarOpen={setIsAISidebarOpen}
                                prepareCodeForBackend={prepareCodeForBackend}
                            />
                        </div>
                    </div>

                    {/* Code Execution Flow Visualizer */}
                    <CodeFlowVisualizer language={selectedLanguage} isRunning={isFlowRunning} />
                    
                   {/* Code Visualization Panel (Step-by-Step Animated) */}
                    <CodeVisualizerCard 
                        code={code}
                        language={selectedLanguage}
                        visualization={currentVisualization} // Pass the single JSON step object
                        isVisualizing={isVisualizing}
                        currentStepIndex={currentStepIndex}
                    />

                    {/* Language Details */}
                    <div className="card-container p-4">
                        <h3 className="text-sm font-medium text-accent mb-3 flex items-center gap-2 font-mono border-b border-border-color pb-2">
                            <Code2 className="w-4 h-4" />
                            Details
                        </h3>
                        <div className="text-sm text-text-primary space-y-2 font-mono">
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Language:</span>
                                <span className="font-medium">{currentLanguage?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Extension:</span>
                                <span className="text-accent">{currentLanguage?.extension}</span>
                            </div>
                        </div>
                    </div>

                    {/* File Manager */}
                    <FileManager currentFile={currentFile} onFileSelect={handleFileSelect} onCodeUpdate={code} />
                </aside>

                {/* 2. Editor and Terminal (Flexible Column) */}
                <main className="flex-1 flex flex-col min-w-0">
                    {/* Code Editor */}
                    <div className={`code-editor-container flex-1 min-h-0 flex flex-col ${isAISidebarOpen ? 'h-editor-shrunk' : 'h-editor-default'}`}>
                        <div className="code-editor-header px-6 py-3 border-b border-border-color flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-error rounded-full shadow-lg"></div>
                                <div className="w-3 h-3 bg-warning-dot rounded-full shadow-lg"></div>
                                <div className="w-3 h-3 bg-success rounded-full shadow-lg"></div>
                            </div>
                            <span className="text-sm text-accent font-mono file-name truncate">
                                {currentFile}
                            </span>
                            <div className="ml-auto text-xs text-text-secondary font-mono hidden md:block">
                                Lines: {code.split('\n').length} | Chars: {code.length}
                            </div>
                        </div>
                        <div className="flex-1">
                            <CodeEditor
                                value={code}
                                onChange={setCode}
                            />
                        </div>
                    </div>

                    {/* Output Terminal */}
                    <div className={`terminal-container ${terminalHeightClass}`}>
                        <TerminalPanel
                            result={result}
                            isRunning={isRunning}
                            hasError={hasError}
                        />
                    </div>
                </main>

                {/* 3. AI Assistant Panel (Right Sidebar) */}
                <AIPanel 
                    messages={messages} 
                    isAILoading={isAILoading}
                    isAISidebarOpen={isAISidebarOpen}
                    setIsAISidebarOpen={setIsAISidebarOpen}
                    sendFollowUp={sendFollowUp} 
                    currentCode={code} 
                    currentLanguage={selectedLanguage}
                />
            </div>
        </div>
    );
}

export default App;