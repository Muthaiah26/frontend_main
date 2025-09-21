// App.js
import React, { useState, useEffect } from 'react';
import { Code2, Play, Terminal, FileText, Folder, Plus, FolderPlus, X, ChevronRight, ChevronDown } from 'lucide-react';
import './App.css';

// Mock data for languages
const languages = [
  { id: 'javascript', name: 'JavaScript', extension: '.js', defaultCode: 'console.log("Hello World!");' },
  { id: 'python', name: 'Python', extension: '.py', defaultCode: 'print("Hello World!")' },
  { id: 'java', name: 'Java', extension: '.java', defaultCode: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World!");\n  }\n}' },
  { id: 'cpp', name: 'C++', extension: '.cpp', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}' }
];

// Language Selector Component
const LanguageSelector = ({ languages, selectedLanguage, onLanguageChange }) => (
  <select
    value={selectedLanguage}
    onChange={(e) => onLanguageChange(e.target.value)}
    className="w-full bg-black border border-green-500 text-green-400 px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all duration-200"
  >
    {languages.map((lang) => (
      <option key={lang.id} value={lang.id} className="bg-black text-green-400">
        {lang.name}
      </option>
    ))}
  </select>
);

// Code Editor Component
const CodeEditor = ({ value, onChange }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full h-full bg-black text-green-400 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed border-none"
    placeholder="Write your code here..."
    spellCheck={false}
  />
);

// Code Runner Component - Modified to make a backend API call
const CodeRunner = ({ code, language, onResult, onRunningChange, isRunning }) => {
  const runCode = async () => {
    onRunningChange(true);
    onResult(''); // Clear previous output
    let error = false;

    try {
      // Step 1: Explicitly replace all line endings with a single newline character
      const codeToSend = code.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');
      
      const requestData = {
        language: language,
        code: codeToSend,
      };

      // Step 2: Send request to backend (proxy handles CORS)
      const response = await fetch('/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Step 3: Parse JSON response
      const resultData = await response.json();

      if (resultData.error) {
        onResult(`Error: ${resultData.error}`, true);
        error = true;
      } else {
        onResult(resultData.output, false);
      }
    } catch (err) {
      onResult(
        `Failed to connect to backend: ${err.message}. Please check if the server is running.`,
        true
      );
      error = true;
    } finally {
      onRunningChange(false);
    }
  };

  return (
    <button
      onClick={runCode}
      disabled={isRunning}
      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-black font-bold px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 disabled:scale-100"
    >
      {isRunning ? (
        <>
          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          Running...
        </>
      ) : (
        <>
          <Play className="w-4 h-4" />
          Execute Code
        </>
      )}
    </button>
  );
};


// File Manager Component
const FileManager = ({ onFileSelect }) => {
  const [files, setFiles] = useState([
    { id: 1, name: 'main.js', type: 'file', parent: null, content: 'console.log("Hello World!");' },
    { id: 2, name: 'src', type: 'folder', parent: null, expanded: false },
    { id: 3, name: 'utils.js', type: 'file', parent: 2, content: '// Utility functions\nfunction helper() {\n  return "Helper function";\n}' },
    { id: 4, name: 'components', type: 'folder', parent: null, expanded: false },
    { id: 5, name: 'App.js', type: 'file', parent: 4, content: 'import React from "react";\n\nfunction App() {\n  return <div>Hello React!</div>;\n}\n\nexport default App;' },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(1);

  const createFile = () => {
    if (newItemName.trim()) {
      const newFile = {
        id: Date.now(),
        name: newItemName.trim(),
        type: 'file',
        parent: selectedParent,
        content: '// New file\n'
      };
      setFiles([...files, newFile]);
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
      setFiles([...files, newFolder]);
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
  };

  const toggleFolder = (id) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, expanded: !file.expanded } : file
    ));
  };

  const selectFile = (file) => {
    setSelectedFile(file.id);
    if (file.type === 'file' && onFileSelect) {
      onFileSelect(file);
    }
  };

  const renderFiles = (parentId = null, depth = 0) => {
    const currentFiles = files.filter(file => file.parent === parentId);
    
    return currentFiles.map(file => (
      <div key={file.id} className={`${depth > 0 ? 'ml-4' : ''}`}>
        <div 
          className={`flex items-center justify-between py-2 px-2 text-sm rounded cursor-pointer transition-all duration-200 group ${
            selectedFile === file.id 
              ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
              : 'text-gray-300 hover:bg-gray-800 hover:text-green-400'
          }`}
          onClick={() => {
            if (file.type === 'folder') {
              toggleFolder(file.id);
            } else {
              selectFile(file);
            }
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            {file.type === 'folder' ? (
              <>
                {file.expanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <Folder className="w-4 h-4 text-green-400" />
              </>
            ) : (
              <FileText className="w-4 h-4 text-gray-400" />
            )}
            <span className="truncate font-mono">{file.name}</span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {file.type === 'folder' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParent(file.id);
                    setShowCreateFile(true);
                  }}
                  className="p-1 hover:bg-green-600 rounded text-xs"
                  title="Add File"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParent(file.id);
                    setShowCreateFolder(true);
                  }}
                  className="p-1 hover:bg-green-600 rounded text-xs"
                  title="Add Folder"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteItem(file.id);
              }}
              className="p-1 hover:bg-red-600 rounded text-xs"
              title="Delete"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {file.type === 'folder' && file.expanded && (
          <div className="ml-2 border-l border-gray-700">
            {renderFiles(file.id, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-black rounded-xl p-5 border border-green-500 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
          <Folder className="w-4 h-4" />
          File Explorer
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedParent(null);
              setShowCreateFile(!showCreateFile);
            }}
            className="p-1 hover:bg-green-600 rounded transition-colors"
            title="New File"
          >
            <Plus className="w-3 h-3 text-green-400" />
          </button>
          <button
            onClick={() => {
              setSelectedParent(null);
              setShowCreateFolder(!showCreateFolder);
            }}
            className="p-1 hover:bg-green-600 rounded transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-3 h-3 text-green-400" />
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1 mb-3">
        {renderFiles()}
      </div>

      {(showCreateFile || showCreateFolder) && (
        <div className="border-t border-green-500 pt-3">
          <div className="text-xs text-green-400 mb-2">
            Creating in: {selectedParent ? files.find(f => f.id === selectedParent)?.name || 'Root' : 'Root'}
          </div>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={showCreateFile ? "Enter file name..." : "Enter folder name..."}
            className="w-full bg-black border border-green-500 text-green-400 px-2 py-1 rounded text-xs focus:ring-1 focus:ring-green-400 focus:border-green-400"
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
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-black font-medium text-xs rounded transition-colors"
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
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Output Panel Component
const OutputPanel = ({ result, isRunning, hasError }) => (
  <div className="h-full flex flex-col bg-black border-t border-green-500">
    <div className="bg-gray-900 px-4 py-3 border-b border-green-500 flex items-center gap-2">
      <Terminal className="w-4 h-4 text-green-400" />
      <span className="text-sm font-medium text-green-400">Output Terminal</span>
      <div className="ml-auto">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-yellow-400 animate-pulse' : hasError ? 'bg-red-400' : result ? 'bg-green-400' : 'bg-gray-500'}`}></div>
      </div>
    </div>
    <div className="flex-1 p-4 font-mono text-sm overflow-auto">
      {isRunning ? (
        <div className="flex items-center gap-2 text-yellow-400">
          <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Executing code...</span>
        </div>
      ) : result ? (
        <pre className={`whitespace-pre-wrap ${hasError ? 'text-red-400' : 'text-green-400'}`}>
          {result}
        </pre>
      ) : (
        <div className="text-gray-500 italic">
          <span className="text-green-400">$</span> No output yet. Run your code to see results here.
        </div>
      )}
    </div>
  </div>
);

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [result, setResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentFile, setCurrentFile] = useState('main.js');

  // Initialize code when language changes
  useEffect(() => {
    const language = languages.find(lang => lang.id === selectedLanguage);
    if (language) {
      setCode(language.defaultCode);
      setResult('');
      setHasError(false);
    }
  }, [selectedLanguage]);

  const handleResult = (newResult, error) => {
    setResult(newResult);
    setHasError(error);
  };

  const handleFileSelect = (file) => {
    setCode(file.content || '');
    setCurrentFile(file.name);
    setResult('');
    setHasError(false);
  };

  const currentLanguage = languages.find(lang => lang.id === selectedLanguage);

  return (
    <div className="h-screen bg-black text-green-400 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 border-b border-green-500 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-green-400 font-mono tracking-wider header-flicker">
              CIT COMPILER
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Code2 className="w-4 h-4" />
              <span className="font-mono">Universal Code Executor</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-900 border-r border-green-500 p-6 flex flex-col gap-6 shadow-xl overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-green-400 mb-3 font-mono">
              Select Language
            </label>
            <LanguageSelector
              languages={languages}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-3 font-mono">
              Execute
            </label>
            <CodeRunner
              code={code}
              language={selectedLanguage}
              onResult={handleResult}
              onRunningChange={setIsRunning}
              isRunning={isRunning}
            />
          </div>

          <div className="bg-black rounded-xl p-5 border border-green-500 shadow-lg">
            <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2 font-mono">
              <Code2 className="w-4 h-4" />
              Language Details
            </h3>
            <div className="text-sm text-green-400 space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="font-medium">{currentLanguage?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Extension:</span>
                <span className="text-green-400">{currentLanguage?.extension}</span>
              </div>
            </div>
          </div>

          <FileManager onFileSelect={handleFileSelect} />
        </aside>

        {/* Editor and Output */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Code Editor */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="bg-gray-900 px-6 py-3 border-b border-green-500 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
              </div>
              <span className="text-sm text-green-400 font-mono">
                {currentFile}
              </span>
              <div className="ml-auto text-xs text-gray-400 font-mono">
                Lines: {code.split('\n').length} | Characters: {code.length}
              </div>
            </div>
            <div className="flex-1">
              <CodeEditor
                value={code}
                onChange={setCode}
              />
            </div>
          </div>

          {/* Output Terminal - Fixed to bottom */}
          <div className="h-64 shadow-2xl">
            <OutputPanel
              result={result}
              isRunning={isRunning}
              hasError={hasError}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;