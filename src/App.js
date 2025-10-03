import React, { useState, useEffect, useCallback } from 'react';
import { Code2, Play, Terminal, FileText, Folder, Plus, FolderPlus, X, ChevronRight, ChevronDown, Sun, Moon } from 'lucide-react';
// NOTE: Since this is a single file component, we assume App.css is available globally.
import './App.css'; 

// Mock data for languages
const languages = [
  { id: 'python', name: 'Python', extension: '.py', defaultCode: 'print("Hello World!")' },
   { id: 'javascript', name: 'JavaScript', extension: '.js', defaultCode: 'console.log("Hello World!");' },
  { id: 'java', name: 'Java', extension: '.java', defaultCode: 'public class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello World!");\n\t}\n}' },
  { id: 'cpp', name: 'C++', extension: '.cpp', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n\tcout << "Hello World!" << endl;\n\treturn 0;\n}' }
];

// Theme Toggle Component
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

// Language Selector Component
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

// Code Editor Component
const CodeEditor = ({ value, onChange }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="code-editor w-full h-full p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed border-none"
    placeholder="Write your code here..."
    spellCheck={false}
  />
);

// Code Runner Component
const CodeRunner = ({ code, language, onResult, onRunningChange, isRunning }) => {
  const runCode = async () => {
    onRunningChange(true);
    onResult('', false); // Clear previous output

    try {
      // CRITICAL UPDATE: Pass the code directly. The Java backend now handles de-escaping.
      const codeToSend = code; 

      const requestData = {
        language: language,
        code: codeToSend,
      };
      
      
      const apiUrl = `/run`; // Use a proxy /run endpoint

      // Send request to backend
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Parse JSON response
      const resultData = await response.json();

      // Check if the output contains known compilation/execution error messages from the backend
      const isBackendError = resultData.error || (resultData.output && (resultData.output.includes("Error:") || resultData.output.includes("Compilation Error:")));

      if (isBackendError) {
        onResult(resultData.output || resultData.error, true);
      } else {
        onResult(resultData.output, false);
      }
    } catch (err) {
      onResult(
        `Failed to connect to backend: ${err.message}. Please ensure the execution environment is running.`,
        true
      );
    } finally {
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


// File Manager Component (simplified state handling for this example)
const FileManager = ({ currentFile, onFileSelect, onCodeUpdate }) => {
  const [files, setFiles] = useState([
    { id: 1, name: 'main.js', type: 'file', parent: null, content: 'console.log("Hello World!");' },
    { id: 2, name: 'src', type: 'folder', parent: null, expanded: false },
    { id: 3, name: 'utils.js', type: 'file', parent: 2, content: '// Utility functions\nfunction helper() {\n\treturn "Helper function";\n}' },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  
  // Update content of the currently selected file when the user types in the editor
  useEffect(() => {
    // This is a mock function, the real implementation would be more complex
    // to track changes from the parent App component's 'code' state.
    // Since we can't pass the setter back up easily in this structure,
    // we assume the parent handles the `onCodeUpdate` triggered logic.
  }, [onCodeUpdate]);


  // Helper to find file object by its name/path
  const getFileByName = useCallback((fileName) => {
      return files.find(f => f.name === fileName && f.type === 'file');
  }, [files]);
  
  // Initial selection
  useEffect(() => {
    const defaultFile = getFileByName('main.js');
    if (defaultFile && onFileSelect) {
        onFileSelect(defaultFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const createFile = () => {
    if (newItemName.trim()) {
      const newFile = {
        id: Date.now(),
        name: newItemName.trim(),
        type: 'file',
        parent: selectedParent,
        content: '// New file\n'
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
    if (getFileByName(currentFile)?.id === id) {
        const rootFile = getFileByName('main.js') || files.find(f => f.type === 'file');
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

// Output Panel Component
const OutputPanel = ({ result, isRunning, hasError }) => (
  <div className="output-panel h-full flex flex-col shadow-2xl">
    <div className="output-header px-4 py-3 flex items-center gap-2 border-b border-border-color">
      <Terminal className="w-4 h-4 text-accent" />
      <span className="text-sm font-medium text-accent">Terminal Output</span>
      <div className="ml-auto flex items-center gap-2">
        <span className={`text-xs font-mono ${isRunning ? 'text-warning' : hasError ? 'text-error' : result ? 'text-success' : 'text-text-secondary'}`}>
            {isRunning ? 'Running' : hasError ? 'Error' : result ? 'Complete' : 'Idle'}
        </span>
        <div className={`status-indicator w-2 h-2 rounded-full ${isRunning ? 'animate-pulse bg-warning' : hasError ? 'bg-error' : result ? 'bg-success' : 'bg-text-secondary'}`}></div>
      </div>
    </div>
    <div className="output-content flex-1 p-4 font-mono text-sm overflow-auto">
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

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [code, setCode] = useState(languages.find(l => l.id === 'java').defaultCode);
  const [result, setResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentFile, setCurrentFile] = useState('main.js');
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  // Initialize code when language changes
  useEffect(() => {
    const language = languages.find(lang => lang.id === selectedLanguage);
    if (language) {
      // Only reset code if the current file is the default one or empty
      if (currentFile === 'main.js' || code.trim() === '') {
          setCode(language.defaultCode);
      }
      setResult('');
      setHasError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  const handleResult = (newResult, error) => {
    setResult(newResult);
    setHasError(error);
  };

  const handleFileSelect = (file) => {
    // In a real app, you'd save the current code state before switching
    // and load the new file's content. Here we just set the new content.
    setCode(file.content || ''); 
    setCurrentFile(file.name);
    // Auto-detect language based on extension
    setSelectedLanguage(languages.find(l => file.name.endsWith(l.extension))?.id || selectedLanguage);
    setResult('');
    setHasError(false);
  };

  const currentLanguage = languages.find(lang => lang.id === selectedLanguage);

  return (
    <div className={`app-container ${theme} h-screen flex flex-col overflow-hidden`}>
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

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
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

          {/* Code Runner */}
          <div className='card-container'>
            <label className="block text-sm font-medium text-accent mb-3 font-mono">
              Execute Code
            </label>
            <CodeRunner
              code={code}
              language={selectedLanguage}
              onResult={handleResult}
              onRunningChange={setIsRunning}
              isRunning={isRunning}
            />
          </div>

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
          <FileManager currentFile={currentFile} onFileSelect={handleFileSelect} onCodeUpdate={setCode} />
        </aside>

        {/* Editor and Output */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Code Editor */}
          <div className="code-editor-container flex-1 min-h-0 flex flex-col">
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

          {/* Output Terminal - Fixed to bottom */}
          <div className="h-64 terminal-container">
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
